"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login } from "@/app/actions/auth";
import { Icon, ICON } from "@/components/icons";
import { btn } from "@/components/ui";

export const inputCls =
  "min-h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[15px] outline-none placeholder:text-[#A9A7B3] focus:border-ink";

export function LoginForm() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [state, action, pending] = useActionState(login, undefined);
  const isStudent = role === "student";

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 text-[26px] font-bold tracking-[-0.4px]">Đăng nhập</h2>
        <p className="m-0 text-sm text-muted">Chọn vai trò, sau đó đăng nhập bằng tài khoản do trường cấp.</p>
      </div>

      <div role="radiogroup" aria-label="Vai trò" className="grid grid-cols-2 rounded-full bg-chip p-1">
        {(["student", "teacher"] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setRole(r)}
            className={`min-h-10 cursor-pointer rounded-full text-[13px] font-semibold transition-colors ${
              role === r ? "bg-ink text-white" : "text-ink"
            }`}
          >
            {r === "student" ? "Học sinh" : "Giáo viên"}
          </button>
        ))}
      </div>
      <input type="hidden" name="role" value={role} />

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">{isStudent ? "Mã học sinh" : "Email trường"}</span>
        <input
          key={role}
          name="login"
          required
          autoComplete="username"
          placeholder={isStudent ? "VD: HS-11A2-014" : "VD: ten.ho@truong.edu.vn"}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between text-[13px] font-semibold">
          Mật khẩu
          <Link href="/forgot-password" className="text-xs font-semibold text-link">
            Quên mật khẩu?
          </Link>
        </span>
        <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className={inputCls} />
      </label>

      <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted">
        <input type="checkbox" name="remember" defaultChecked className="size-4 accent-ink" />
        Ghi nhớ đăng nhập trên thiết bị này
      </label>

      {state?.error && (
        <p role="alert" className="m-0 rounded-xl bg-bad-bg px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btn.dark} min-h-12 w-full`}>
        {pending ? "Đang đăng nhập…" : `Đăng nhập với vai trò ${isStudent ? "học sinh" : "giáo viên"}`}
      </button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        hoặc
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        disabled
        title="Sắp có: đăng nhập một lần bằng tài khoản trường"
        className={`${btn.light} min-h-12 w-full`}
      >
        <Icon d={ICON.school} size={16} /> Đăng nhập bằng tài khoản trường
        <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] text-muted">Sắp có</span>
      </button>

      <p className="m-0 text-center text-[13px] text-muted">
        Lần đầu sử dụng?{" "}
        <Link href="/activate" className="font-semibold text-ink underline-offset-2 hover:underline">
          Kích hoạt tài khoản
        </Link>
      </p>
    </form>
  );
}
