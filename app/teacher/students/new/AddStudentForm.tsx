"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { addStudent } from "@/app/actions/teacher";
import { Icon, ICON } from "@/components/icons";
import { btn } from "@/components/ui";

const inputCls =
  "min-h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[15px] outline-none placeholder:text-[#A9A7B3] focus:border-brand aria-[invalid=true]:border-bad";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join("");

/** "HS-11A2-023" → "HS-11A2-024" (keeps zero padding). */
function nextCode(code: string) {
  const m = code.match(/^(.*?)(\d+)$/);
  return m ? m[1] + String(Number(m[2]) + 1).padStart(m[2].length, "0") : "";
}

export function AddStudentForm({ suggestedCode, className }: { suggestedCode: string; className: string }) {
  const [round, setRound] = useState({ key: 0, code: suggestedCode });
  return (
    <Inner
      key={round.key}
      suggestedCode={round.code}
      className={className}
      onAgain={(added) => setRound((r) => ({ key: r.key + 1, code: nextCode(added) }))}
    />
  );
}

function Inner({
  suggestedCode,
  className,
  onAgain,
}: {
  suggestedCode: string;
  className: string;
  onAgain: (addedCode: string) => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addStudent, undefined);
  const [name, setName] = useState("");
  const [code, setCode] = useState(suggestedCode);
  const [activation, setActivation] = useState("");
  const fe = state?.fieldErrors ?? {};

  if (state?.added) {
    const a = state.added;
    return (
      <div className="flex max-w-[560px] flex-col gap-5">
        <div className="flex flex-col gap-4 overflow-hidden rounded-[22px] bg-mint p-5 sm:p-6">
          <span className="flex items-center gap-2 text-[15px] font-bold text-good">
            <Icon d={ICON.check} size={18} width={2.6} /> Đã tạo tài khoản cho {a.name}
          </span>
          <dl className="m-0 flex flex-col rounded-2xl bg-white px-4 py-1.5">
            <Row k="Họ và tên" v={a.name} />
            <Row k="Mã học sinh" v={a.code} mono />
            <Row k="Lớp" v={className} />
            <Row k="Mã kích hoạt" v={a.activation} mono big last />
          </dl>
          <p className="m-0 text-[13px] leading-normal text-mint-ink">
            Gửi cho học sinh mã học sinh và mã kích hoạt. Học sinh vào trang <strong>Kích hoạt tài khoản</strong> để tự đặt
            mật khẩu. Mã kích hoạt cũng hiển thị trong danh sách học sinh cho đến khi học sinh kích hoạt.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            className={btn.dark}
            onClick={() => {
              router.refresh();
              onAgain(a.code);
            }}
          >
            <Icon d={ICON.plus} size={16} width={2} /> Thêm học sinh khác
          </button>
          <Link href="/teacher" className={btn.light}>
            Về Tổng quan lớp
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nguyễn Văn An"
          autoComplete="off"
          aria-invalid={!!fe.name}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Mã học sinh" error={fe.code} hint="Học sinh dùng mã này để đăng nhập.">
          <input
            name="code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            aria-invalid={!!fe.code}
            className={`${inputCls} font-mono uppercase`}
          />
        </Field>
        <Field label="Lớp">
          <input value={className} readOnly tabIndex={-1} className={`${inputCls} bg-soft text-muted`} />
        </Field>
      </div>

      <Field
        label="Mã kích hoạt"
        error={fe.activation}
        hint="6 chữ hoặc số. Để trống, hệ thống sẽ tự tạo mã."
      >
        <div className="flex gap-2">
          <input
            name="activation"
            maxLength={6}
            value={activation}
            onChange={(e) => setActivation(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="VD: AB12CD"
            autoComplete="off"
            aria-invalid={!!fe.activation}
            className={`${inputCls} font-mono tracking-[0.3em] uppercase`}
          />
          <button type="button" onClick={() => setActivation(randomCode())} className={`${btn.light} shrink-0 px-4`}>
            <Icon d={ICON.refresh} size={16} /> Tạo ngẫu nhiên
          </button>
        </div>
      </Field>

      {state?.error && (
        <p role="alert" className="m-0 rounded-xl bg-bad-bg px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={pending} className={btn.dark}>
          {pending ? "Đang tạo…" : "Tạo tài khoản"}
        </button>
        <Link href="/teacher" className={btn.light}>
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
      {error ? (
        <span className="text-xs font-medium text-bad">{error}</span>
      ) : (
        hint && <span className="text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

function Row({ k, v, mono, big, last }: { k: string; v: string; mono?: boolean; big?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 text-[13px] ${last ? "" : "border-b border-shell"}`}>
      <dt className="text-muted">{k}</dt>
      <dd className={`m-0 font-bold ${mono ? "font-mono" : ""} ${big ? "text-lg tracking-[0.25em]" : ""}`}>{v}</dd>
    </div>
  );
}
