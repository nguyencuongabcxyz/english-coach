import { Icon, ICON } from "./icons";
import { SpeakButton } from "./SpeakButton";
import { StudentVoice } from "./StudentVoice";
import { fmt, level, SKILL_EN, SKILL_VI, SKILLS, type Scores, type Skill } from "@/lib/skills";
import type { AnswerRow, SessionRow } from "@/lib/types";

/** Big score ring + five criteria cards (shared by student feedback and teacher review). */
export function ScoreOverview({
  scores,
  aiScores,
  headline,
  delta,
  notes,
}: {
  scores: Scores;
  aiScores?: Scores | null;
  headline: string;
  delta: number | null;
  notes: Partial<Record<Skill, string>>;
}) {
  const C = 2 * Math.PI * 52;
  return (
    <div className="flex flex-wrap gap-4 px-5 pt-6 pb-3 sm:px-9">
      <section className="flex flex-[1_1_340px] items-center gap-5 rounded-[22px] bg-ink p-5 text-white sm:p-[22px] xl:max-w-[420px]">
        <div className="relative size-[110px] shrink-0 sm:size-[120px]">
          <svg viewBox="0 0 120 120" className="size-full" role="img" aria-label={`Tổng điểm ${fmt(scores.total)} trên 10`}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="#3A3842" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#CDD0F8"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(scores.total / 10) * C} ${C}`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-extrabold sm:text-[30px]">{fmt(scores.total)}</span>
            <span className="text-xs text-[#C9C7D1]">trên 10</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-[#C9C7D1]">Tổng điểm</span>
          <span className="text-[18px] leading-[1.3] font-bold sm:text-[20px]">{headline}</span>
          {delta != null && (
            <span className={`text-[13px] font-semibold ${delta >= 0 ? "text-[#A6F0C8]" : "text-[#F6CBBF]"}`}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)} so với lần trước
            </span>
          )}
        </div>
      </section>
      <div className="grid min-w-0 flex-[999_1_480px] grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {SKILLS.map((k) => {
          const v = scores[k];
          const l = level(v);
          const ai = aiScores?.[k];
          return (
            <div key={k} className="flex flex-col gap-2 rounded-[18px] border border-line p-4">
              <span className="text-[13px] font-semibold">{SKILL_VI[k]}</span>
              <span className="text-[11px] text-muted">{SKILL_EN[k]}</span>
              <span className="flex items-baseline gap-2">
                <span className="text-[26px] font-extrabold">{fmt(v)}</span>
                {ai != null && ai !== v && <span className="text-xs text-muted line-through">AI {fmt(ai)}</span>}
              </span>
              <span className="self-start rounded-full px-2.5 py-[3px] text-xs font-semibold" style={{ background: l.bg, color: l.fg }}>
                {l.label}
              </span>
              {notes[k] && <span className="text-xs leading-normal text-muted">{notes[k]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StrengthsImprovements({ strengths, improvements }: { strengths: string[]; improvements: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-5 py-3 sm:px-9 md:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-[22px] bg-mint p-5">
        <h2 className="m-0 text-[17px] font-bold">Điểm mạnh</h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {strengths.map((s) => (
            <li key={s} className="flex items-center gap-2.5 rounded-[14px] bg-white px-3.5 py-3 text-sm">
              <Icon d={ICON.check} size={16} stroke="#11663F" width={2.6} />
              {s}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3 rounded-[22px] bg-peach p-5">
        <h2 className="m-0 text-[17px] font-bold">Cần cải thiện</h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {improvements.map((s) => (
            <li key={s} className="flex items-center gap-2.5 rounded-[14px] bg-white px-3.5 py-3 text-sm">
              <Icon d={ICON.alert} size={16} stroke="#9B2C1A" width={2.4} />
              {s}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const clean = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");

/** Transcript with marked words to practise and ‖ for long pauses. */
export function AnnotatedTranscript({ answer }: { answer: AnswerRow }) {
  const ev = answer.evaluation;
  const marks = new Set((ev?.pronunciationWords ?? []).map((p) => clean(p.word)));
  const pauses = [...(answer.metrics?.longPauses ?? [])];
  const tokens = answer.transcript.split(/(\s+)/);
  return (
    <p className="m-0 text-[15px] leading-[1.9]">
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return tok;
        const c = clean(tok);
        const pIdx = pauses.findIndex((p) => clean(p.after) === c);
        const pause = pIdx >= 0 ? pauses.splice(pIdx, 1)[0] : null;
        const word = marks.has(c) ? (
          <mark key={i} className="rounded bg-ok-bg px-1 py-px text-ink">
            {tok}
          </mark>
        ) : (
          <span key={i}>{tok}</span>
        );
        return pause ? (
          <span key={i}>
            {word}{" "}
            <span className="font-bold text-bad" title={`Ngập ngừng ${pause.seconds} giây`} aria-label={`ngập ngừng ${pause.seconds} giây`}>
              ‖
            </span>
          </span>
        ) : (
          word
        );
      })}
    </p>
  );
}

export function AnswerDetails({ answer, index, showQuestion }: { answer: AnswerRow; index: number; showQuestion: boolean }) {
  const ev = answer.evaluation;
  const m = answer.metrics;
  return (
    <div className="flex flex-col gap-3">
      {showQuestion && (
        <span className="text-[13px] font-semibold text-muted">
          Câu {index + 1}: <span className="text-ink">{answer.question}</span>
        </span>
      )}
      <AnnotatedTranscript answer={answer} />
      {answer.audio_url ? (
        <StudentVoice
          src={`/api/audio/${answer.id}`}
          transcript={answer.transcript}
          duration={answer.duration_sec}
          timings={m?.timings}
        />
      ) : (
        <span className="text-xs text-muted">Không có bản ghi âm cho câu trả lời này.</span>
      )}
      <div className="flex flex-col gap-2">
        {ev && ev.pronunciationWords.length > 0 && (
          <Row label="Phát âm">
            <span>{ev.pronunciationWords.map((p) => `${p.word} ${p.ipa}`).join(" · ")}</span>
            <SpeakButton text={ev.pronunciationWords.map((p) => p.word).join(". ")} className="ml-auto" />
          </Row>
        )}
        {m && (
          <Row label="Độ trôi chảy">
            <span>
              {m.longPauses.length
                ? `${m.longPauses.length} lần ngập ngừng lâu (${m.longPauses.map((p) => `${p.seconds.toString().replace(".", ",")} giây`).join(", ")})`
                : "Không có khoảng ngập ngừng dài"}
              {m.wpm ? ` · ${m.wpm} từ/phút` : ""}
              {m.fillers ? ` · ${m.fillers} từ đệm (um, uh)` : ""}
            </span>
          </Row>
        )}
        {ev?.grammarFixes.map((g, i) => (
          <Row key={i} label="Ngữ pháp">
            <span>
              <span className="text-bad line-through">{g.original}</span> → <strong className="text-good">{g.corrected}</strong>
              <span className="text-muted"> · {g.explain}</span>
            </span>
          </Row>
        ))}
        {ev?.contentTip && (
          <Row label="Nội dung">
            <span>{ev.contentTip}</span>
          </Row>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[14px] bg-soft px-3.5 py-3 text-[13px]">
      <span className="font-bold">{label}</span>
      {children}
    </div>
  );
}

/** Notes per criterion: take the note from the answer with the lowest score on that criterion. */
export function pickNotes(answers: AnswerRow[]): Partial<Record<Skill, string>> {
  const out: Partial<Record<Skill, string>> = {};
  for (const k of SKILLS) {
    const best = answers
      .filter((a) => a.evaluation)
      .sort((a, b) => a.evaluation!.scores[k] - b.evaluation!.scores[k])[0];
    if (best) out[k] = best.evaluation!.notes[k];
  }
  return out;
}

export function sessionDelta(sessions: SessionRow[], current: SessionRow, pick: (s: SessionRow) => Scores | null) {
  const prev = sessions.filter((s) => s.seq < current.seq && pick(s)).at(-1);
  const cur = pick(current);
  return prev && cur ? Math.round((cur.total - pick(prev)!.total) * 10) / 10 : null;
}
