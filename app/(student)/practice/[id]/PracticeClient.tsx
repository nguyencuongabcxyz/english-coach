"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { finishSession } from "@/app/actions/practice";
import { Icon, ICON } from "@/components/icons";
import { btn } from "@/components/ui";
import { level, SKILL_SHORT_VI, SKILLS } from "@/lib/skills";
import type { AnswerEvaluation } from "@/lib/types";
import { RecordingPlayer } from "@/components/RecordingPlayer";

function doneTitle(avg: number | null, isLast: boolean) {
  if (avg != null && avg < 5) return "Câu trả lời chưa đạt, thử lại nhé! 💪";
  if (isLast) return "Bạn đã trả lời xong các câu hỏi!";
  if (avg != null && avg < 7) return "Khá rồi! Sẵn sàng cho câu tiếp theo?";
  return "Tốt lắm! Sẵn sàng cho câu tiếp theo?";
}

type Answer = {
  id: string;
  idx: number;
  transcript: string;
  durationSec: number | null;
  hasAudio: boolean;
  evaluation: AnswerEvaluation | null;
};

type Props = {
  session: {
    id: string;
    title: string;
    kind: "topic" | "activity";
    instruction: string | null;
    questions: { q: string; hint: string }[];
    tips: string[];
    vocab: string[];
    focus: string | null;
  };
  initialAnswers: Answer[];
  initials: string;
  demo: boolean;
};

type Phase = "idle" | "rec" | "recorded" | "processing" | "done";

const MAX_SECONDS = 90;

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function PracticeClient({ session, initialAnswers, initials, demo }: Props) {
  const total = session.questions.length;
  const [answers, setAnswers] = useState<Record<number, Answer>>(() =>
    Object.fromEntries(initialAnswers.map((a) => [a.idx, a])),
  );
  const firstOpen = session.questions.findIndex((_, i) => !initialAnswers.some((a) => a.idx === i));
  const [idx, setIdx] = useState(firstOpen === -1 ? total - 1 : firstOpen);
  const [phase, setPhase] = useState<Phase>(answers[idx] ? "done" : "idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(9).fill(0.2));
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [blob, setBlob] = useState<{ data: Blob; url: string; duration: number } | null>(null);
  const [finishing, startFinish] = useTransition();

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const question = session.questions[idx];
  const answer = answers[idx];
  const answeredCount = Object.keys(answers).length;

  const cleanup = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    timerRef.current = rafRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speak(rate = 0.95) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(question.q);
    u.lang = "en-US";
    u.rate = rate;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  async function startRecording() {
    setError(null);
    window.speechSynthesis?.cancel();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Trình duyệt chưa hỗ trợ ghi âm. Hãy dùng Chrome, Edge hoặc Safari bản mới.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const duration = (Date.now() - startedAtRef.current) / 1000;
        const data = new Blob(chunksRef.current, { type: rec.mimeType || mime || "audio/webm" });
        cleanup();
        if (duration < 1.5) {
          setPhase("idle");
          setError("Bản ghi quá ngắn. Hãy nói ít nhất vài câu nhé.");
          return;
        }
        setBlob({ data, url: URL.createObjectURL(data), duration });
        setPhase("recorded");
      };
      recRef.current = rec;
      rec.start(250);
      startedAtRef.current = Date.now();
      setSeconds(0);
      setPhase("rec");
      timerRef.current = window.setInterval(() => {
        const s = (Date.now() - startedAtRef.current) / 1000;
        setSeconds(s);
        if (s >= MAX_SECONDS) stopRecording();
      }, 250);

      // Live level meter
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(buf);
        const bars = Array.from({ length: 9 }, (_, i) => {
          const v = buf[2 + i * 2] / 255;
          return Math.max(0.15, Math.min(1, v * 1.4));
        });
        setLevels(bars);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      cleanup();
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Bạn chưa cho phép dùng micro. Hãy bật quyền micro cho trang này trong trình duyệt."
          : name === "NotFoundError"
            ? "Không tìm thấy micro. Hãy kết nối tai nghe hoặc micro."
            : "Không thể bắt đầu ghi âm. Hãy thử lại.",
      );
    }
  }

  function stopRecording() {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  function resetRecording() {
    if (blob) URL.revokeObjectURL(blob.url);
    setBlob(null);
    setError(null);
    setPhase("idle");
  }

  async function submit() {
    if (!blob) return;
    setPhase("processing");
    setError(null);
    const fd = new FormData();
    const ext = blob.data.type.includes("mp4") ? "m4a" : blob.data.type.includes("ogg") ? "ogg" : "webm";
    fd.append("audio", blob.data, `answer.${ext}`);
    fd.append("idx", String(idx));
    fd.append("duration", String(blob.duration));
    try {
      const res = await fetch(`/api/sessions/${session.id}/answers`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Có lỗi xảy ra, vui lòng thử lại.");
      const a = json.answer;
      setAnswers((prev) => ({
        ...prev,
        [idx]: {
          id: a.id,
          idx,
          transcript: a.transcript,
          durationSec: a.duration_sec,
          hasAudio: Boolean(a.audio_url),
          evaluation: a.evaluation,
        },
      }));
      URL.revokeObjectURL(blob.url);
      setBlob(null);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
      setPhase("recorded");
    }
  }

  function goTo(i: number) {
    if (phase === "rec" || phase === "processing") return;
    if (blob) URL.revokeObjectURL(blob.url);
    setBlob(null);
    setError(null);
    setShowHint(false);
    setIdx(i);
    setPhase(answers[i] ? "done" : "idle");
  }

  const nextOpen = session.questions.findIndex((_, i) => i !== idx && !answers[i]);
  const answerAvg = answer?.evaluation
    ? SKILLS.reduce((sum, k) => sum + answer.evaluation!.scores[k], 0) / SKILLS.length
    : null;
  const isLast = answeredCount >= total || nextOpen === -1;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 pt-3 pb-5 sm:px-9">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 text-[24px] font-bold tracking-[-0.5px] sm:text-[30px]">{session.title}</h1>
          <p className="m-0 text-sm text-muted sm:text-[15px]">
            Nghe câu hỏi, sau đó bấm Bắt đầu nói và trả lời bằng tiếng Anh.
          </p>
        </div>
        <div className="flex w-full min-w-[220px] flex-col gap-2 sm:w-auto">
          <span className="text-[13px] text-muted">
            Câu <strong className="text-ink">{idx + 1}</strong> / {total}
            {answeredCount > 0 && <> · đã trả lời {answeredCount}</>}
          </span>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
            {session.questions.map((_, i) => (
              <button
                key={i}
                aria-label={`Câu ${i + 1}${answers[i] ? " (đã trả lời)" : ""}`}
                onClick={() => goTo(i)}
                className={`h-1.5 cursor-pointer rounded-full ${
                  answers[i] ? "bg-brand" : i === idx ? "bg-muted" : "bg-canvas"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5 px-5 pt-6 pb-8 sm:px-9">
        <section aria-label="Hội thoại" className="flex min-w-0 flex-[999_1_480px] flex-col gap-[18px]">
          {session.instruction && (
            <div className="flex gap-2.5 rounded-2xl border border-lilac-deep bg-lilac-soft px-4 py-3 text-[13px] leading-normal text-lilac-ink">
              <Icon d={ICON.info} size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>Nhiệm vụ:</strong> {session.instruction}
              </span>
            </div>
          )}

          {/* AI question bubble */}
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold text-white">AI</span>
            <div className="flex max-w-[560px] flex-col gap-3 rounded-[4px_20px_20px_20px] bg-lilac px-5 py-[18px]">
              <span className="text-[18px] leading-[1.4] font-semibold sm:text-[20px]">{question.q}</span>
              {showHint && question.hint && <span className="text-sm text-lilac-ink">{question.hint}</span>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => speak(0.95)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold hover:bg-soft">
                  <Icon d={ICON.speaker} size={14} width={2} /> Nghe lại
                </button>
                <button onClick={() => speak(0.7)} className="inline-flex min-h-9 cursor-pointer items-center rounded-full bg-white px-3.5 text-[13px] font-semibold hover:bg-soft">
                  Chậm hơn
                </button>
                {question.hint && (
                  <button
                    onClick={() => setShowHint((v) => !v)}
                    aria-pressed={showHint}
                    className="inline-flex min-h-9 cursor-pointer items-center rounded-full bg-white px-3.5 text-[13px] font-semibold hover:bg-soft"
                  >
                    {showHint ? "Ẩn gợi ý" : "Gợi ý tiếng Việt"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Student answer bubble */}
          {answer && phase === "done" && (
            <div className="flex items-start justify-end gap-3">
              <div className="flex max-w-[560px] flex-col gap-2.5 rounded-[20px_4px_20px_20px] bg-soft px-5 py-[18px]">
                <span className="text-xs font-bold text-muted">
                  Câu trả lời của bạn{answer.durationSec ? ` · ${fmtTime(answer.durationSec)}` : ""} · đã chuyển thành văn bản
                </span>
                <span className="text-base leading-relaxed">{answer.transcript}</span>
                {answer.hasAudio && (
                  <RecordingPlayer src={`/api/audio/${answer.id}`} className="h-9 w-full max-w-[320px]" />
                )}
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lilac text-[13px] font-bold">{initials}</span>
            </div>
          )}

          {/* Quick per-answer feedback */}
          {answer?.evaluation && phase === "done" && <QuickFeedback ev={answer.evaluation} />}

          {/* Recorder panel */}
          <div className="flex flex-col items-center gap-3.5 rounded-[22px] border border-line px-5 py-7 text-center">
            {phase === "idle" && (
              <>
                <button
                  onClick={startRecording}
                  aria-label="Bắt đầu nói"
                  className="flex size-24 cursor-pointer items-center justify-center rounded-full bg-brand text-white transition-transform duration-200 ease-spring hover:scale-105 active:scale-95"
                >
                  <Icon d={ICON.mic} size={36} />
                </button>
                <span className="text-lg font-bold">Bắt đầu nói</span>
                <span className="text-[13px] text-muted">Nên nói 30–60 giây. Bạn có thể ghi âm lại trước khi gửi.</span>
              </>
            )}

            {phase === "rec" && (
              <>
                <button
                  onClick={stopRecording}
                  aria-label="Dừng ghi âm"
                  className="box-border flex size-24 cursor-pointer items-center justify-center rounded-full border-8 border-bad-bg bg-rec"
                >
                  <span className="size-[26px] rounded-md bg-white" />
                </button>
                <div aria-hidden="true" className="flex h-9 items-center gap-1">
                  {levels.map((l, i) => (
                    <span key={i} className="w-1 rounded bg-brand transition-[height] duration-75" style={{ height: `${Math.round(8 + l * 28)}px` }} />
                  ))}
                </div>
                <span className="text-lg font-bold" aria-live="polite">
                  Đang nghe… {fmtTime(seconds)}
                </span>
                <span className="text-[13px] text-muted">
                  Bấm để dừng khi bạn nói xong. Tối đa {MAX_SECONDS} giây.
                </span>
              </>
            )}

            {phase === "recorded" && blob && (
              <>
                <span className="text-lg font-bold">Đã ghi âm câu trả lời · {fmtTime(blob.duration)}</span>
                <RecordingPlayer src={blob.url} className="h-10 w-full max-w-[360px]" />
                <span className="text-[13px] text-muted">
                  AI sẽ đánh giá phát âm, độ trôi chảy, từ vựng, ngữ pháp và nội dung.
                </span>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button onClick={resetRecording} className={btn.light}>
                    Ghi âm lại
                  </button>
                  <button onClick={submit} className={btn.dark}>
                    Nhận phản hồi từ AI
                  </button>
                </div>
              </>
            )}

            {phase === "processing" && (
              <>
                <span className="spin size-12 rounded-full border-4 border-lilac border-t-ink" aria-hidden="true" />
                <span className="text-lg font-bold" aria-live="polite">
                  AI đang phân tích câu trả lời…
                </span>
                <span className="text-[13px] text-muted">Chuyển giọng nói thành văn bản và chấm theo 5 tiêu chí.</span>
              </>
            )}

            {phase === "done" && (
              <>
                <span className="text-lg font-bold">{doneTitle(answerAvg, isLast)}</span>
                {answerAvg != null && answerAvg < 5 && (
                  <span className="max-w-md text-[13px] text-muted">
                    Hãy trả lời đúng câu hỏi bằng 2–3 câu: nói bạn làm gì, vì sao, và một ví dụ.
                  </span>
                )}
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button onClick={() => setPhase("idle")} className={answerAvg != null && answerAvg < 5 ? btn.dark : btn.light}>
                    Trả lời lại câu này
                  </button>
                  {!isLast && (
                    <button onClick={() => goTo(nextOpen)} className={answerAvg != null && answerAvg < 5 ? btn.light : btn.dark}>
                      Câu tiếp theo <Icon d={ICON.chevronRight} size={16} width={2} />
                    </button>
                  )}
                  {isLast && (
                    <button disabled={finishing} onClick={() => startFinish(() => finishSession(session.id))} className={btn.dark}>
                      {finishing ? "Đang tổng hợp phản hồi…" : "Xem phản hồi tổng hợp"}
                    </button>
                  )}
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="m-0 rounded-xl bg-bad-bg px-3.5 py-2.5 text-[13px] font-medium text-bad">
                {error}
              </p>
            )}
          </div>

          {answeredCount > 0 && !isLast && phase !== "rec" && phase !== "processing" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft px-4 py-3">
              <span className="text-[13px] text-muted">
                Đã trả lời {answeredCount}/{total} câu. Bạn có thể kết thúc sớm để xem phản hồi.
              </span>
              <button
                disabled={finishing}
                onClick={() => startFinish(() => finishSession(session.id))}
                className="cursor-pointer text-[13px] font-semibold text-link hover:underline disabled:opacity-50"
              >
                {finishing ? "Đang tổng hợp…" : "Kết thúc & xem phản hồi"}
              </button>
            </div>
          )}
          {demo && (
            <p className="m-0 text-xs text-muted">
              Chế độ demo: chưa cấu hình khoá AI (OPENAI_API_KEY hoặc GROQ_API_KEY) nên kết quả AI là mô phỏng.
            </p>
          )}
        </section>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
          <section className="overflow-hidden rounded-[20px] bg-sand">
            <div className="flex flex-col gap-3 p-[18px]">
              <h2 className="m-0 text-base font-bold">Mẹo trả lời</h2>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] leading-normal">
                {session.tips.map((t) => (
                  <li key={t} className="rounded-xl bg-white px-3 py-2.5">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-sand-deep px-[18px] py-2.5 text-xs font-semibold text-[#4A3208]">
              Trọng tâm hôm nay: {session.focus ?? "Trả lời đầy đủ, rõ ràng"}
            </div>
          </section>
          {session.vocab.length > 0 && (
          <section className="flex flex-col gap-3 rounded-[20px] border border-line p-[18px]">
            <h2 className="m-0 text-base font-bold">
              {session.kind === "activity" || session.instruction ? "Từ cần dùng" : "Từ vựng hữu ích"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {session.vocab.map((v) => (
                <span key={v} className="rounded-full bg-soft px-3 py-2 text-[13px] font-semibold">
                  {v}
                </span>
              ))}
            </div>
          </section>
          )}
          <p className="m-0 px-1 text-xs leading-normal text-muted">
            Bản ghi âm được lưu vào hồ sơ luyện tập để giáo viên có thể xem lại.
          </p>
        </aside>
      </div>
    </>
  );
}

function QuickFeedback({ ev }: { ev: AnswerEvaluation }) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-line p-4">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {SKILLS.map((k) => {
          const l = level(ev.scores[k]);
          return (
            <div key={k} className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center" style={{ background: l.bg }}>
              <span className="text-[16px] font-extrabold sm:text-lg" style={{ color: l.fg }}>
                {ev.scores[k].toFixed(1)}
              </span>
              <span className="text-[10px] font-semibold sm:text-[11px]" style={{ color: l.fg }}>
                {SKILL_SHORT_VI[k]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid gap-2 text-[13px] sm:grid-cols-2">
        {ev.strengths[0] && (
          <span className="flex items-center gap-2 rounded-xl bg-good-bg px-3 py-2 text-good">
            <Icon d={ICON.check} size={14} width={2.6} /> {ev.strengths[0]}
          </span>
        )}
        {ev.improvements[0] && (
          <span className="flex items-center gap-2 rounded-xl bg-bad-bg px-3 py-2 text-bad">
            <Icon d={ICON.alert} size={14} width={2.4} /> {ev.improvements[0]}
          </span>
        )}
      </div>
    </div>
  );
}
