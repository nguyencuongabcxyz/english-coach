"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { one, sql } from "@/lib/db";
import { giveDefaultTopics } from "@/lib/topics-db";

export type AddTeacherState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<"name" | "email" | "className" | "activation", string>>;
      added?: { name: string; email: string; className: string; activation: string; isAdmin: boolean };
    }
  | undefined;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code6 = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join("");

/** Admin creates a teacher account + their class; the teacher gets their own copy of the default lessons. */
export async function addTeacher(_: AddTeacherState, form: FormData): Promise<AddTeacherState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const className = String(form.get("className") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const grade = Number(form.get("grade"));
  const activation = String(form.get("activation") ?? "").trim().toUpperCase().replace(/\s+/g, "") || code6();
  const isAdmin = form.get("isAdmin") === "on";

  const fieldErrors: NonNullable<AddTeacherState>["fieldErrors"] = {};
  if (name.length < 2 || name.length > 80) fieldErrors.name = "Nhập họ và tên (2–80 ký tự).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) fieldErrors.email = "Email không hợp lệ.";
  if (!/^[A-Z0-9]{2,10}$/.test(className)) fieldErrors.className = "Tên lớp gồm 2–10 chữ hoặc số, VD: 10A1.";
  if (!/^[A-Z0-9]{6}$/.test(activation)) fieldErrors.activation = "Mã kích hoạt gồm đúng 6 chữ hoặc số.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  if (await one(`SELECT 1 FROM users WHERE lower(login) = $1`, [email])) {
    return { fieldErrors: { email: "Email này đã có tài khoản." } };
  }

  const teacherId = `t-${crypto.randomUUID().slice(0, 8)}`;
  const classId = `c-${crypto.randomUUID().slice(0, 8)}`;
  await sql(`INSERT INTO classes (id, name, grade, teacher_id) VALUES ($1,$2,$3,$4)`, [
    classId,
    className,
    [10, 11, 12].includes(grade) ? grade : Number(className.match(/^\d+/)?.[0] ?? 10),
    teacherId,
  ]);
  await sql(
    `INSERT INTO users (id, role, login, name, class_id, activation_code, activated, is_admin)
     VALUES ($1, 'teacher', $2, $3, $4, $5, FALSE, $6)`,
    [teacherId, email, name, classId, activation, isAdmin],
  );
  await giveDefaultTopics(teacherId);
  revalidatePath("/teacher/teachers");
  return { added: { name, email, className, activation, isAdmin } };
}

/** New activation code for a teacher (first activation or forgotten password). */
export async function reissueTeacherCode(teacherId: string) {
  await requireAdmin();
  await sql(
    `UPDATE users SET activation_code = $2, reset_requested_at = NULL WHERE id = $1 AND role = 'teacher'`,
    [teacherId, code6()],
  );
  revalidatePath("/teacher/teachers");
}
