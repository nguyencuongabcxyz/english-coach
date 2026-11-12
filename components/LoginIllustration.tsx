/**
 * Original illustration for the login screen: a phone in the middle of a speaking practice,
 * surrounded by the things the app gives you (AI question, score, feedback, progress).
 * Pure SVG + HTML in the design palette, decorative only (aria-hidden).
 */
export function LoginIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-[6/5] w-[min(100%,680px,max(480px,calc((100dvh-330px)*1.2)))] select-none">
      {/* Background shapes */}
      <svg viewBox="0 0 600 500" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="li-dots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="#B9BDEF" />
          </pattern>
        </defs>
        <circle cx="300" cy="255" r="205" fill="#CDD0F8" opacity="0.55" />
        <circle cx="478" cy="98" r="62" fill="#FBE5BC" />
        <circle cx="96" cy="410" r="74" fill="#C8F2DD" />
        <circle cx="530" cy="430" r="34" fill="#F6CBBF" />
        <rect x="18" y="40" width="130" height="110" fill="url(#li-dots)" opacity="0.9" />
        <rect x="430" y="300" width="150" height="80" fill="url(#li-dots)" opacity="0.6" />
        <path
          d="M40 250 q 18 -26 36 0 t 36 0 t 36 0"
          fill="none"
          stroke="#E9B3A5"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M520 220 q 14 -20 28 0 t 28 0" fill="none" stroke="#A9E3C6" strokeWidth="5" strokeLinecap="round" />
        {/* sparkles */}
        {[
          [560, 175, 10, "#4F55D8"],
          [70, 190, 8, "#16151A"],
          [395, 30, 7, "#16151A"],
          [210, 470, 9, "#4F55D8"],
        ].map(([x, y, r, c], i) => (
          <path
            key={i}
            d={`M${x} ${Number(y) - Number(r)} Q${x} ${y} ${Number(x) + Number(r)} ${y} Q${x} ${y} ${x} ${Number(y) + Number(r)} Q${x} ${y} ${Number(x) - Number(r)} ${y} Q${x} ${y} ${x} ${Number(y) - Number(r)}Z`}
            fill={String(c)}
          />
        ))}
      </svg>

      {/* Phone */}
      <div className="li-float-a absolute top-[6%] left-[31%] w-[38%] rounded-[30px] bg-ink p-[7px] shadow-[0_24px_60px_-20px_rgba(22,21,26,0.45)]">
        <div className="flex aspect-[9/17] flex-col gap-2 overflow-hidden rounded-[24px] bg-white px-3 pt-3 pb-3.5">
          <div className="mx-auto mb-0.5 h-1.5 w-12 rounded-full bg-canvas" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold">Family activities</span>
            <span className="text-[9px] text-muted">2/5</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[1, 1, 0, 0, 0].map((on, i) => (
              <span key={i} className={`h-1 rounded-full ${on ? "bg-ink" : "bg-canvas"}`} />
            ))}
          </div>
          <div className="flex items-start gap-1.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-ink text-[7px] font-bold text-white">AI</span>
            <div className="rounded-[3px_12px_12px_12px] bg-lilac px-2 py-1.5 text-[9.5px] leading-snug font-semibold">
              What do you usually do with your family at weekends?
            </div>
          </div>
          <div className="ml-auto max-w-[85%] rounded-[12px_3px_12px_12px] bg-soft px-2 py-1.5 text-[9px] leading-snug">
            We often have dinner together and watch movies.
          </div>
          <div className="mt-1 flex flex-col gap-1 rounded-xl bg-sand px-2 py-1.5">
            <span className="text-[8.5px] font-bold text-sand-ink">Mẹo trả lời</span>
            <span className="text-[8.5px] leading-snug">Thêm lý do với “because” và một ví dụ.</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {["get together", "spend time"].map((w) => (
              <span key={w} className="rounded-full bg-soft px-1.5 py-0.5 text-[8px] font-semibold">
                {w}
              </span>
            ))}
          </div>
          <div className="mt-auto flex flex-col items-center gap-1.5">
            <div className="flex h-6 items-center gap-[3px]">
              {[8, 16, 24, 12, 20, 10, 22, 14, 7].map((h, i) => (
                <span key={i} className="li-eq w-[3px] rounded-full bg-ink" style={{ height: h, animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
            <span className="flex size-11 items-center justify-center rounded-full bg-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </span>
            <span className="text-[9px] font-semibold">Đang nghe… 0:18</span>
          </div>
        </div>
      </div>

      {/* Speech bubble */}
      <div className="li-float-b absolute top-[12%] left-[2%] rounded-2xl rounded-bl-[4px] bg-sand px-4 py-2.5 text-[15px] font-bold shadow-sm">
        Let’s practise!
      </div>

      {/* Topic chip */}
      <div className="li-float-c absolute top-[38%] left-[5%] flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[12px] font-semibold shadow-md">
        <span className="size-2.5 rounded-full bg-[#4F55D8]" />
        Chủ đề · Family
      </div>

      {/* Score card */}
      <div className="li-float-c absolute top-[10%] right-[1%] flex w-[30%] items-center gap-3 rounded-2xl bg-white p-3 shadow-lg">
        <div className="relative size-14 shrink-0">
          <svg viewBox="0 0 56 56" className="size-full">
            <circle cx="28" cy="28" r="23" fill="none" stroke="#ECEAF1" strokeWidth="6" />
            <circle
              cx="28"
              cy="28"
              r="23"
              fill="none"
              stroke="#4F55D8"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${0.74 * 2 * Math.PI * 23} ${2 * Math.PI * 23}`}
              transform="rotate(-90 28 28)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold">7.4</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] text-muted">Tổng điểm</span>
          <span className="text-[12px] font-bold text-good">+0.5</span>
          <span className="text-[10px] text-muted">so với lần trước</span>
        </div>
      </div>

      {/* Feedback card */}
      <div className="li-float-b absolute right-[0%] bottom-[17%] flex w-[36%] flex-col gap-1.5 rounded-2xl bg-white p-3 shadow-lg">
        <span className="text-[11px] font-bold">Phản hồi từ AI</span>
        <span className="flex items-center gap-1.5 rounded-lg bg-good-bg px-2 py-1.5 text-[11px] text-good">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="m5 12 5 5 9-10" />
          </svg>
          Good vocabulary.
        </span>
        <span className="flex items-center gap-1.5 rounded-lg bg-bad-bg px-2 py-1.5 text-[11px] text-bad">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M12 7v6M12 17h.01" />
          </svg>
          Speak more smoothly.
        </span>
      </div>

      {/* Progress card */}
      <div className="li-float-a absolute bottom-[6%] left-[1%] w-[30%] rounded-2xl bg-white p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold">Tiến bộ</span>
          <span className="text-[10px] font-semibold text-good">▲ 1.6</span>
        </div>
        <div className="flex h-14 items-end gap-1.5">
          {[58, 64, 69, 74].map((v, i, a) => (
            <span
              key={i}
              className="flex-1 rounded-t-[4px]"
              style={{ height: `${((v - 40) / 40) * 100}%`, background: i === a.length - 1 ? "#4F55D8" : "#B9BDEF" }}
            />
          ))}
        </div>
        <div className="mt-1 flex gap-1.5 text-center text-[9px] text-muted">
          {["Lần 1", "2", "3", "4"].map((l) => (
            <span key={l} className="flex-1">
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
