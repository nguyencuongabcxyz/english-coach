"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, ICON } from "@/components/icons";
import { findPhrase, saidPhrase, shuffle, tokenize, wordCount } from "@/lib/word-match";
import { useSpeech, type SpeechUpdate } from "./useSpeech";
import { Chip, GameFrame, Intro, MicBar, SayButton, type GameResult } from "./parts";

type Phase = "intro" | "ready" | "talk" | "scoring" | "scored";

const ROUNDS = 5;
const SECONDS = 30;
const COLORS = [
  { bg: "var(--color-lilac)", ink: "var(--color-lilac-ink)" },
  { bg: "var(--color-mint)", ink: "var(--color-mint-ink)" },
  { bg: "var(--color-peach)", ink: "var(--color-peach-ink)" },
];

/** 1 word = 10, 2 words = 40, all 3 = 90, plus 10 for a sentence of 10+ words. */
export const comboPoints = (used: number, words: number) => used * used * 10 + (used > 0 && words >= 10 ? 10 : 0);

/** 🎲 Three random words: say one sentence that uses all of them. */
export function ComboGame({ words, onDone, onExit }: { words: string[]; onDone: (r: GameResult) => void; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<string[]>([]);
  const [segs, setSegs] = useState<Record<number, string>>({});
  const [altUsed, setAltUsed] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [rerolled, setRerolled] = useState(false);

  const g = useRef({ phase: "intro" as Phase, mark: 0, deck: [] as string[], drawn: [] as string[], usedEver: [] as string[], x3: 0, longest: 0, total: 0 });
  const deadline = useRef(0);

  const speech = useSpeech(onSpeech);

  const text = Object.keys(segs)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => segs[k])
    .join(" ")
    .trim();
  const tokens = tokenize(text);
  const ranges = cards.map((c) => findPhrase(c, tokens));
  const used = cards.map((c, i) => ranges[i] !== null || altUsed.includes(c));
  const k = used.filter(Boolean).length;
  const wc = wordCount(text);
  const points = comboPoints(k, wc);

  function go(p: Phase) {
    g.current.phase = p;
    setPhase(p);
  }

  function draw(): string[] {
    const s = g.current;
    const out: string[] = [];
    while (out.length < 3) {
      if (!s.deck.length) s.deck = shuffle(words).filter((w) => !out.includes(w));
      const w = s.deck.shift();
      if (w === undefined) break;
      if (!out.includes(w)) out.push(w);
    }
    for (const w of out) if (!s.drawn.includes(w)) s.drawn.push(w);
    return out;
  }

  function newRound(n: number) {
    setRound(n);
    setCards(draw());
    setSegs({});
    setAltUsed([]);
    setRerolled(false);
    setLeft(SECONDS);
    go("ready");
  }

  function begin() {
    g.current = { phase: "ready", mark: 0, deck: shuffle(words), drawn: [], usedEver: [], x3: 0, longest: 0, total: 0 };
    setTotal(0);
    newRound(1);
  }

  function talk() {
    setSegs({});
    setAltUsed([]);
    speech.clearHeard();
    g.current.mark = speech.mark();
    speech.start();
    deadline.current = Date.now() + SECONDS * 1000;
    setLeft(SECONDS);
    go("talk");
  }

  async function done() {
    if (g.current.phase !== "talk") return;
    go("scoring");
    await speech.stop();
    go("scored");
  }

  function onSpeech(u: SpeechUpdate) {
    const s = g.current;
    if ((s.phase !== "talk" && s.phase !== "scoring") || u.id < s.mark) return;
    setSegs((prev) => ({ ...prev, [u.id]: u.alts[0] ?? "" }));
    // Another reading of the same words may contain a card word the first one missed.
    const extra = cards.filter((c) => u.alts.slice(1).some((a) => saidPhrase(c, a)));
    if (extra.length) setAltUsed((prev) => [...new Set([...prev, ...extra])]);
  }

  function nextRound() {
    const s = g.current;
    s.total += points;
    if (k === 3) s.x3 += 1;
    s.longest = Math.max(s.longest, k > 0 ? wc : 0);
    cards.forEach((c, i) => used[i] && !s.usedEver.includes(c) && s.usedEver.push(c));
    setTotal(s.total);
    if (round >= ROUNDS) {
      const missed = s.drawn.filter((w) => !s.usedEver.includes(w));
      onDone({
        score: s.total,
        unit: "điểm",
        record: s.total,
        stats: [
          { label: "combo x3", value: `💥 ${s.x3}` },
          { label: "từ đã dùng", value: `${s.usedEver.length}/${s.drawn.length}` },
          { label: "câu dài nhất", value: `${s.longest} từ` },
        ],
        missed,
        missedTitle: `${missed.length} từ chưa dùng được`,
      });
      return;
    }
    newRound(round + 1);
  }

  // Round clock.
  useEffect(() => {
    if (phase !== "talk") return;
    const t = window.setInterval(() => {
      const rest = Math.max(0, (deadline.current - Date.now()) / 1000);
      setLeft(rest);
      if (rest <= 0) {
        clearInterval(t);
        void done();
      }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "intro") {
    return (
      <GameFrame game="combo" onExit={onExit}>
        <Intro
          game="combo"
          rules={[
            `Mỗi lượt rút 3 từ của chủ đề. Có ${ROUNDS} lượt.`,
            `Bấm micro rồi nói MỘT câu dùng càng nhiều từ càng tốt (${SECONDS} giây).`,
            "1 từ = 10 điểm · 2 từ = COMBO x2 (40) · đủ 3 từ = COMBO x3 (90). Câu từ 10 chữ trở lên được thêm 10.",
          ]}
          onStart={begin}
        />
      </GameFrame>
    );
  }

  // The sentence split into runs, each card phrase as one run in its card's colour.
  const colourAt = (j: number) => ranges.findIndex((r) => r !== null && j >= r[0] && j <= r[1]);
  const runs: { colour: number; text: string }[] = [];
  tokens.forEach((t, j) => {
    const colour = colourAt(j);
    const last = runs.at(-1);
    if (last && last.colour === colour) last.text += " " + t.raw;
    else runs.push({ colour, text: t.raw });
  });

  return (
    <GameFrame game="combo" onExit={onExit} right={<Chip>Lượt {round}/{ROUNDS}</Chip>}>
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className={`flex items-center gap-1 text-sm font-semibold ${phase === "talk" && left <= 10 ? "text-rec" : "text-muted"}`}>
            <Icon d={ICON.timer} size={15} width={2} /> 0:{String(Math.ceil(left)).padStart(2, "0")}
          </span>
          <span className="text-[22px] font-extrabold tracking-[-0.5px]">
            {total + (phase === "scored" ? points : 0)} điểm
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 px-3.5 pt-4">
          {cards.map((c, i) => (
            <div
              key={c + i}
              className="pop-in relative flex min-h-[86px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-2 text-center text-[13px] leading-tight font-bold"
              style={{ background: COLORS[i].bg, color: COLORS[i].ink, animationDelay: `${i * 80}ms` }}
            >
              <span className="px-1">{c}</span>
              <SayButton word={c} className="size-7" />
              {used[i] && (
                <span className="pop-in absolute -top-2 -right-1.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-good text-white">
                  <Icon d={ICON.check} size={12} width={3} />
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mx-3.5 mt-3 min-h-[92px] rounded-2xl border border-line bg-soft px-4 py-3 text-[15px] leading-relaxed" aria-live="polite">
          {text ? (
            <>
              “
              {runs.map((r, j) =>
                r.colour >= 0 ? (
                  <span key={j}>
                    <mark className="rounded-md px-1 font-bold" style={{ background: COLORS[r.colour].bg, color: COLORS[r.colour].ink }}>
                      {r.text}
                    </mark>{" "}
                  </span>
                ) : (
                  <span key={j}>{r.text} </span>
                ),
              )}
              ”
            </>
          ) : (
            <span className="text-muted">
              {phase === "talk" ? "Đang nghe… hãy nói một câu thật dài!" : "Câu của bạn sẽ hiện ở đây. Ví dụ: “My family is close-knit, so we often go on a picnic…”"}
            </span>
          )}
        </div>

        {phase === "scored" && (
          <div className="pop-in flex flex-col items-center gap-0.5 pt-4 text-center">
            <span
              className={`text-[34px] font-extrabold tracking-[-1px] ${k >= 2 ? "bg-linear-to-r from-brand to-bad-bar bg-clip-text text-transparent" : ""}`}
            >
              {k === 0 ? "Chưa có từ nào 😅" : k === 1 ? "Được 1 từ 👍" : `COMBO x${k} ${k === 3 ? "💥" : "✨"}`}
            </span>
            <span className={`text-sm font-bold ${k ? "text-good" : "text-muted"}`}>
              {k ? `+${points} điểm · câu ${wc} từ` : "Thử nói lại và dùng ít nhất 1 từ nhé"}
              {k > 0 && wc >= 10 && " 👏"}
            </span>
          </div>
        )}

        <div className="mt-auto flex flex-col items-center gap-2 px-3.5 pt-4 pb-1">
          {phase === "ready" && (
            <>
              <button
                type="button"
                onClick={talk}
                aria-label="Bấm để nói"
                className="press flex size-20 cursor-pointer items-center justify-center rounded-full border-[7px] border-bad-bg bg-rec text-white"
              >
                <Icon d={ICON.mic} size={30} width={2} />
              </button>
              <span className="text-[13px] text-muted">Bấm để nói · {SECONDS} giây</span>
              {!rerolled && (
                <button
                  type="button"
                  onClick={() => {
                    setCards(draw());
                    setRerolled(true);
                  }}
                  className="press cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted hover:bg-chip"
                >
                  🔀 Đổi bộ từ khác
                </button>
              )}
            </>
          )}
          {phase === "talk" && (
            <button type="button" onClick={done} className="press min-h-12 w-full cursor-pointer rounded-2xl bg-ink font-bold text-white">
              Xong ✓
            </button>
          )}
          {phase === "scoring" && <span className="spin my-3 size-6 rounded-full border-[3px] border-brand border-t-transparent" />}
          {phase === "scored" && (
            <div className="grid w-full grid-cols-2 gap-2">
              <button type="button" onClick={talk} className="press min-h-12 cursor-pointer rounded-2xl bg-chip font-bold hover:bg-line">
                🔁 Nói lại
              </button>
              <button type="button" onClick={nextRound} className="press min-h-12 cursor-pointer rounded-2xl bg-brand font-bold text-white hover:bg-brand-dark">
                {round >= ROUNDS ? "Xem kết quả" : "Lượt tiếp ›"}
              </button>
            </div>
          )}
          <span className="text-[11px] text-muted">1 từ = 10 · 2 từ = 40 · 3 từ = 90 điểm</span>
        </div>
      </div>

      <MicBar
        listening={speech.listening && phase === "talk"}
        heard={speech.heard}
        error={speech.error}
        idle={phase === "scored" ? "Micro đã tắt" : "Bấm nút micro đỏ để bắt đầu nói"}
      />
    </GameFrame>
  );
}
