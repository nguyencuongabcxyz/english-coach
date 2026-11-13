"use client";

import { useEffect, useRef, useState } from "react";
import { hintFor, saidPhrase } from "@/lib/word-match";
import { useSpeech, type SpeechUpdate } from "./useSpeech";
import { Chip, Countdown, GameFrame, Hearts, Intro, MicBar, pick, SayButton, useCountdown, type GameResult } from "./parts";

type Phase = "intro" | "count" | "show" | "recall" | "review" | "over";

const LIVES = 3;
const sizeFor = (level: number, max: number) => Math.min(2 + level, max, 8);
const showSeconds = (n: number) => 2 + n;
const recallSeconds = (n: number) => 6 + n * 3;

/** 🧠 See a few words for a few seconds, then say them back from memory. */
export function MemoryGame({ words, onDone, onExit }: { words: string[]; onDone: (r: GameResult) => void; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(LIVES);
  const [round, setRound] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [left, setLeft] = useState(0);
  const [total, setTotal] = useState(1);
  const [shake, setShake] = useState(0);
  const [count, runCountdown] = useCountdown();

  const g = useRef({ phase: "intro" as Phase, round: [] as string[], found: [] as string[], mark: 0, score: 0, level: 1, lives: LIVES, missed: [] as string[], recent: [] as string[], perfect: 0 });
  const deadline = useRef(0);

  const speech = useSpeech(onSpeech);

  function go(p: Phase) {
    g.current.phase = p;
    setPhase(p);
  }

  function startRound(level: number) {
    const n = sizeFor(level, words.length);
    const r = pick(words, n, g.current.recent);
    g.current.recent = r;
    g.current.round = r;
    g.current.found = [];
    setRound(r);
    setFound([]);
    timed(showSeconds(n));
    go("show");
  }

  function timed(seconds: number) {
    deadline.current = Date.now() + seconds * 1000;
    setTotal(seconds);
    setLeft(seconds);
  }

  function toRecall() {
    g.current.mark = speech.mark();
    speech.clearHeard();
    timed(recallSeconds(g.current.round.length));
    go("recall");
  }

  function toReview() {
    const s = g.current;
    const ok = s.found.length === s.round.length;
    if (ok) s.perfect += 1;
    else {
      s.lives -= 1;
      setLives(s.lives);
      setShake((k) => k + 1);
      for (const w of s.round) if (!s.found.includes(w) && !s.missed.includes(w)) s.missed.push(w);
    }
    go("review");
  }

  function next() {
    const s = g.current;
    if (s.lives <= 0) return finish();
    if (s.found.length === s.round.length) {
      s.level += 1;
      setLevel(s.level);
    }
    startRound(s.level);
  }

  function finish() {
    const s = g.current;
    go("over");
    void speech.stop();
    onDone({
      score: s.level,
      unit: "cấp cao nhất",
      record: s.level,
      stats: [
        { label: "từ nhớ được", value: String(s.score) },
        { label: "lượt nhớ đủ", value: `⭐ ${s.perfect}` },
        { label: "từ quên", value: String(s.missed.length) },
      ],
      missed: s.missed,
      missedTitle: `Ôn lại ${s.missed.length} từ bạn quên`,
    });
  }

  function onSpeech(u: SpeechUpdate) {
    const s = g.current;
    if (s.phase !== "recall" || u.id < s.mark) return;
    const got = s.round.filter((w) => !s.found.includes(w) && u.alts.some((a) => saidPhrase(w, a)));
    if (!got.length) return;
    s.found = [...s.found, ...got];
    s.score += got.length;
    setFound(s.found);
    if (s.found.length === s.round.length) {
      s.phase = "review"; // stop the clock right away
      setTimeout(toReview, 450);
    }
  }

  // Clock for the "look" and "say" steps.
  useEffect(() => {
    if (phase !== "show" && phase !== "recall") return;
    const t = window.setInterval(() => {
      const rest = Math.max(0, (deadline.current - Date.now()) / 1000);
      setLeft(rest);
      if (rest <= 0) {
        clearInterval(t);
        if (g.current.phase === "show") toRecall();
        else if (g.current.phase === "recall") toReview();
      }
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function begin() {
    g.current = { phase: "count", round: [], found: [], mark: 0, score: 0, level: 1, lives: LIVES, missed: [], recent: [], perfect: 0 };
    setLevel(1);
    setLives(LIVES);
    setRound([]);
    go("count");
    speech.start();
    runCountdown(() => startRound(1));
  }

  if (phase === "intro" || (speech.error && phase !== "over")) {
    return (
      <GameFrame game="memory" onExit={onExit}>
        <Intro
          game="memory"
          rules={[
            "Vài từ hiện ra trong vài giây. Cố ghi nhớ hết nhé!",
            "Các từ bị ẩn đi: nói lại càng nhiều từ càng tốt, thứ tự nào cũng được.",
            "Nhớ đủ thì lên cấp và thêm 1 từ. Quên từ nào thì mất 1 mạng (có 3 mạng).",
          ]}
          onStart={begin}
          note={speech.error && <MicBar listening={false} heard="" error={speech.error} />}
        />
      </GameFrame>
    );
  }

  const n = round.length || sizeFor(level, words.length);
  const pct = phase === "show" || phase === "recall" ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  const allFound = round.length > 0 && found.length === round.length;

  return (
    <GameFrame game="memory" onExit={onExit} right={<Chip>Cấp {level} · {n} từ</Chip>}>
      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-3">
          <Hearts left={lives} shake={shake} />
          <span className="flex gap-1" aria-label={`Cấp ${level}`}>
            {Array.from({ length: Math.max(6, level) }, (_, i) => (
              <i key={i} className={`block h-1.5 w-5 rounded-full ${i < level ? "bg-brand" : "bg-line"}`} />
            ))}
          </span>
        </div>

        {(phase === "show" || phase === "recall") && (
          <div className="flex flex-col items-center gap-1.5 pt-2">
            <div
              className="flex size-[76px] items-center justify-center rounded-full"
              style={{ background: `conic-gradient(var(--color-brand) 0 ${pct}%, var(--color-lilac-soft) ${pct}% 100%)` }}
            >
              <span className="flex size-[60px] items-center justify-center rounded-full bg-white text-xl font-extrabold">{Math.ceil(left)}s</span>
            </div>
            <span className="text-sm font-semibold text-muted">{phase === "show" ? "Ghi nhớ các từ này! 👀" : "Nói lại các từ bạn vừa thấy!"}</span>
          </div>
        )}

        {phase === "review" && (
          <div className="pop-in flex flex-col items-center gap-1 px-4 pt-4 text-center">
            <span className="text-[26px] font-extrabold tracking-[-0.5px]">{allFound ? "Tuyệt vời! 🎉" : "Suýt nữa thôi! 💪"}</span>
            <span className="text-sm text-muted">
              {allFound
                ? `Bạn nhớ đủ ${round.length} từ. Lên cấp ${level + 1}!`
                : lives > 0
                  ? `Bạn nhớ ${found.length}/${round.length} từ. Còn ${lives} mạng.`
                  : `Bạn nhớ ${found.length}/${round.length} từ. Hết mạng rồi!`}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 px-4 py-3">
          {round.map((w, i) => {
            const ok = found.includes(w);
            if (phase === "show") {
              return (
                <div key={w} className="pop-in rounded-[14px] bg-lilac px-4 py-3 text-base font-bold text-lilac-ink" style={{ animationDelay: `${i * 70}ms` }}>
                  {w}
                </div>
              );
            }
            if (ok) {
              return (
                <div key={w} className="pop-in flex items-center justify-between rounded-[14px] bg-good-bg px-4 py-3 text-base font-bold text-good">
                  {w} <span>✓</span>
                </div>
              );
            }
            if (phase === "review") {
              return (
                <div key={w} className="flex items-center justify-between rounded-[14px] bg-bad-bg py-1.5 pr-1.5 pl-4 text-base font-bold text-bad">
                  {w} <SayButton word={w} />
                </div>
              );
            }
            return (
              <div key={w} className="flex items-center justify-between rounded-[14px] border-2 border-dashed border-line bg-soft px-4 py-2.5 font-bold text-[#b6b3c2]">
                ? ? ? <span className="text-[11px] font-semibold">{hintFor(w)}</span>
              </div>
            );
          })}
        </div>

        {phase === "recall" && (
          <button
            type="button"
            onClick={() => {
              g.current.phase = "review";
              toReview();
            }}
            className="press mx-auto mb-1 cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold text-muted hover:bg-chip"
          >
            Hết nhớ rồi, xem đáp án
          </button>
        )}
        {phase === "review" && (
          <div className="mt-auto px-4 pb-1">
            <button type="button" onClick={next} className="press min-h-12 w-full cursor-pointer rounded-2xl bg-brand font-bold text-white hover:bg-brand-dark">
              {lives <= 0 ? "Xem kết quả" : allFound ? `Cấp ${level + 1} ›` : "Thử lượt mới ›"}
            </button>
          </div>
        )}
        {count !== null && <Countdown n={count} />}
      </div>

      <MicBar
        listening={speech.listening && phase === "recall"}
        heard={speech.heard}
        error={speech.error}
        idle={phase === "show" ? "Nhìn kỹ đã… micro bật khi các từ ẩn đi 👀" : phase === "review" ? "Micro tạm nghỉ" : "Chuẩn bị…"}
      />
    </GameFrame>
  );
}
