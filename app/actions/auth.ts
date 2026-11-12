"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { one, sql } from "@/lib/db";
import type { UserRow } from "@/lib/types";

export type FormState = { error?: string; ok?: string } | undefined;

const norm = (s: FormDataEntryValue | null) => String(s ?? "").trim();

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const role = norm(form.get("role")) === "teacher" ? "teacher" : "student";
  const loginId = norm(form.get("login"));
  const password = norm(form.get("password"));
  if (!loginId || !password) return { error: "Vui lòng nhập đầy đủ thông tin đăng nhập." };
  const user = await one<UserRow>(`SELECT * FROM users WHERE lower(login) = lower($1) AND role = $2`, [loginId, role]);
  if (!user) {
    return { error: role === "teacher" ? "Không tìm thấy tài khoản giáo viên." : "Không tìm thấy mã học sinh." };
  }
  if (!user.activated || !user.password_hash) {
    return { error: "Tài khoản chưa được kích hoạt. Chọn “Kích hoạt tài khoản” bên dưới." };
  }
  if (!(await bcrypt.compare(password, user.password_hash))) return { error: "Mật khẩu không đúng." };
  await sql(`UPDATE users SET last_active_at = now() WHERE id = $1`, [user.id]);
  await createSession(user);
  redirect(role === "teacher" ? "/teacher" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function activate(_: FormState, form: FormData): Promise<FormState> {
  const step = norm(form.get("step"));
  const code = norm(form.get("code"));
  const activation = norm(form.get("activation")).toUpperCase().replace(/\s+/g, "");
  if (!code || !activation) return { error: "Vui lòng nhập mã học sinh (hoặc email giáo viên) và mã kích hoạt." };
  // Students activate with their student code, teachers with their school email.
  const user = await one<UserRow>(`SELECT * FROM users WHERE upper(login) = upper($1)`, [code]);
  if (!user || !user.activation_code || user.activation_code.toUpperCase() !== activation) {
    return {
      error: code.includes("@")
        ? "Email hoặc mã kích hoạt không đúng. Hãy hỏi quản trị viên của trường."
        : "Mã học sinh hoặc mã kích hoạt không đúng. Hãy hỏi giáo viên Tiếng Anh của bạn.",
    };
  }
  if (step === "verify") return { ok: "verified" };

  const password = norm(form.get("password"));
  const confirm = norm(form.get("confirm"));
  if (password.length < 6) return { error: "Mật khẩu cần ít nhất 6 ký tự.", ok: "verified" };
  if (password !== confirm) return { error: "Mật khẩu nhập lại không khớp.", ok: "verified" };
  const hash = await bcrypt.hash(password, 10);
  await sql(
    `UPDATE users SET password_hash = $2, activated = TRUE, activation_code = NULL, reset_requested_at = NULL,
       last_active_at = now() WHERE id = $1`,
    [user.id, hash],
  );
  await createSession(user);
  redirect(user.role === "teacher" ? "/teacher" : "/dashboard?welcome=1");
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const id = norm(form.get("login"));
  if (!id) return { error: "Vui lòng nhập mã học sinh hoặc email." };
  // Always answer the same way so the form can't be used to probe accounts.
  await sql(`UPDATE users SET reset_requested_at = now() WHERE lower(login) = lower($1)`, [id]);
  return {
    ok: "Đã gửi yêu cầu. Giáo viên sẽ cấp mã kích hoạt mới để bạn đặt lại mật khẩu trong mục Kích hoạt tài khoản.",
  };
}
