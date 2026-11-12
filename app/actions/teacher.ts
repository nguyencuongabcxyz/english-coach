"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one, sql } from "@/lib/db";
import { getSession, saveReview } from "@/lib/data";
import { SKILLS, type Skill } from "@/lib/skills";

async function ownStudent(teacherClass: string | null, studentId: string) {
  return one<{ id: string }>(`SELECT id FROM users WHERE id = $1 AND class_id = $2 AND role = 'student'`, [
    studentId,
    teacherClass,
  ]);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function code6() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** New activation code: used for first activation and for password resets. */
export async function issueActivationCode(studentId: string) {
  const teacher = await requireUser("teacher");
  if (!(await ownStudent(teacher.class_id, studentId))) return;
  await sql(`UPDATE users SET activation_code = $2, reset_requested_at = NULL WHERE id = $1`, [studentId, code6()]);
  revalidatePath("/teacher");
}

export async function submitReview(sessionId: string, form: FormData) {
  const teacher = await requireUser("teacher");
  const s = await getSession(sessionId);
  if (!s || !(await ownStudent(teacher.class_id, s.student_id))) redirect("/teacher/review");
  const scores = {} as Record<Skill, number>;
  for (const k of SKILLS) {
    const v = Number(String(form.get(k) ?? "").replace(",", "."));
    scores[k] = Number.isFinite(v) ? Math.max(0, Math.min(10, Math.round(v * 2) / 2)) : (s.scores?.[k] ?? 0);
  }
  await saveReview(s.id, scores, String(form.get("comment") ?? "").trim().slice(0, 1000));
  const next = await one<{ id: string }>(
    `SELECT p.id FROM practice_sessions p JOIN users u ON u.id = p.student_id
     WHERE u.class_id = $1 AND p.status = 'completed' AND p.teacher_status = 'pending'
     ORDER BY p.completed_at ASC LIMIT 1`,
    [teacher.class_id],
  );
  revalidatePath("/teacher");
  redirect(next ? `/teacher/review/${next.id}?done=1` : "/teacher/review?done=1");
}

export type AddStudentState =
  | { error?: string; fieldErrors?: Partial<Record<"name" | "code" | "activation", string>>; added?: { name: string; code: string; activation: string } }
  | undefined;

/** Teacher creates a student account with an activation code they choose (or a generated one). */
export async function addStudent(_: AddStudentState, form: FormData): Promise<AddStudentState> {
  const teacher = await requireUser("teacher");
  if (!teacher.class_id) return { error: "Tài khoản giáo viên chưa được gán lớp." };
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
  const code = String(form.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const activation = String(form.get("activation") ?? "").trim().toUpperCase().replace(/\s+/g, "") || code6();

  const fieldErrors: NonNullable<AddStudentState>["fieldErrors"] = {};
  if (name.length < 2 || name.length > 80) fieldErrors.name = "Nhập họ và tên (2–80 ký tự).";
  if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/.test(code)) fieldErrors.code = "Mã học sinh gồm chữ, số và dấu gạch ngang (3–30 ký tự).";
  if (!/^[A-Z0-9]{6}$/.test(activation)) fieldErrors.activation = "Mã kích hoạt gồm đúng 6 chữ hoặc số.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const exists = await one<{ id: string }>(`SELECT id FROM users WHERE upper(login) = $1`, [code]);
  if (exists) return { fieldErrors: { code: `Mã học sinh ${code} đã tồn tại.` } };

  await sql(
    `INSERT INTO users (id, role, login, name, class_id, activation_code, activated)
     VALUES ($1, 'student', $2, $3, $4, $5, FALSE)`,
    [crypto.randomUUID(), code, name, teacher.class_id, activation],
  );
  revalidatePath("/teacher");
  return { added: { name, code, activation } };
}

