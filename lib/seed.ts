import bcrypt from "bcryptjs";
import type { QueryFn } from "./db";
import { findSubtopic } from "./topics";
import { activityFor, SKILL_VI, SKILLS, totalOf, weakestSkill, type Skill } from "./skills";
import type { AnswerEvaluation, SessionSummary, SpeechMetrics } from "./types";

/**
 * Demo data, created automatically the first time the database is empty.
 *
 * Demo accounts (password for every activated account: demo1234):
 *   Teacher: ha.tran@thpt-demo.edu.vn
 *   Student: HS-11A2-014 (Nguyễn Minh Anh) and the other HS-11A2-xxx codes below
 * Students not activated yet (use "Kích hoạt tài khoản"):
 *   HS-11A2-021 with activation code MA6KYT
 *   HS-11A2-022 with activation code QX7P2L
 */
// Set SEED_PASSWORD in production so the seeded accounts do not use the public demo password.
export const DEMO_PASSWORD = process.env.SEED_PASSWORD || "demo1234";

const DAY = 86400000;
const iso = (daysAgo: number, hour = 19, min = 40) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

type Plan = {
  sub: string;
  daysAgo: number;
  s: Record<Skill, number>;
  reviewed?: boolean;
};

const MINH_ANH: Plan[] = [
  { sub: "family-relationships", daysAgo: 30, s: { pronunciation: 6.0, fluency: 4.5, vocabulary: 6.5, grammar: 5.5, content: 6.5 }, reviewed: true },
  { sub: "school-life", daysAgo: 27, s: { pronunciation: 6.0, fluency: 5.0, vocabulary: 6.5, grammar: 6.0, content: 6.5 }, reviewed: true },
  { sub: "environmental-problems", daysAgo: 25, s: { pronunciation: 6.5, fluency: 5.0, vocabulary: 7.0, grammar: 6.0, content: 7.0 }, reviewed: true },
  { sub: "household-chores", daysAgo: 23, s: { pronunciation: 6.5, fluency: 5.0, vocabulary: 7.0, grammar: 6.0, content: 7.5 }, reviewed: true },
  { sub: "future-jobs", daysAgo: 20, s: { pronunciation: 6.5, fluency: 5.5, vocabulary: 7.0, grammar: 6.5, content: 7.5 }, reviewed: true },
  { sub: "learning-methods", daysAgo: 17, s: { pronunciation: 7.0, fluency: 5.5, vocabulary: 7.5, grammar: 6.5, content: 7.5 }, reviewed: true },
  { sub: "family-activities", daysAgo: 13, s: { pronunciation: 7.0, fluency: 5.5, vocabulary: 7.5, grammar: 6.5, content: 8.0 }, reviewed: true },
  { sub: "future-cities", daysAgo: 9, s: { pronunciation: 7.0, fluency: 6.0, vocabulary: 7.5, grammar: 6.5, content: 7.5 }, reviewed: true },
  { sub: "household-chores", daysAgo: 6, s: { pronunciation: 7.0, fluency: 5.5, vocabulary: 7.5, grammar: 6.5, content: 8.0 } },
  { sub: "technology-in-education", daysAgo: 2, s: { pronunciation: 6.5, fluency: 5.5, vocabulary: 7.0, grammar: 6.0, content: 7.0 } },
  { sub: "green-lifestyle", daysAgo: 1, s: { pronunciation: 7.0, fluency: 6.0, vocabulary: 7.5, grammar: 6.5, content: 7.5 }, reviewed: true },
  { sub: "family-activities", daysAgo: 0, s: { pronunciation: 7.5, fluency: 6.0, vocabulary: 8.0, grammar: 7.0, content: 8.5 } },
];

type Student = {
  code: string;
  name: string;
  activated: boolean;
  activation?: string;
  lastActiveDaysAgo?: number;
  base?: Record<Skill, number>;
  trend?: number;
  sessions?: number;
  resetRequested?: boolean;
};

const OTHERS: Student[] = [
  { code: "HS-11A2-003", name: "Trần Bảo Phong", activated: true, base: { pronunciation: 7.5, fluency: 7.0, vocabulary: 7.5, grammar: 7.0, content: 8.0 }, trend: 0.25, sessions: 10 },
  { code: "HS-11A2-007", name: "Võ Ngọc Trân", activated: true, base: { pronunciation: 6.5, fluency: 6.5, vocabulary: 7.0, grammar: 6.0, content: 7.0 }, trend: 0.2, sessions: 5 },
  { code: "HS-11A2-009", name: "Lê Quốc Bảo", activated: true, base: { pronunciation: 5.5, fluency: 4.4, vocabulary: 5.5, grammar: 5.0, content: 5.5 }, trend: -0.4, sessions: 2 },
  { code: "HS-11A2-011", name: "Phạm Thảo Vy", activated: true, base: { pronunciation: 4.5, fluency: 6.0, vocabulary: 6.5, grammar: 6.0, content: 6.5 }, trend: 0, sessions: 3 },
  { code: "HS-11A2-016", name: "Hoàng Nhật Nam", activated: true, base: { pronunciation: 7.0, fluency: 6.5, vocabulary: 6.0, grammar: 6.5, content: 7.0 }, trend: 0.15, sessions: 6 },
  { code: "HS-11A2-018", name: "Bùi Khánh Linh", activated: true, base: { pronunciation: 6.5, fluency: 6.0, vocabulary: 6.5, grammar: 5.5, content: 6.5 }, trend: 0.1, sessions: 7, resetRequested: true },
  { code: "HS-11A2-020", name: "Đỗ Gia Huy", activated: true, lastActiveDaysAgo: 9, base: { pronunciation: 6.0, fluency: 5.5, vocabulary: 6.0, grammar: 6.0, content: 6.0 }, trend: 0.1, sessions: 3 },
  { code: "HS-11A2-021", name: "Ngô Thanh Tâm", activated: false, activation: "MA6KYT" },
  { code: "HS-11A2-022", name: "Đặng Hải Yến", activated: false, activation: "QX7P2L" },
];

const SUBS = [
  "family-relationships", "school-life", "green-lifestyle", "future-jobs", "learning-methods",
  "family-activities", "environmental-problems", "future-cities", "household-chores", "technology-in-education",
];

const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v * 2) / 2));

function demoEvaluation(s: Record<Skill, number>): AnswerEvaluation {
  return {
    scores: s,
    notes: {
      pronunciation: s.pronunciation >= 7 ? "Phần lớn rõ ràng; chú ý 2 từ." : "Một số âm cuối chưa rõ.",
      fluency: s.fluency >= 7 ? "Nói khá liền mạch." : "Có 1 lần ngập ngừng lâu.",
      vocabulary: s.vocabulary >= 7.5 ? "Dùng từ phù hợp, tự nhiên." : "Từ vựng còn đơn giản.",
      grammar: s.grammar >= 7 ? "Chính xác; thử dùng câu dài hơn." : "Còn lỗi chia động từ.",
      content: s.content >= 8 ? "Trả lời đúng trọng tâm câu hỏi." : "Cần thêm lý do và ví dụ.",
    },
    strengths: ["Good vocabulary.", "Your ideas are clear.", "You answered the question directly."],
    improvements: [
      "Try to speak more smoothly.",
      "Pay attention to the pronunciation of some words.",
      "Use linking words to connect your ideas.",
    ],
    grammarFixes: [],
    pronunciationWords: [
      { word: "weekends", ipa: "/ˌwiːkˈendz/" },
      { word: "together", ipa: "/təˈɡeðə(r)/" },
    ],
    contentTip: "Thêm lý do hoặc ví dụ để phát triển ý.",
  };
}

const SAMPLE_METRICS: SpeechMetrics = {
  durationSec: 24,
  words: 19,
  wpm: 104,
  longPauses: [{ after: "weekends", seconds: 2.1 }],
  fillers: 0,
  confidence: 0.86,
};

export async function seed(q: QueryFn) {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const teacherId = "t-ha";
  await q(`INSERT INTO classes (id, name, grade, teacher_id) VALUES ('c-11a2', '11A2', 11, $1)`, [teacherId]);
  await q(
    `INSERT INTO users (id, role, login, name, class_id, password_hash, activated, last_active_at)
     VALUES ($1, 'teacher', 'ha.tran@thpt-demo.edu.vn', 'Trần Thu Hà', 'c-11a2', $2, TRUE, now())`,
    [teacherId, hash],
  );

  async function addSession(studentId: string, seq: number, plan: Plan, withSample: boolean) {
    const found = findSubtopic(plan.sub)!;
    const id = `s-${studentId}-${seq}`;
    const total = totalOf(plan.s);
    const weakest = weakestSkill(plan.s);
    const next = activityFor(weakest, found.topic.id, found.topic.title, found.sub.vocab);
    const summary: SessionSummary = {
      headline:
        weakest === "fluency"
          ? "Câu trả lời rõ ràng. Giờ hãy nói trôi chảy hơn."
          : `Bạn đã trả lời tốt. Hãy tập trung cải thiện ${SKILL_VI[weakest].toLowerCase()}.`,
      strengths: ["Good vocabulary.", "Your ideas are clear.", "You answered the question directly."],
      improvements: [
        "Try to speak more smoothly.",
        "Pay attention to the pronunciation of some words.",
        "Use linking words to connect your ideas.",
      ],
      practice: {
        instruction: "Hãy trả lời lại câu hỏi và dùng 3 từ nối sau:",
        keywords: ["because", "however", "therefore"],
      },
      nextActivity: next,
    };
    const qs = found.sub.questions;
    const answered = withSample ? 1 : 1 + (seq % 3);
    await q(
      `INSERT INTO practice_sessions (id, student_id, seq, kind, topic_id, subtopic, title, questions, tips, vocab,
         status, scores, summary, teacher_status, teacher_scores, reviewed_at, started_at, completed_at)
       VALUES ($1,$2,$3,'topic',$4,$5,$6,$7,$8,$9,'completed',$10,$11,$12,NULL,$13,$14,$14)`,
      [
        id, studentId, seq, found.topic.id, found.sub.id, found.sub.name,
        JSON.stringify(qs), JSON.stringify(found.sub.tips), JSON.stringify(found.sub.vocab),
        JSON.stringify({ ...plan.s, total }), JSON.stringify(summary),
        plan.reviewed ? "approved" : "pending",
        plan.reviewed ? iso(Math.max(0, plan.daysAgo - 1), 8, 0) : null,
        iso(plan.daysAgo, 19 - (seq % 4), 40),
      ],
    );
    for (let i = 0; i < answered; i++) {
      const transcript =
        withSample && i === 0
          ? "I usually spend time with my family at weekends. We often have dinner together and watch movies."
          : "I think this is an interesting question. In my opinion, it is important because it helps us a lot in our daily life.";
      await q(
        `INSERT INTO answers (id, session_id, idx, question, transcript, duration_sec, metrics, evaluation, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          `${id}-a${i}`, id, i, qs[i].q, transcript, 24,
          JSON.stringify(SAMPLE_METRICS), JSON.stringify(demoEvaluation(plan.s)),
          iso(plan.daysAgo, 19 - (seq % 4), 41 + i),
        ],
      );
    }
  }

  // Main demo student — matches the Claude Design screens.
  const maId = "u-014";
  await q(
    `INSERT INTO users (id, role, login, name, class_id, password_hash, activated, last_active_at)
     VALUES ($1, 'student', 'HS-11A2-014', 'Nguyễn Minh Anh', 'c-11a2', $2, TRUE, now())`,
    [maId, hash],
  );
  for (let i = 0; i < MINH_ANH.length; i++) {
    await addSession(maId, i + 1, MINH_ANH[i], i === MINH_ANH.length - 1);
  }

  for (const st of OTHERS) {
    const id = "u-" + st.code.slice(-3);
    const lastActive = st.activated ? iso(st.lastActiveDaysAgo ?? 1) : null;
    await q(
      `INSERT INTO users (id, role, login, name, class_id, password_hash, activation_code, activated,
         reset_requested_at, last_active_at)
       VALUES ($1,'student',$2,$3,'c-11a2',$4,$5,$6,$7,$8)`,
      [
        id, st.code, st.name, st.activated ? hash : null, st.activation ?? null, st.activated,
        st.resetRequested ? iso(0, 7, 15) : null, lastActive,
      ],
    );
    if (!st.activated || !st.base) continue;
    const n = st.sessions ?? 3;
    const start = (st.lastActiveDaysAgo ?? 1) + n * 3;
    for (let k = 0; k < n; k++) {
      const step = (k - (n - 1)) * (st.trend ?? 0);
      const s = {} as Record<Skill, number>;
      for (const sk of SKILLS) s[sk] = clamp(st.base[sk] + step + ((k * 7 + sk.length) % 3 === 0 ? 0.5 : 0) - 0.25);
      if (k === n - 1) for (const sk of SKILLS) s[sk] = st.base[sk];
      const daysAgo = k === n - 1 ? (st.lastActiveDaysAgo ?? 1) : start - k * 3;
      await addSession(id, k + 1, { sub: SUBS[(k + id.length) % SUBS.length], daysAgo, s, reviewed: k < n - 2 }, false);
    }
  }
}
