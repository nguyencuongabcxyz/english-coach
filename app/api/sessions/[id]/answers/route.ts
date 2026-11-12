import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/data";
import { evaluateAnswer, transcribe } from "@/lib/ai";
import { saveAudio } from "@/lib/storage";
import type { AnswerRow } from "@/lib/types";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB bodies

export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/answers">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user || user.role !== "student") return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const session = await getSession(id);
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: "Không tìm thấy buổi luyện." }, { status: 404 });
  }
  if (session.status !== "in_progress") {
    return NextResponse.json({ error: "Buổi luyện đã kết thúc." }, { status: 409 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  const idx = Number(form.get("idx"));
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "Không nhận được bản ghi âm." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Bản ghi quá dài. Hãy nói trong khoảng 30–90 giây." }, { status: 413 });
  }
  const question = session.questions[idx];
  if (!question) return NextResponse.json({ error: "Câu hỏi không hợp lệ." }, { status: 400 });

  try {
    const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
    const { text, metrics } = await transcribe(audio, `answer.${ext}`);
    const clientDuration = Number(form.get("duration"));
    if (!metrics.durationSec && clientDuration > 0) {
      metrics.durationSec = Math.round(clientDuration * 10) / 10;
      metrics.wpm = Math.round(metrics.words / Math.max(clientDuration / 60, 1 / 60));
    }
    if (!text || metrics.words < 2) {
      return NextResponse.json(
        { error: "AI chưa nghe rõ câu trả lời. Hãy kiểm tra micro và nói to, rõ hơn nhé." },
        { status: 422 },
      );
    }
    if (repeatsQuestion(text, question.q)) {
      return NextResponse.json(
        {
          error:
            "Có vẻ bạn đang đọc lại câu hỏi (hoặc micro thu tiếng loa). Hãy trả lời câu hỏi bằng ý của bạn nhé! Nếu dùng loa, hãy đeo tai nghe.",
          code: "repeated_question",
        },
        { status: 422 },
      );
    }
    const evaluation = await evaluateAnswer({
      question: question.q,
      transcript: text,
      metrics,
      focus: session.focus_skill,
      instruction: session.instruction,
      keywords: session.kind === "activity" || session.instruction ? session.vocab : [],
    });
    const answerId = crypto.randomUUID();
    const audioRef = await saveAudio(answerId, audio).catch((e) => {
      console.error("saveAudio failed", e);
      return null;
    });
    // One answer per question: re-recording replaces the previous attempt.
    await sql(`DELETE FROM answers WHERE session_id = $1 AND idx = $2`, [session.id, idx]);
    const [row] = await sql<AnswerRow>(
      `INSERT INTO answers (id, session_id, idx, question, transcript, audio_url, duration_sec, metrics, evaluation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [answerId, session.id, idx, question.q, text, audioRef, metrics.durationSec, JSON.stringify(metrics), JSON.stringify(evaluation)],
    );
    await sql(`UPDATE users SET last_active_at = now() WHERE id = $1`, [user.id]);
    return NextResponse.json({ answer: row });
  } catch (e) {
    console.error("answer processing failed", e);
    const msg = e instanceof Error && /api key|401|Incorrect API key/i.test(e.message)
      ? "Khoá OpenAI API không hợp lệ. Liên hệ quản trị viên."
      : "AI đang bận, vui lòng thử lại sau ít phút.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** True when the transcript is (almost) only the question read aloud, e.g. mic picking up the speaker. */
function repeatsQuestion(transcript: string, question: string) {
  const t = words(transcript);
  const q = words(question);
  if (!t.length || !q.length) return false;
  const qSet = new Set(q);
  const overlap = t.filter((w) => qSet.has(w)).length / t.length; // share of the answer taken from the question
  const covered = q.filter((w) => t.includes(w)).length / q.length; // share of the question that was read
  const extra = t.length - q.length;
  return covered >= 0.8 && overlap >= 0.8 && extra <= 4;
}
