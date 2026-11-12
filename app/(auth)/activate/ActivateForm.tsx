"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { activate } from "@/app/actions/auth";
import { Icon, ICON } from "@/components/icons";
import { btn } from "@/components/ui";
import { inputCls } from "../login/LoginForm";

const STEPS = ["Xác minh", "Mật khẩu", "Nói thử"];

export function ActivateForm() {
  const [state, action, pending] = useActionState(activate, undefined);
  const [fields, setFields] = useState({ code: "", activation: "" });
  const verified = state?.ok === "verified";
  const account = state?.account;
  const step = verified ? 1 : 0;

  return (
    <form action={action} className="flex flex-col gap-5">
      <Link href="/login" className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <Icon d={ICON.chevronLeft} size={14} /> Quay lại đăng nhập
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[26px] font-bold tracking-[-0.4px]">Kích hoạt tài khoản</h1>
        <p className="m-0 text-sm text-muted">
          Tài khoản do nhà trường tạo sẵn. Nhập mã kích hoạt giáo viên cung cấp để đặt mật khẩu.
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-canvas"}`} />
            <span className={`text-[11px] ${i === step ? "font-semibold text-ink" : "text-muted"}`}>
              {i + 1} · {s}
            </span>
          </li>
        ))}
      </ol>

      <input type="hidden" name="step" value={verified ? "password" : "verify"} />
      {/* Keep verified values when moving to step 2 */}
      {verified && (
        <>
          <input type="hidden" name="code" value={fields.code} />
          <input type="hidden" name="activation" value={fields.activation} />
        </>
      )}

      {!verified ? (
        <div key="verify" className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Mã học sinh / Email giáo viên</span>
            <input
              name="code"
              required
              autoComplete="username"
              className={inputCls}
              placeholder="VD: HS-11A2-014"
              value={fields.code}
              onChange={(e) => setFields({ ...fields, code: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Mã kích hoạt</span>
            <input
              name="activation"
              required
              maxLength={6}
              className={`${inputCls} font-mono tracking-[0.4em] uppercase`}
              placeholder="Mã 6 ký tự"
              value={fields.activation}
              onChange={(e) => setFields({ ...fields, activation: e.target.value })}
            />
            <span className="text-xs text-muted">
              Chưa có mã? Học sinh hỏi giáo viên Tiếng Anh; giáo viên hỏi quản trị viên của trường.
            </span>
          </label>
        </div>
      ) : (
        <div key="password" className="flex flex-col gap-5">
          {account && (
            <div className="flex flex-col gap-3 rounded-2xl bg-good-bg p-4">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-good">
                <Icon d={ICON.check} size={15} width={2.6} /> Đã xác minh. Kiểm tra lại thông tin của bạn:
              </span>
              <dl className="m-0 flex flex-col rounded-xl bg-white px-3.5 py-1 text-[13px]">
                <div className="flex justify-between gap-4 border-b border-shell py-2">
                  <dt className="text-muted">Họ và tên</dt>
                  <dd className="m-0 text-right font-bold">{account.name}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-shell py-2">
                  <dt className="text-muted">{account.role === "teacher" ? "Email" : "Mã học sinh"}</dt>
                  <dd className="m-0 text-right font-bold">{fields.code.trim()}</dd>
                </div>
                <div className={`flex justify-between gap-4 py-2 ${account.teacherName ? "border-b border-shell" : ""}`}>
                  <dt className="text-muted">{account.role === "teacher" ? "Lớp phụ trách" : "Lớp"}</dt>
                  <dd className="m-0 text-right font-bold">{account.className ?? "–"}</dd>
                </div>
                {account.teacherName && (
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-muted">Giáo viên</dt>
                    <dd className="m-0 text-right font-bold">{account.teacherName}</dd>
                  </div>
                )}
              </dl>
              <span className="text-xs text-good">
                Thông tin sai? Đừng tiếp tục, hãy báo {account.role === "teacher" ? "quản trị viên" : "giáo viên"} của bạn.
              </span>
            </div>
          )}
          {account?.role === "student" && (
            <div className="flex gap-2.5 rounded-2xl bg-sand px-4 py-3 text-[13px] leading-normal text-sand-ink">
              <Icon d={ICON.mic} size={16} className="mt-0.5 shrink-0" />
              Sau khi kích hoạt, bạn sẽ nói thử 30 giây để AI gợi ý bài luyện đầu tiên phù hợp với bạn.
            </div>
          )}
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Mật khẩu mới</span>
            <input key="pw" name="password" type="password" required minLength={6} autoComplete="new-password" className={inputCls} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Nhập lại mật khẩu</span>
            <input key="pw2" name="confirm" type="password" required minLength={6} autoComplete="new-password" className={inputCls} />
          </label>
        </div>
      )}

      {state?.error && (
        <p role="alert" className="m-0 rounded-xl bg-bad-bg px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btn.dark} min-h-12 w-full`}>
        {pending ? "Đang xử lý…" : verified ? "Kích hoạt và bắt đầu" : "Tiếp tục"}
      </button>
    </form>
  );
}
