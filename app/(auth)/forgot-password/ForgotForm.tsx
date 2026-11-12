"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset } from "@/app/actions/auth";
import { Icon, ICON } from "@/components/icons";
import { btn } from "@/components/ui";
import { inputCls } from "../login/LoginForm";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Link href="/login" className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <Icon d={ICON.chevronLeft} size={14} /> Quay lại đăng nhập
      </Link>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-lilac">
        <Icon d={ICON.lock} size={20} stroke="#2E2F5C" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[26px] font-bold tracking-[-0.4px]">Quên mật khẩu?</h1>
        <p className="m-0 text-sm leading-normal text-muted">
          Nhập mã học sinh hoặc email trường. Giáo viên sẽ nhận được yêu cầu và cấp mã để bạn đặt lại mật khẩu.
        </p>
      </div>
      {state?.ok ? (
        <p role="status" className="m-0 rounded-xl bg-good-bg px-3.5 py-3 text-[13px] leading-normal font-medium text-good">
          {state.ok}
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Mã học sinh hoặc email</span>
            <input name="login" required className={inputCls} placeholder="HS-11A2-014" />
          </label>
          {state?.error && (
            <p role="alert" className="m-0 rounded-xl bg-bad-bg px-3.5 py-2.5 text-[13px] font-medium text-bad">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className={`${btn.dark} min-h-12 w-full`}>
            {pending ? "Đang gửi…" : "Gửi yêu cầu đặt lại"}
          </button>
        </>
      )}
      <p className="m-0 text-xs leading-normal text-muted">
        Tài khoản chưa có email? Giáo viên có thể đặt lại mật khẩu cho bạn trong trang Tổng quan lớp.
      </p>
    </form>
  );
}
