"use client";

import { useEffect, useRef, useState } from "react";
import { saidPhrase } from "@/lib/word-match";
import { useSpeech, type SpeechUpdate } from "./useSpeech";
import { between, Chip, Countdown, GameFrame, Hearts, Intro, MicBar, pick, useCountdown, type GameResult } from "./parts";

type Drop = { id: number; word: string; x: number; dur: number; popTop?: number };
type Floater = { id: number; x: number; y: number; text: string; big?: boolean };

const LIVES = 3;
const levelOf = (score: number) => 1 + Math.floor(score / 5);
const spawnEvery = (level: number) => Math.max(950, 2700 - (level - 1) * 230);
const fallSeconds = (level: number) => Math.max(4.2, 10 - (level - 1) * 0.65);
const maxOnScreen = (level: number) => Math.min(2 + level, 6);

/** ☄️ Words fall from the top; saying one aloud destroys it before it hits the ground. */
export function FallingWords({ words, onDone, onExit }: { words: string[]; onDone: (r: GameResult) => void; onExit: () => void }) {
  const [phase, setPhase] = useState<"intro" | "count" | "play" | "over">("intro");
  const [paused, setPaused] = useState(false);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [streak, setStreak] = useState(0);
  const [shake, setShake] = useState(0);
  const [count, runCountdown] = useCountdown();

  // Mutable game state read by timers and the speech callback.
  const g = useRef({ phase: "intro", paused: false, score: 0, lives: LIVES, streak: 0, bestStreak: 0, misses: 0, missed: [] as string[], last: "", nextId: 1 });
  const dropsRef = useRef<Drop[]>([]);
  const els = useRef(new Map<number, HTMLDivElement>());
  const stage = useRef<HTMLDivElement>(null);
  const consumed = useRef(new Set<string>());
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const setAll = (next: Drop[]) => {
    dropsRef.current = next;
    setDrops(next);
  };
  const float = (f: Omit<Floater, "id">) => {
    const id = g.current.nextId++;
    setFloaters((l) => [...l, { ...f, id }]);
    later(() => setFloaters((l) => l.filter((x) => x.id !== id)), 950);
  };

  const speech = useSpeech(onSpeech);

  function onSpeech(u: SpeechUpdate) {
    const s = g.current;
    if (s.phase !== "play" || s.paused) return;
    for (const d of dropsRef.current) {
      if (d.popTop !== undefined) continue;
      const key = `${u.id}|${d.word}`;
      if (consumed.current.has(key)) continue;
      if (u.alts.some((a) => saidPhrase(d.word, a))) {
        consumed.current.add(key);
        pop(d);
      }
    }
  }

  function pop(d: Drop) {
    const s = g.current;
    const top = els.current.get(d.id)?.offsetTop ?? 0;
    setAll(dropsRef.current.map((x) => (x.id === d.id ? { ...x, popTop: top } : x)));
    later(() => setAll(dropsRef.current.filter((x) => x.id !== d.id)), 450);

    const before = levelOf(s.score);
    s.score += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    setScore(s.score);
    setStreak(s.streak);
    float({ x: d.x, y: top, text: s.streak > 0 && s.streak % 5 === 0 ? `🔥 x${s.streak}` : "+1 ✨" });
    if (levelOf(s.score) > before) float({ x: 50, y: 120, text: `Cấp ${levelOf(s.score)} 🚀`, big: true });
  }

  function miss(d: Drop) {
    const s = g.current;
    if (s.phase !== "play" || d.popTop !== undefined) return;
    setAll(dropsRef.current.filter((x) => x.id !== d.id));
    s.lives -= 1;
    s.streak = 0;
    s.misses += 1;
    if (!s.missed.includes(d.word)) s.missed.push(d.word);
    setLives(s.lives);
    setStreak(0);
    setShake((n) => n + 1);
    if (s.lives <= 0) finish();
  }

  function finish() {
    const s = g.current;
    s.phase = "over";
    setPhase("over");
    void speech.stop();
    later(() => {
      const total = s.score + s.misses;
      onDone({
        score: s.score,
        unit: "từ đã phá",
        record: s.score,
        stats: [
          { label: "đạt được", value: `Cấp ${levelOf(s.score)}` },
          { label: "chuỗi dài nhất", value: `🔥 ${s.bestStreak}` },
          { label: "chính xác", value: total ? `${Math.round((s.score / total) * 100)}%` : "–" },
        ],
        missed: s.missed,
        missedTitle: `Ôn lại ${s.missed.length} từ bị rơi`,
      });
    }, 900);
  }

  function spawn() {
    const level = levelOf(g.current.score);
    const live = dropsRef.current.filter((d) => d.popTop === undefined);
    if (live.length >= maxOnScreen(level)) return;
    const onScreen = new Set(live.map((d) => d.word));
    let pool = words.filter((w) => !onScreen.has(w) && w !== g.current.last);
    if (!pool.length) pool = words.filter((w) => !onScreen.has(w));
    if (!pool.length) return;
    const [word] = pick(pool, 1);
    g.current.last = word;
    const width = stage.current?.clientWidth || 340;
    const pct = Math.min(90, ((word.length * 8.6 + 30) / width) * 100);
    const x = between(2, 2 + Math.max(0, 96 - pct));
    setAll([...dropsRef.current, { id: g.current.nextId++, word, x, dur: fallSeconds(level) }]);
  }

  // Spawning loop.
  useEffect(() => {
    if (phase !== "play" || paused) return;
    let t = 0;
    const tick = () => {
      spawn();
      t = window.setTimeout(tick, spawnEvery(levelOf(g.current.score)));
    };
    t = window.setTimeout(tick, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused]);

  // Leaving the tab pauses the game.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && g.current.phase === "play") {
        g.current.paused = true;
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  function begin() {
    g.current = { phase: "count", paused: false, score: 0, lives: LIVES, streak: 0, bestStreak: 0, misses: 0, missed: [], last: "", nextId: 1 };
    consumed.current.clear();
    setAll([]);
    setFloaters([]);
    setScore(0);
    setLives(LIVES);
    setStreak(0);
    setPaused(false);
    setPhase("count");
    speech.start();
    runCountdown(() => {
      g.current.phase = "play";
      setPhase("play");
    });
  }

  const togglePause = () => {
    g.current.paused = !paused;
    setPaused(!paused);
  };

  if (phase === "intro" || (speech.error && phase !== "over")) {
    return (
      <GameFrame game="fall" onExit={onExit}>
        <Intro
          game="fall"
          rules={[
            "Các từ của chủ đề rơi từ trên xuống.",
            "Đọc to một từ để phá nó trước khi chạm đất. Thấy từ nào đọc từ đó!",
            "Để rơi 3 từ là thua. Cứ 5 từ lên một cấp, từ rơi nhanh hơn.",
          ]}
          onStart={begin}
          note={speech.error && <MicBar listening={false} heard="" error={speech.error} />}
        />
      </GameFrame>
    );
  }

  const level = levelOf(score);
  return (
    <GameFrame
      game="fall"
      onExit={onExit}
      right={
        <button
          type="button"
          onClick={togglePause}
          disabled={phase !== "play"}
          aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
          className="press flex h-9 cursor-pointer items-center rounded-full bg-chip px-3 text-xs font-bold hover:bg-line disabled:opacity-40"
        >
          {paused ? "▶" : "❚❚"} Cấp {level}
        </button>
      }
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <Hearts left={lives} shake={shake} />
        <span className="text-[26px] font-extrabold tracking-[-0.5px]">{score}</span>
        <span className={streak >= 2 ? "pop-in" : "opacity-0"}>
          <Chip tone="sand">🔥 x{streak}</Chip>
        </span>
      </div>

      <div
        ref={stage}
        className={`relative flex-1 overflow-hidden bg-linear-to-b from-[#eef6fc] to-sky ${paused ? "game-paused" : ""}`}
      >
        {drops.map((d) => (
          <div
            key={d.id}
            ref={(el) => {
              if (el) els.current.set(d.id, el);
              else els.current.delete(d.id);
            }}
            onAnimationEnd={(e) => e.animationName === "game-fall" && miss(d)}
            className={`absolute rounded-full px-3.5 py-2 text-[15px] font-bold whitespace-nowrap shadow-[0_3px_10px_#1f4a6626] ${
              d.popTop === undefined ? "game-fall bg-white" : "game-pop bg-good-bg text-good"
            }`}
            style={d.popTop === undefined ? { left: `${d.x}%`, animationDuration: `${d.dur}s` } : { left: `${d.x}%`, top: d.popTop }}
          >
            {d.word}
          </div>
        ))}
        {floaters.map((f) => (
          <span
            key={f.id}
            className={`float-up pointer-events-none absolute font-extrabold ${f.big ? "-translate-x-1/2 text-2xl text-brand" : "text-[15px] text-good"}`}
            style={{ left: `${f.big ? f.x : Math.min(f.x + 6, 80)}%`, top: f.y - 6 }}
          >
            {f.text}
          </span>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-[26px] border-t-2 border-dashed border-[#e0624a88] bg-[repeating-linear-gradient(45deg,#e0624a33_0_8px,#e0624a1a_8px_16px)]" />
        {count !== null && <Countdown n={count} />}
        {paused && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
            <span className="text-xl font-extrabold">Tạm dừng ⏸</span>
            <button type="button" onClick={togglePause} className="press min-h-11 cursor-pointer rounded-2xl bg-brand px-6 font-bold text-white">
              Chơi tiếp
            </button>
          </div>
        )}
      </div>

      <MicBar listening={speech.listening} heard={speech.heard} error={speech.error} />
    </GameFrame>
  );
}
