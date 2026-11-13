"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Icon, ICON } from "@/components/icons";
import { speak } from "@/components/SpeakButton";
import { SPEECH_ERROR, type SpeechError } from "./useSpeech";

export type GameId = "fall" | "memory" | "combo";

export const GAMES: Record<
  GameId,
  { title: string; emoji: string; desc: string; level: string; bg: string; ink: string; record: (n: number) => string }
> = {
  fall: {
    title: "Từ rơi",
    emoji: "☄️",
    desc: "Đọc đúng để phá từ trước khi chạm đất",
    level: "Dễ",
    bg: "var(--color-sky)",
    ink: "var(--color-sky-ink)",
    record: (n) => `${n} từ`,
  },
  memory: {
    title: "Nhớ nhanh",
    emoji: "🧠",
    desc: "Nhìn vài giây rồi nói lại các từ vừa thấy",
    level: "Vừa",
    bg: "var(--color-lilac)",
    ink: "var(--color-lilac-ink)",
    record: (n) => `cấp ${n}`,
  },
  combo: {
    title: "Combo 3 từ",
    emoji: "🎲",
    desc: "Nói một câu dùng cả 3 từ được rút",
    level: "Khó",
    bg: "var(--color-sand)",
    ink: "var(--color-sand-ink)",
    record: (n) => `${n} điểm`,
  },
};

/** What a finished game reports. `record` is the number compared with the best so far. */
export type GameResult = {
  score: number;
  unit: string;
  record: number;
  stats: { label: string; value: string }[];
  missed: string[];
  missedTitle: string;
};

// ── Best scores, kept on this device ──
const EVENT = "ec-game-record";
const subscribe = (fn: () => void) => {
  window.addEventListener("storage", fn);
  window.addEventListener(EVENT, fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener(EVENT, fn);
  };
};
export function readBest(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
export function writeBest(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Private mode: records just aren't kept.
  }
}
/** Best score for a key, or null while server rendering. */
export function useBest(key: string): number | null {
  return useSyncExternalStore(subscribe, () => readBest(key), () => null);
}

// ── Shared pieces ──

/** The game card: a top bar with an exit button, then the game. */
export function GameFrame({
  game,
  onExit,
  right,
  children,
}: {
  game: GameId;
  onExit: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const g = GAMES[game];
  return (
    <div className="fade-in flex h-[min(680px,calc(100dvh-150px))] min-h-[500px] flex-col overflow-hidden rounded-[26px] border border-line bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <button
          type="button"
          onClick={onExit}
          aria-label="Thoát trò chơi"
          className="press flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-chip hover:text-ink"
        >
          <Icon d={ICON.close} size={18} width={2} />
        </button>
        <span className="text-[15px] font-bold">
          {g.emoji} {g.title}
        </span>
        <span className="flex min-w-9 justify-end">{right}</span>
      </div>
      {children}
    </div>
  );
}

export function Chip({ children, tone = "chip" }: { children: React.ReactNode; tone?: "chip" | "sand" | "good" | "bad" }) {
  const cls = {
    chip: "bg-chip text-ink",
    sand: "bg-sand text-sand-ink",
    good: "bg-good-bg text-good",
    bad: "bg-bad-bg text-bad",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${cls}`}>{children}</span>;
}

export function Hearts({ left, total = 3, shake = 0 }: { left: number; total?: number; shake?: number }) {
  return (
    <span key={shake} className={`flex gap-0.5 text-base ${shake ? "shake" : ""}`} aria-label={`Còn ${left} mạng`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < left ? "" : "opacity-25 grayscale"}>
          ❤️
        </span>
      ))}
    </span>
  );
}

/** Microphone status: what the recogniser is hearing right now, or why it can't listen. */
export function MicBar({
  listening,
  heard,
  error,
  idle = "Micro đang tắt",
}: {
  listening: boolean;
  heard: string;
  error: SpeechError;
  idle?: string;
}) {
  if (error) {
    return <div className="m-3 rounded-2xl bg-bad-bg px-4 py-3 text-[13px] leading-normal text-bad">{SPEECH_ERROR[error]}</div>;
  }
  return (
    <div className="m-3 flex min-h-[60px] items-center gap-3 rounded-2xl border border-line bg-soft px-3 py-2.5">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white ${
          listening ? "bg-rec shadow-[0_0_0_6px_#c2412d22]" : "bg-muted/50"
        }`}
      >
        <Icon d={ICON.mic} size={18} width={2} />
      </span>
      {listening && (
        <span className="flex h-5 items-center gap-[3px]" aria-hidden="true">
          {[8, 16, 11, 19, 7].map((h, i) => (
            <i key={i} className="eq-bar block w-[3px] rounded-sm bg-rec" style={{ height: h, animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[13px] text-muted" aria-live="polite">
        {listening ? (
          heard ? (
            <>
              Nghe được: <b className="font-semibold text-ink">“{heard}”</b>
            </>
          ) : (
            "Đang nghe… nói to và rõ nhé!"
          )
        ) : (
          idle
        )}
      </span>
    </div>
  );
}

/** 3‑2‑1 before a game starts: `n` is null when no countdown is running. */
export function useCountdown() {
  const [n, setN] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);
  const run = useCallback((done: () => void) => {
    clearInterval(timer.current);
    let k = 3;
    setN(k);
    timer.current = window.setInterval(() => {
      k -= 1;
      if (k >= 0) setN(k);
      else {
        clearInterval(timer.current);
        setN(null);
        done();
      }
    }, 750);
  }, []);
  return [n, run] as const;
}

/** Big 3‑2‑1 over the game area. */
export function Countdown({ n }: { n: number }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
      <span key={n} className="count-pop text-[88px] font-extrabold tracking-[-3px] text-brand">
        {n > 0 ? n : "Nói!"}
      </span>
    </div>
  );
}

/** Rules and a start button, shown before each game. */
export function Intro({
  game,
  rules,
  onStart,
  disabled,
  note,
}: {
  game: GameId;
  rules: string[];
  onStart: () => void;
  disabled?: boolean;
  note?: React.ReactNode;
}) {
  const g = GAMES[game];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-[24px] text-[42px]" style={{ background: g.bg }}>
        {g.emoji}
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.4px]">{g.title}</h2>
        <p className="m-0 text-sm text-muted">{g.desc}</p>
      </div>
      <ol className="m-0 flex w-full max-w-[340px] flex-col gap-2 p-0 text-left text-[13px] leading-normal">
        {rules.map((r, i) => (
          <li key={i} className="flex gap-2.5 rounded-xl bg-soft px-3 py-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold">{i + 1}</span>
            <span>{r}</span>
          </li>
        ))}
      </ol>
      {note}
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="press min-h-12 w-full max-w-[340px] cursor-pointer rounded-2xl bg-brand px-6 text-[15px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        Bắt đầu 🎙️
      </button>
    </div>
  );
}

const CONFETTI = ["#4f55d8", "#e3a92b", "#3fae7a", "#e0624a", "#cdd0f8", "#f6cbbf"];

/** Paper confetti over the whole screen (portalled so page animations can't clip it). */
function Confetti() {
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => (
        <i
          key={i}
          className="confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI[i % CONFETTI.length],
            animationDuration: `${1.8 + ((i * 7) % 10) / 6}s`,
            animationDelay: `${((i * 13) % 10) / 12}s`,
          }}
        />
      ))}
    </div>,
    document.body,
  );
}

/** End screen shared by all games. */
export function ResultView({
  game,
  result,
  isRecord,
  onAgain,
  onHub,
}: {
  game: GameId;
  result: GameResult;
  isRecord: boolean;
  onAgain: () => void;
  onHub: () => void;
}) {
  return (
    <GameFrame game={game} onExit={onHub}>
      <div className="relative flex flex-1 flex-col items-center gap-4 overflow-x-hidden overflow-y-auto px-5 py-6 text-center">
        {isRecord && <Confetti />}
        {isRecord ? <Chip tone="sand">🏆 Kỷ lục mới!</Chip> : <Chip>Kết thúc</Chip>}
        <div className="pop-in flex flex-col items-center">
          <span className="text-[64px] leading-none font-extrabold tracking-[-2px]">{result.score}</span>
          <span className="mt-1 text-[13px] text-muted">{result.unit}</span>
        </div>
        <div className="grid w-full grid-cols-3 gap-2">
          {result.stats.map((s) => (
            <div key={s.label} className="flex flex-col rounded-2xl bg-soft px-1 py-2.5">
              <b className="text-lg">{s.value}</b>
              <span className="text-[11px] text-muted">{s.label}</span>
            </div>
          ))}
        </div>
        {result.missed.length > 0 && (
          <div className="w-full rounded-2xl bg-bad-bg px-4 py-3 text-left">
            <h3 className="m-0 mb-1.5 text-[13px] font-bold text-bad">{result.missedTitle}</h3>
            {result.missed.map((w) => (
              <div key={w} className="flex items-center justify-between border-t border-[#e0624a33] py-1.5 text-sm">
                <span>{w}</span>
                <SayButton word={w} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-auto grid w-full grid-cols-2 gap-2 pt-2">
          <button type="button" onClick={onHub} className="press min-h-12 cursor-pointer rounded-2xl bg-chip font-bold hover:bg-line">
            Trò khác
          </button>
          <button type="button" onClick={onAgain} className="press min-h-12 cursor-pointer rounded-2xl bg-brand font-bold text-white hover:bg-brand-dark">
            Chơi lại ↻
          </button>
        </div>
      </div>
    </GameFrame>
  );
}

/** Small speaker button that reads a word aloud. */
export function SayButton({ word, className = "" }: { word: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(word);
      }}
      aria-label={`Nghe “${word}”`}
      className={`press flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/60 ${className}`}
    >
      <Icon d={ICON.speaker} size={14} width={2} />
    </button>
  );
}

/** Picks `n` different words at random. */
export function pick(words: string[], n: number, avoid: string[] = []): string[] {
  const pool = words.filter((w) => !avoid.includes(w));
  const src = pool.length >= n ? pool : words;
  const out: string[] = [];
  const copy = [...src];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

/** A random number from `min` to `max`. */
export const between = (min: number, max: number) => min + Math.random() * (max - min);
