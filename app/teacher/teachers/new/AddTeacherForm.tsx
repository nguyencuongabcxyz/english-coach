"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addTeacher } from "@/app/actions/admin";
import { Icon, ICON } from "@/components/icons";
import { btn } from "@/components/ui";

const inputCls =
  "min-h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[15px] outline-none placeholder:text-[#A9A7B3] focus:border-ink aria-[invalid=true]:border-bad";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join("");

export function AddTeacherForm() {
  const [round, setRound] = useState(0);
  return <Inner key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function Inner({ onAgain }: { onAgain: () => void }) {
  const [state, action, pending] = useActionState(addTeacher, undefined);
  const [f, setF] = useState({ name: "", email: "", className: "", grade: "10", activation: "", isAdmin: false });
  const fe = state?.fieldErrors ?? {};

  if (state?.added) {
    const a = state.added;
    return (
      <div className="flex max-w-[560px] flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-[22px] bg-mint p-5 sm:p-6">
          <span className="flex items-center gap-2 text-[15px] font-bold text-good">
            <Icon d={ICON.check} size={18} width={2.6} /> Đã tạo tài khoản cho {a.name}
          </span>
          <dl className="m-0 flex flex-col rounded-2xl bg-white px-4 py-1.5">
            <Row k="Họ và tên" v={a.name} />
            <Row k="Email đăng nhập" v={a.email} />
            <Row k="Lớp phụ trách" v={a.className} />
            <Row k="Quyền" v={a.isAdmin ? "Quản trị viên" : "Giáo viên"} />
            <Row k="Mã kích hoạt" v={a.activation} mono last />
          </dl>
          <p className="m-0 text-[13px] leading-normal text-mint-ink">
            Gửi email và mã kích hoạt cho giáo viên. Họ vào trang <strong>Kích hoạt tài khoản</strong> để tự đặt mật khẩu,
            rồi có thể thêm học sinh và chỉnh bộ bài học riêng của mình.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button className={btn.dark} onClick={onAgain}>
            <Icon d={ICON.plus} size={16} width={2} /> Thêm giáo viên khác
          </button>
          <Link href="/teacher/teachers" className={btn.light}>
            Về danh sách giáo viên
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex max-w-[560px] flex-col gap-5 rounded-[22px] border border-line p-5 sm:p-6">
      <Field label="Họ và tên" error={fe.name}>
        <input
          name="name"
          required
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Nguyễn Văn Bình"
          autoComplete="off"
          aria-invalid={!!fe.name}
          className={inputCls}
        />
      </Field>
      <Field label="Email trường" error={fe.email} hint="Giáo viên dùng email này để đăng nhập.">
        <input
          name="email"
          type="email"
          required
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          placeholder="ten.ho@truong.edu.vn"
          autoComplete="off"
          aria-invalid={!!fe.email}
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lớp phụ trách" error={fe.className}>
          <input
            name="className"
            required
            value={f.className}
            onChange={(e) => setF({ ...f, className: e.target.value.toUpperCase() })}
            placeholder="VD: 10A1"
            autoComplete="off"
            aria-invalid={!!fe.className}
            className={`${inputCls} uppercase`}
          />
        </Field>
        <Field label="Khối">
          <select name="grade" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} className={inputCls}>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
        </Field>
      </div>
      <Field label="Mã kích hoạt" error={fe.activation} hint="6 chữ hoặc số. Để trống, hệ thống sẽ tự tạo mã.">
        <div className="flex gap-2">
          <input
            name="activation"
            maxLength={6}
            value={f.activation}
            onChange={(e) => setF({ ...f, activation: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
            placeholder="VD: GV2026"
            autoComplete="off"
            aria-invalid={!!fe.activation}
            className={`${inputCls} font-mono tracking-[0.3em] uppercase`}
          />
          <button type="button" onClick={() => setF({ ...f, activation: randomCode() })} className={`${btn.light} shrink-0 px-4`}>
            <Icon d={ICON.refresh} size={16} /> Tạo ngẫu nhiên
          </button>
        </div>
      </Field>
      <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
        <input
          type="checkbox"
          name="isAdmin"
          checked={f.isAdmin}
          onChange={(e) => setF({ ...f, isAdmin: e.target.checked })}
          className="mt-0.5 size-4 accent-ink"
        />
        <span>
          <strong>Quyền quản trị</strong>
          <span className="block text-muted">Cho phép giáo viên này thêm giáo viên khác.</span>
        </span>
      </label>
      {state?.error && (
        <p role="alert" className="m-0 rounded-xl bg-bad-bg px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={pending} className={btn.dark}>
          {pending ? "Đang tạo…" : "Tạo tài khoản giáo viên"}
        </button>
        <Link href="/teacher/teachers" className={btn.light}>
          Huỷ
        </Link>
      </div>
    </form>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-bad">{error}</span> : hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Row({ k, v, mono, last }: { k: string; v: string; mono?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 text-[13px] ${last ? "" : "border-b border-shell"}`}>
      <dt className="text-muted">{k}</dt>
      <dd className={`m-0 text-right font-bold ${mono ? "font-mono text-lg tracking-[0.25em]" : ""}`}>{v}</dd>
    </div>
  );
}
