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
  const [fields, setFields] = useState({ name: "", code: "", grade: "11A2", activation: "" });
  const verified = state?.ok === "verified";
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
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-ink" : "bg-canvas"}`} />
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
            <span className="text-[13px] font-semibold">Họ và tên</span>
            <input
              className={inputCls}
              placeholder="Nguyễn Minh Anh"
              value={fields.name}
              onChange={(e) => setFields({ ...fields, name: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">Mã học sinh</span>
              <input
                name="code"
                required
                className={inputCls}
                placeholder="HS-11A2-014"
                value={fields.code}
                onChange={(e) => setFields({ ...fields, code: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">Khối / Lớp</span>
              <select
                className={inputCls}
                value={fields.grade}
                onChange={(e) => setFields({ ...fields, grade: e.target.value })}
              >
                {["10A1", "10A2", "11A1", "11A2", "12A1", "12A2"].map((c) => (
                  <option key={c} value={c}>
                    Khối {c.slice(0, 2)} · {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
            <span className="text-xs text-muted">Chưa có mã? Hãy hỏi giáo viên Tiếng Anh của bạn.</span>
          </label>
          <div className="flex gap-2.5 rounded-2xl bg-sand px-4 py-3 text-[13px] leading-normal text-sand-ink">
            <Icon d={ICON.mic} size={16} className="mt-0.5 shrink-0" />
            Sau bước này, bạn sẽ cho phép dùng micro và nói thử 30 giây để AI gợi ý bài luyện đầu tiên phù hợp với bạn.
          </div>
        </div>
      ) : (
        <div key="password" className="flex flex-col gap-5">
          <p className="m-0 rounded-xl bg-good-bg px-3.5 py-2.5 text-[13px] font-medium text-good">
            Đã xác minh mã học sinh {fields.code.toUpperCase()}. Hãy đặt mật khẩu của bạn.
          </p>
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
