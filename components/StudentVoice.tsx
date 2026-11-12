"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, ICON } from "./icons";

type Timing = { w: string; s: number; e: number };
type Segment = { text: string; from: number; to: number };

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Split the transcript into sentences and find where each one starts/ends in the recording.
 * Uses Whisper word timings when available, otherwise spreads sentences over the duration
 * in proportion to their word count (approximate).
 */
function buildSegments(transcript: string, duration: number, timings?: Timing[]): Segment[] {
  const sentences = transcript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const counts = sentences.map((s) => s.split(/\s+/).filter((w) => norm(w)).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  if (timings?.length) {
    const words = timings.filter((t) => norm(t.w));
    let i = 0;
    const segs: Segment[] = [];
    for (let k = 0; k < sentences.length; k++) {
      const first = words[Math.min(i, words.length - 1)];
      const lastIdx = Math.min(i + counts[k] - 1, words.length - 1);
      const last = words[lastIdx];
      if (!first || !last) break;
      segs.push({ text: sentences[k], from: Math.max(0, first.s - 0.15), to: last.e + 0.25 });
      i = lastIdx + 1;
    }
    if (segs.length === sentences.length) return segs;
  }

  let acc = 0;
  return sentences.map((text, k) => {
    const from = (acc / total) * duration;
    acc += counts[k];
    return { text, from, to: (acc / total) * duration };
  });
}

export function StudentVoice({
  src,
  transcript,
  duration: hintDuration,
  timings,
}: {
  src: string;
  transcript: string;
  duration?: number | null;
  timings?: Timing[];
}) {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const playRef = useRef<{ from: number; to: number; at: number; rate: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [duration, setDuration] = useState(hintDuration ?? 0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState<number | "all" | null>(null);
  const [rate, setRate] = useState(1);

  const segments = useMemo(
    () => buildSegments(transcript, duration || hintDuration || 0, timings),
    [transcript, duration, hintDuration, timings],
  );

  useEffect(
    () => () => {
      srcRef.current?.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  async function ensureBuffer() {
    if (bufRef.current) return bufRef.current;
    setStatus("loading");
    try {
      const ctx = (ctxRef.current ??= new AudioContext());
      const data = await (await fetch(src)).arrayBuffer();
      const buf = await ctx.decodeAudioData(data);
      bufRef.current = buf;
      setDuration(buf.duration);
      setStatus("idle");
      return buf;
    } catch {
      setStatus("error");
      return null;
    }
  }

  function stop() {
    if (srcRef.current) {
      srcRef.current.onended = null;
      try {
        srcRef.current.stop();
      } catch {}
    }
    srcRef.current = null;
    playRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(null);
  }

  async function play(from: number, to: number, which: number | "all") {
    if (playing === which) return stop();
    stop();
    const buf = await ensureBuffer();
    const ctx = ctxRef.current;
    if (!buf || !ctx) return;
    await ctx.resume();
    const end = Math.min(to, buf.duration);
    const start = Math.max(0, Math.min(from, end - 0.05));
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.playbackRate.value = rate;
    node.connect(ctx.destination);
    node.onended = () => {
      if (srcRef.current === node) {
        setPos(end);
        stop();
      }
    };
    node.start(0, start, end - start);
    srcRef.current = node;
    playRef.current = { from: start, to: end, at: ctx.currentTime, rate };
    setPlaying(which);
    const tick = () => {
      const p = playRef.current;
      if (!p || !ctxRef.current) return;
      setPos(Math.min(p.to, p.from + (ctxRef.current.currentTime - p.at) * p.rate));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  const total = duration || hintDuration || 0;
  const activeSeg = playing !== null ? segments.findIndex((s) => pos >= s.from && pos < s.to) : -1;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-lilac-deep bg-lilac-soft p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => play(0, total || 9999, "all")}
          aria-label={playing === "all" ? "Dừng" : "Nghe cả bài nói"}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-white hover:opacity-90"
        >
          {status === "loading" ? (
            <span className="spin size-4 rounded-full border-2 border-white border-t-transparent" />
          ) : playing === "all" ? (
            <span className="size-3.5 rounded-[3px] bg-white" />
          ) : (
            <Icon d={ICON.play} size={16} stroke="#fff" />
          )}
        </button>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-bold text-lilac-ink">
            Giọng học sinh · cả bài{total ? ` (${fmt(total)})` : ""}
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-1.5 rounded-full bg-brand transition-[width] duration-100"
              style={{ width: total ? `${Math.min(100, (pos / total) * 100)}%` : "0%" }}
            />
          </div>
        </div>
        <span className="text-xs text-muted tabular-nums">
          {fmt(pos)} / {total ? fmt(total) : "–"}
        </span>
        <div role="group" aria-label="Tốc độ nghe" className="flex rounded-full bg-white p-0.5">
          {[0.75, 1].map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={rate === r}
              onClick={() => {
                setRate(r);
                stop();
              }}
              className={`min-h-8 cursor-pointer rounded-full px-2.5 text-xs font-semibold ${
                rate === r ? "bg-brand text-white" : "text-ink"
              }`}
            >
              {r === 1 ? "1×" : "0.75×"}
            </button>
          ))}
        </div>
      </div>

      {segments.length > 1 && (
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {segments.map((seg, i) => {
            const on = playing === i || (playing === "all" && activeSeg === i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => play(seg.from, seg.to, i)}
                  className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    on ? "bg-brand text-white" : "bg-white hover:bg-soft"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      on ? "bg-white text-ink" : "bg-lilac text-lilac-ink"
                    }`}
                  >
                    {playing === i ? "■" : "▶"}
                  </span>
                  <span className="flex-1 leading-normal">{seg.text}</span>
                  <span className={`shrink-0 text-[11px] tabular-nums ${on ? "text-white/70" : "text-muted"}`}>
                    {fmt(seg.from)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {status === "error" && (
        <span className="text-xs font-medium text-bad">Không tải được bản ghi âm. Thử lại hoặc dùng trình duyệt khác.</span>
      )}
      {!timings?.length && segments.length > 1 && (
        <span className="text-[11px] text-muted">Vị trí từng câu được ước lượng theo độ dài câu.</span>
      )}
    </div>
  );
}
