import type { Activity, Scores, Skill } from "./skills";

export type Role = "student" | "teacher";

export type UserRow = {
  id: string;
  role: Role;
  login: string;
  name: string;
  class_id: string | null;
  password_hash: string | null;
  activation_code: string | null;
  activated: boolean;
  is_admin: boolean;
  reset_requested_at: string | null;
  last_active_at: string | null;
  created_at: string;
};

export type SpeechMetrics = {
  durationSec: number;
  words: number;
  wpm: number;
  longPauses: { after: string; seconds: number }[];
  fillers: number;
  confidence: number | null; // 0..1 from the speech recogniser, if available
  /** Word timings in seconds (from Whisper), used to replay single sentences. */
  timings?: { w: string; s: number; e: number }[];
};

export type AnswerEvaluation = {
  scores: Record<Skill, number>;
  notes: Record<Skill, string>;
  strengths: string[];
  improvements: string[];
  grammarFixes: { original: string; corrected: string; explain: string }[];
  pronunciationWords: { word: string; ipa: string }[];
  contentTip: string;
  demo?: boolean;
};

export type SessionSummary = {
  headline: string;
  strengths: string[];
  improvements: string[];
  practice: { instruction: string; keywords: string[] };
  nextActivity: Activity;
  demo?: boolean;
};

export type SessionRow = {
  id: string;
  student_id: string;
  seq: number;
  kind: "topic" | "activity";
  topic_id: string;
  subtopic: string;
  title: string;
  focus_skill: Skill | null;
  instruction: string | null;
  questions: { q: string; hint: string }[];
  tips: string[];
  vocab: string[];
  status: "in_progress" | "completed";
  scores: Scores | null;
  summary: SessionSummary | null;
  teacher_status: "pending" | "approved";
  teacher_scores: Scores | null;
  teacher_comment: string | null;
  reviewed_at: string | null;
  started_at: string;
  completed_at: string | null;
};

export type AnswerRow = {
  id: string;
  session_id: string;
  idx: number;
  question: string;
  transcript: string;
  audio_url: string | null;
  duration_sec: number | null;
  metrics: SpeechMetrics | null;
  evaluation: AnswerEvaluation | null;
  created_at: string;
};

/** Final scores shown to the student: the teacher's when reviewed, otherwise the AI's. */
export function finalScores(s: Pick<SessionRow, "scores" | "teacher_scores">): Scores | null {
  return s.teacher_scores ?? s.scores;
}
