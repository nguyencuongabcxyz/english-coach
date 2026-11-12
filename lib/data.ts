import "server-only";
import { one, sql } from "./db";
import {
  averageScores,
  round1,
  SKILLS,
  totalOf,
  weakestSkill,
  weakSkills,
  type Scores,
  type Skill,
} from "./skills";
import { finalScores, type AnswerRow, type SessionRow, type UserRow } from "./types";

// ---------- student ----------

export async function listCompletedSessions(studentId: string) {
  return sql<SessionRow>(
    `SELECT * FROM practice_sessions WHERE student_id = $1 AND status = 'completed' ORDER BY seq ASC`,
    [studentId],
  );
}

export async function getSession(id: string) {
  return one<SessionRow>(`SELECT * FROM practice_sessions WHERE id = $1`, [id]);
}

export async function getAnswers(sessionId: string) {
  return sql<AnswerRow>(`SELECT * FROM answers WHERE session_id = $1 ORDER BY idx ASC, created_at ASC`, [sessionId]);
}

export async function getAnswer(id: string) {
  return one<AnswerRow>(`SELECT * FROM answers WHERE id = $1`, [id]);
}

export async function latestCompleted(studentId: string) {
  return one<SessionRow>(
    `SELECT * FROM practice_sessions WHERE student_id = $1 AND status = 'completed' ORDER BY seq DESC LIMIT 1`,
    [studentId],
  );
}

export type StudentProfile = {
  sessions: SessionRow[];
  count: number;
  weekCount: number;
  topicsDone: string[];
  latest: SessionRow | null;
  latestScore: number | null;
  firstScore: number | null;
  current: Scores | null; // average of the last 3 sessions
  weakest: Skill | null;
  weak: Skill[];
  streak: number;
  progress: number | null; // latest total - first total
};

export function buildProfile(sessions: SessionRow[]): StudentProfile {
  const scored = sessions.filter((s) => finalScores(s));
  const latest = scored.at(-1) ?? null;
  const recent = scored.slice(-3).map((s) => finalScores(s)!);
  const current = averageScores(recent);
  const weekAgo = Date.now() - 7 * 86400000;
  const latestScore = latest ? finalScores(latest)!.total : null;
  const firstScore = scored[0] ? finalScores(scored[0])!.total : null;
  return {
    sessions,
    count: sessions.length,
    weekCount: sessions.filter((s) => new Date(s.completed_at ?? s.started_at).getTime() >= weekAgo).length,
    topicsDone: [...new Set(sessions.map((s) => s.topic_id))],
    latest,
    latestScore,
    firstScore,
    current,
    weakest: current ? weakestSkill(current) : null,
    weak: current ? weakSkills(current) : [],
    streak: streakDays(sessions.map((s) => s.completed_at ?? s.started_at)),
    progress: latestScore != null && firstScore != null ? round1(latestScore - firstScore) : null,
  };
}

function dayKey(d: Date) {
  // Vietnam time (UTC+7) day bucket.
  return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

function streakDays(dates: string[]) {
  const days = new Set(dates.map((d) => dayKey(new Date(d))));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setTime(cursor.getTime() - 86400000);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setTime(cursor.getTime() - 86400000);
  }
  return streak;
}

export async function studentProfile(studentId: string) {
  return buildProfile(await listCompletedSessions(studentId));
}

export async function createPracticeSession(input: {
  studentId: string;
  kind: "topic" | "activity";
  topicId: string;
  subtopic: string;
  title: string;
  focusSkill?: Skill | null;
  instruction?: string | null;
  questions: { q: string; hint: string }[];
  tips: string[];
  vocab: string[];
}) {
  const id = crypto.randomUUID();
  // Drop abandoned, unanswered sessions so numbering stays clean.
  await sql(
    `DELETE FROM practice_sessions p WHERE p.student_id = $1 AND p.status = 'in_progress'
       AND NOT EXISTS (SELECT 1 FROM answers a WHERE a.session_id = p.id)`,
    [input.studentId],
  );
  const row = await one<{ n: number }>(
    `SELECT COALESCE(MAX(seq), 0)::int + 1 AS n FROM practice_sessions WHERE student_id = $1`,
    [input.studentId],
  );
  await sql(
    `INSERT INTO practice_sessions (id, student_id, seq, kind, topic_id, subtopic, title, focus_skill, instruction,
       questions, tips, vocab)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id, input.studentId, row!.n, input.kind, input.topicId, input.subtopic, input.title,
      input.focusSkill ?? null, input.instruction ?? null,
      JSON.stringify(input.questions), JSON.stringify(input.tips), JSON.stringify(input.vocab),
    ],
  );
  return id;
}

export async function inProgressSession(studentId: string) {
  return one<SessionRow>(
    `SELECT * FROM practice_sessions WHERE student_id = $1 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
    [studentId],
  );
}

// ---------- teacher ----------

export type StudentSummary = {
  user: UserRow;
  profile: StudentProfile;
  avg: Scores | null;
  trend: number | null; // latest total - previous total
  pending: number;
  daysInactive: number | null;
  status: "progress" | "stable" | "support" | "inactive" | "new";
};

export async function classOverview(classId: string) {
  const students = await sql<UserRow>(
    `SELECT * FROM users WHERE class_id = $1 AND role = 'student' ORDER BY name ASC`,
    [classId],
  );
  const sessions = await sql<SessionRow>(
    `SELECT p.* FROM practice_sessions p JOIN users u ON u.id = p.student_id
     WHERE u.class_id = $1 AND p.status = 'completed' ORDER BY p.seq ASC`,
    [classId],
  );
  const byStudent = new Map<string, SessionRow[]>();
  for (const s of sessions) byStudent.set(s.student_id, [...(byStudent.get(s.student_id) ?? []), s]);

  const summaries: StudentSummary[] = students.map((user) => {
    const list = byStudent.get(user.id) ?? [];
    const profile = buildProfile(list);
    const scored = list.map((s) => finalScores(s)).filter(Boolean) as Scores[];
    const avg = averageScores(scored);
    const trend = scored.length >= 2 ? round1(scored.at(-1)!.total - scored.at(-2)!.total) : null;
    const lastActive = user.last_active_at ?? list.at(-1)?.completed_at ?? null;
    const daysInactive = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000) : null;
    const pending = list.filter((s) => s.teacher_status === "pending").length;
    let status: StudentSummary["status"] = "stable";
    if (!user.activated || !list.length) status = "new";
    else if (daysInactive != null && daysInactive >= 7) status = "inactive";
    else if ((profile.current && Math.min(...SKILLS.map((k) => profile.current![k])) < 5) || (trend != null && trend < 0))
      status = "support";
    else if (trend != null && trend > 0) status = "progress";
    return { user, profile, avg, trend, pending, daysInactive, status };
  });

  const weekAgo = Date.now() - 7 * 86400000;
  const monthAgo = Date.now() - 30 * 86400000;
  const activeThisWeek = summaries.filter((s) =>
    s.profile.sessions.some((x) => new Date(x.completed_at ?? x.started_at).getTime() >= weekAgo),
  ).length;
  const recent = sessions
    .filter((s) => new Date(s.completed_at ?? s.started_at).getTime() >= monthAgo)
    .map((s) => finalScores(s))
    .filter(Boolean) as Scores[];
  const skillAvg = averageScores(recent);
  const classAvg = averageScores(summaries.map((s) => s.avg).filter(Boolean) as Scores[]);
  const pendingTotal = sessions.filter((s) => s.teacher_status === "pending").length;
  const weakestCount = skillAvg
    ? summaries.filter((s) => s.profile.weakest === weakestSkill(skillAvg)).length
    : 0;

  // --- statistics for charts ---
  // Class progress: each student's first scored session vs their latest one.
  const firsts: Scores[] = [];
  const latests: Scores[] = [];
  for (const sm of summaries) {
    const sc = sm.profile.sessions.map((x) => finalScores(x)).filter(Boolean) as Scores[];
    if (sc.length >= 2) {
      firsts.push(sc[0]);
      latests.push(sc.at(-1)!);
    }
  }
  const skillFirst = averageScores(firsts);
  const skillLatest = averageScores(latests);

  const weekly = weeklyStats(sessions, 8);

  const levelOf = (s: StudentSummary) => {
    const v = s.profile.current?.total;
    if (v == null) return "none";
    return v >= 8 ? "good" : v >= 6.5 ? "ok" : "low";
  };
  const distribution = {
    good: summaries.filter((s) => levelOf(s) === "good").length,
    ok: summaries.filter((s) => levelOf(s) === "ok").length,
    low: summaries.filter((s) => levelOf(s) === "low").length,
    none: summaries.filter((s) => levelOf(s) === "none").length,
  };

  const topicStats = new Map<string, { count: number; totals: number[] }>();
  for (const s of sessions) {
    const e = topicStats.get(s.topic_id) ?? { count: 0, totals: [] };
    e.count++;
    const sc = finalScores(s);
    if (sc) e.totals.push(sc.total);
    topicStats.set(s.topic_id, e);
  }
  const topics = [...topicStats.entries()]
    .map(([topicId, e]) => ({
      topicId,
      count: e.count,
      avg: e.totals.length ? round1(e.totals.reduce((a, b) => a + b, 0) / e.totals.length) : null,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    summaries,
    totalStudents: students.length,
    activeThisWeek,
    totalSessions: sessions.length,
    classAvg: classAvg?.total ?? null,
    skillAvg,
    skillFirst,
    skillLatest,
    progressStudents: firsts.length,
    pendingTotal,
    weakestCount,
    needSupport: summaries.filter((s) => s.status === "support" || s.status === "inactive"),
    weekly,
    distribution,
    topics,
  };
}

const DAY_MS = 86400000;
const VN_OFFSET = 7 * 3600000;

/** Monday 00:00 (Vietnam time) of the week containing `t`, as a UTC timestamp. */
function weekStart(t: number) {
  const local = new Date(t + VN_OFFSET);
  const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - VN_OFFSET;
  return midnight - dow * DAY_MS;
}

export type WeekStat = { label: string; range: string; avg: number | null; count: number; students: number };

/** Average total score, number of sessions and active students per week, oldest first. */
export function weeklyStats(sessions: SessionRow[], weeks: number): WeekStat[] {
  const thisWeek = weekStart(Date.now());
  const out: WeekStat[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const from = thisWeek - w * 7 * DAY_MS;
    const to = from + 7 * DAY_MS;
    const inWeek = sessions.filter((s) => {
      const t = new Date(s.completed_at ?? s.started_at).getTime();
      return t >= from && t < to;
    });
    const totals = inWeek.map((s) => finalScores(s)?.total).filter((v): v is number => v != null);
    const d = (t: number) => {
      const x = new Date(t + VN_OFFSET);
      return `${String(x.getUTCDate()).padStart(2, "0")}/${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
    };
    out.push({
      label: w === 0 ? "Tuần này" : d(from),
      range: `${d(from)} – ${d(to - DAY_MS)}`,
      avg: totals.length ? round1(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
      count: inWeek.length,
      students: new Set(inWeek.map((s) => s.student_id)).size,
    });
  }
  return out;
}

export async function pendingReviews(classId: string) {
  return sql<SessionRow & { student_name: string; student_login: string }>(
    `SELECT p.*, u.name AS student_name, u.login AS student_login
     FROM practice_sessions p JOIN users u ON u.id = p.student_id
     WHERE u.class_id = $1 AND p.status = 'completed'
     ORDER BY (p.teacher_status = 'pending') DESC, p.completed_at DESC
     LIMIT 200`,
    [classId],
  );
}

export async function saveReview(sessionId: string, scores: Record<Skill, number>, comment: string) {
  const full = { ...scores, total: totalOf(scores) };
  await sql(
    `UPDATE practice_sessions SET teacher_status = 'approved', teacher_scores = $2, teacher_comment = $3,
       reviewed_at = now() WHERE id = $1`,
    [sessionId, JSON.stringify(full), comment || null],
  );
}

export async function getClass(classId: string) {
  return one<{ id: string; name: string; grade: number }>(`SELECT * FROM classes WHERE id = $1`, [classId]);
}

/** Suggests the next free student code for the class, e.g. HS-11A2-023. */
export async function suggestStudentCode(classId: string, className: string) {
  const prefix = `HS-${className.toUpperCase()}-`;
  const rows = await sql<{ login: string }>(`SELECT login FROM users WHERE class_id = $1 AND role = 'student'`, [classId]);
  const max = rows.reduce((m, r) => {
    const n = r.login.toUpperCase().startsWith(prefix) ? Number(r.login.slice(prefix.length)) : NaN;
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Whole days since a date (null when unknown). */
export function daysSince(d: string | Date | null | undefined): number | null {
  return d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY_MS) : null;
}
