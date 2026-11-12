import "server-only";
import OpenAI, { toFile } from "openai";
import { activityFor, SKILL_EN, SKILLS, weakestSkill, type Skill } from "./skills";
import type { AnswerEvaluation, SessionSummary, SpeechMetrics } from "./types";

/**
 * AI processing (Module 3 + 4):
 *  1. Speech-to-text with word timestamps (whisper-1) → transcript + fluency metrics.
 *  2. ChatGPT scores the answer on 5 criteria and writes short, actionable feedback.
 * Without OPENAI_API_KEY the app runs in demo mode with simulated results.
 */

export const aiEnabled = () => Boolean(process.env.OPENAI_API_KEY);
const MODEL = () => process.env.OPENAI_MODEL || "gpt-5.4-mini";
const STT_MODEL = () => process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

const FILLERS = new Set(["um", "uh", "er", "erm", "ah", "hmm", "mm", "eh"]);

export async function transcribe(
  audio: Blob,
  filename: string,
): Promise<{ text: string; metrics: SpeechMetrics }> {
  if (!aiEnabled()) {
    return {
      text: "I usually spend time with my family at weekends. We often have dinner together and watch movies.",
      metrics: { durationSec: 24, words: 19, wpm: 104, longPauses: [{ after: "weekends", seconds: 2.1 }], fillers: 0, confidence: 0.86 },
    };
  }
  const file = await toFile(audio, filename, { type: audio.type || "audio/webm" });
  const model = STT_MODEL();
  if (model !== "whisper-1") {
    const r = await openai().audio.transcriptions.create({ file, model, language: "en", response_format: "json" });
    const text = r.text.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    return { text, metrics: { durationSec: 0, words, wpm: 0, longPauses: [], fillers: 0, confidence: null } };
  }
  const r = await openai().audio.transcriptions.create({
    file,
    model,
    language: "en",
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
    // Ask Whisper to keep hesitations so fluency can be measured.
    prompt: "Umm, let me think, like, hmm... Okay, here's what I, uh, think.",
  });
  const words = r.words ?? [];
  const duration = r.duration ?? (words.length ? words[words.length - 1].end : 0);
  const longPauses: SpeechMetrics["longPauses"] = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= 1.2) longPauses.push({ after: words[i - 1].word, seconds: Math.round(gap * 10) / 10 });
  }
  const fillers = words.filter((w) => FILLERS.has(w.word.toLowerCase().replace(/[^a-z]/g, ""))).length;
  const segs = r.segments ?? [];
  const avgLogprob = segs.length ? segs.reduce((a, s) => a + s.avg_logprob, 0) / segs.length : null;
  const speakingMinutes = Math.max(duration, 1) / 60;
  return {
    text: r.text.trim(),
    metrics: {
      durationSec: Math.round(duration * 10) / 10,
      words: words.length,
      wpm: Math.round(words.length / speakingMinutes),
      longPauses,
      fillers,
      confidence: avgLogprob == null ? null : Math.round(Math.exp(avgLogprob) * 100) / 100,
      timings: words.map((w) => ({ w: w.word, s: Math.round(w.start * 100) / 100, e: Math.round(w.end * 100) / 100 })),
    },
  };
}

const scoreProps = Object.fromEntries(SKILLS.map((k) => [k, { type: "number" }]));
const noteProps = Object.fromEntries(SKILLS.map((k) => [k, { type: "string" }]));

const EVAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "notes", "strengths", "improvements", "grammarFixes", "pronunciationWords", "contentTip"],
  properties: {
    scores: { type: "object", additionalProperties: false, required: [...SKILLS], properties: scoreProps },
    notes: { type: "object", additionalProperties: false, required: [...SKILLS], properties: noteProps },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    grammarFixes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "corrected", "explain"],
        properties: { original: { type: "string" }, corrected: { type: "string" }, explain: { type: "string" } },
      },
    },
    pronunciationWords: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "ipa"],
        properties: { word: { type: "string" }, ipa: { type: "string" } },
      },
    },
    contentTip: { type: "string" },
  },
} as const;

const SYSTEM_EVAL = `You are an encouraging English speaking coach for Vietnamese upper-secondary (THPT) students, level A2–B1.
Score ONE spoken answer on a 0–10 scale (one decimal, use .0 or .5 steps) for each criterion:
- pronunciation: judged from speech-recognition confidence and words that look mis-recognised versus what the student probably meant. Be cautious: this is an estimate.
- fluency: use the measured metrics (words per minute ~100–140 is natural for this level, long pauses ≥1.2s, filler words, answer length).
- vocabulary: appropriateness and range of words for the topic.
- grammar: detect real errors and give corrections.
- content: how well the answer addresses the question and develops ideas (reasons, examples).
A very short or off-topic answer must get low content and fluency scores.
Feedback must be short, easy to understand and actionable:
- strengths: 1–3 short English sentences (e.g. "Good vocabulary.").
- improvements: 1–3 short English sentences (e.g. "Use linking words to connect your ideas.").
- notes: one short Vietnamese phrase per criterion (max 8 words).
- grammarFixes: only real mistakes, explain in Vietnamese (one sentence). Empty array if none.
- pronunciationWords: up to 3 words from the answer worth practising, with British IPA.
- contentTip: one Vietnamese sentence telling how to develop the answer.`;

export async function evaluateAnswer(input: {
  question: string;
  transcript: string;
  metrics: SpeechMetrics;
  focus?: string | null;
  instruction?: string | null;
  keywords?: string[];
}): Promise<AnswerEvaluation> {
  if (!aiEnabled()) return demoEvaluation(input.transcript);
  const user = [
    `Question: ${input.question}`,
    input.instruction ? `Task instruction: ${input.instruction}` : "",
    input.keywords?.length ? `Words the student was asked to use: ${input.keywords.join(", ")}` : "",
    `Transcript: """${input.transcript || "(no speech detected)"}"""`,
    `Metrics: duration ${input.metrics.durationSec}s, ${input.metrics.words} words, ${input.metrics.wpm} wpm, ` +
      `long pauses: ${input.metrics.longPauses.map((p) => `${p.seconds}s after "${p.after}"`).join("; ") || "none"}, ` +
      `filler words: ${input.metrics.fillers}, recogniser confidence: ${input.metrics.confidence ?? "unknown"}`,
  ]
    .filter(Boolean)
    .join("\n");
  const data = await chatJSON<AnswerEvaluation>(SYSTEM_EVAL, user, "answer_evaluation", EVAL_SCHEMA);
  for (const k of SKILLS) data.scores[k] = clampScore(data.scores[k]);
  return data;
}

const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "strengths", "improvements", "practiceInstruction", "practiceKeywords"],
  properties: {
    headline: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    practiceInstruction: { type: "string" },
    practiceKeywords: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM_SUMMARY = `You are an English speaking coach for Vietnamese THPT students.
Summarise a practice session made of several answers. Output:
- headline: one short Vietnamese sentence (max 12 words) praising one thing and naming the main thing to improve.
- strengths: exactly 3 short English sentences.
- improvements: exactly 3 short English sentences, the most useful first.
- practiceInstruction: one Vietnamese sentence asking the student to answer again with a concrete technique (end with a colon if keywords follow).
- practiceKeywords: 3 English words/phrases to use (e.g. linking words or topic vocabulary).`;

export async function summarizeSession(input: {
  title: string;
  topicId: string;
  topicTitle: string;
  vocab: string[];
  avg: Record<Skill, number>;
  answers: { question: string; transcript: string; evaluation: AnswerEvaluation | null }[];
}): Promise<SessionSummary> {
  const weakest = weakestSkill(input.avg);
  const nextActivity = activityFor(weakest, input.topicId, input.topicTitle, input.vocab);
  if (!aiEnabled()) {
    return {
      headline: "Câu trả lời rõ ràng. Giờ hãy nói trôi chảy hơn.",
      strengths: ["Good vocabulary.", "Your ideas are clear.", "You answered the question directly."],
      improvements: [
        "Try to speak more smoothly.",
        "Pay attention to the pronunciation of some words.",
        "Use linking words to connect your ideas.",
      ],
      practice: { instruction: "Hãy trả lời lại câu hỏi và dùng 3 từ nối sau:", keywords: ["because", "however", "therefore"] },
      nextActivity,
      demo: true,
    };
  }
  const user = [
    `Session: ${input.title}`,
    `Average scores: ${SKILLS.map((k) => `${SKILL_EN[k]} ${input.avg[k]}`).join(", ")}`,
    `Weakest skill: ${SKILL_EN[weakest]}`,
    ...input.answers.map(
      (a, i) =>
        `Answer ${i + 1} — Q: ${a.question}\nTranscript: ${a.transcript}\nNotes: ${a.evaluation ? JSON.stringify(a.evaluation.improvements) : "-"}`,
    ),
  ].join("\n");
  const s = await chatJSON<{
    headline: string;
    strengths: string[];
    improvements: string[];
    practiceInstruction: string;
    practiceKeywords: string[];
  }>(SYSTEM_SUMMARY, user, "session_summary", SUMMARY_SCHEMA);
  return {
    headline: s.headline,
    strengths: s.strengths.slice(0, 3),
    improvements: s.improvements.slice(0, 3),
    practice: { instruction: s.practiceInstruction, keywords: s.practiceKeywords.slice(0, 3) },
    nextActivity,
  };
}

async function chatJSON<T>(system: string, user: string, name: string, schema: object): Promise<T> {
  const model = MODEL();
  const reasoning = /^(gpt-5|o\d)/.test(model) ? { reasoning_effort: "low" as const } : {};
  const r = await openai().chat.completions.create({
    model,
    ...reasoning,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema: schema as Record<string, unknown> } },
  });
  const content = r.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return JSON.parse(content) as T;
}

const clampScore = (v: number) => Math.max(0, Math.min(10, Math.round((Number(v) || 0) * 2) / 2));

/** Simulated evaluation for demo mode (no API key). */
function demoEvaluation(transcript: string): AnswerEvaluation {
  const words = transcript.split(/\s+/).filter(Boolean).length;
  const base = Math.min(8.5, 5.5 + words / 12);
  const s: Record<Skill, number> = {
    pronunciation: clampScore(base),
    fluency: clampScore(base - 1.5),
    vocabulary: clampScore(base + 0.5),
    grammar: clampScore(base - 0.5),
    content: clampScore(base + 1),
  };
  return {
    scores: s,
    notes: {
      pronunciation: "Phần lớn rõ ràng; chú ý 2 từ.",
      fluency: "Có 1 lần ngập ngừng lâu.",
      vocabulary: "Dùng từ phù hợp, tự nhiên.",
      grammar: "Chính xác; thử dùng câu dài hơn.",
      content: "Trả lời đúng trọng tâm câu hỏi.",
    },
    strengths: ["Good vocabulary.", "Your ideas are clear."],
    improvements: ["Try to speak more smoothly.", "Use linking words to connect your ideas."],
    grammarFixes: [],
    pronunciationWords: [
      { word: "weekends", ipa: "/ˌwiːkˈendz/" },
      { word: "together", ipa: "/təˈɡeðə(r)/" },
    ],
    contentTip: "Thêm lý do hoặc ví dụ để phát triển ý.",
    demo: true,
  };
}
