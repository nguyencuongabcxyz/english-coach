"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { createPracticeSession, getAnswers, getSession, studentProfile } from "@/lib/data";
import { findSubtopic, getTopic, TOPICS } from "@/lib/topics";
import { activityFor, averageScores, SKILLS, totalOf, type Skill } from "@/lib/skills";
import { summarizeSession } from "@/lib/ai";

export async function startTopic(subId: string) {
  const user = await requireUser("student");
  const found = findSubtopic(subId);
  if (!found) redirect("/topics");
  const id = await createPracticeSession({
    studentId: user.id,
    kind: "topic",
    topicId: found.topic.id,
    subtopic: found.sub.id,
    title: found.sub.name,
    questions: found.sub.questions,
    tips: found.sub.tips,
    vocab: found.sub.vocab,
  });
  redirect(`/practice/${id}`);
}

/** Personalised activity built from the student's weakest skill (Module 5). */
export async function startActivity(skill: Skill, topicId?: string) {
  const user = await requireUser("student");
  if (!SKILLS.includes(skill)) redirect("/dashboard");
  const profile = await studentProfile(user.id);
  const topic = getTopic(topicId ?? profile.latest?.topic_id ?? "family") ?? TOPICS[0];
  const sub = findSubtopic(profile.latest?.subtopic ?? "")?.sub ?? topic.subtopics[0];
  const a = activityFor(skill, topic.id, topic.title, sub.vocab);
  const id = await createPracticeSession({
    studentId: user.id,
    kind: "activity",
    topicId: topic.id,
    subtopic: sub.id,
    title: a.title,
    focusSkill: skill,
    instruction: a.instruction,
    questions: [{ q: a.question, hint: a.description }],
    tips: [a.description, ...sub.tips.slice(0, 2)],
    vocab: a.keywords.length ? a.keywords : sub.vocab,
  });
  redirect(`/practice/${id}`);
}

/** "Luyện lại": answer the same questions again, using the suggested technique. */
export async function retrySession(sessionId: string) {
  const user = await requireUser("student");
  const s = await getSession(sessionId);
  if (!s || s.student_id !== user.id) redirect("/dashboard");
  const answered = await getAnswers(s.id);
  const questions = answered.length
    ? answered.map((a) => s.questions.find((q) => q.q === a.question) ?? { q: a.question, hint: "" })
    : s.questions;
  const keywords = s.summary?.practice.keywords ?? [];
  const id = await createPracticeSession({
    studentId: user.id,
    kind: s.kind,
    topicId: s.topic_id,
    subtopic: s.subtopic,
    title: s.title,
    focusSkill: s.summary?.nextActivity.skill ?? s.focus_skill,
    instruction: s.summary
      ? `${s.summary.practice.instruction} ${keywords.join(" – ")}`.trim()
      : s.instruction,
    questions,
    tips: s.tips,
    vocab: keywords.length ? [...keywords, ...s.vocab].slice(0, 6) : s.vocab,
  });
  redirect(`/practice/${id}`);
}

export async function finishSession(sessionId: string) {
  const user = await requireUser("student");
  const s = await getSession(sessionId);
  if (!s || s.student_id !== user.id) redirect("/dashboard");
  if (s.status === "completed") redirect(`/feedback/${s.id}`);
  const answers = await getAnswers(s.id);
  const evaluated = answers.filter((a) => a.evaluation);
  if (!evaluated.length) redirect(`/practice/${s.id}`);

  const avg = averageScores(evaluated.map((a) => a.evaluation!.scores))!;
  const topic = getTopic(s.topic_id) ?? TOPICS[0];
  let summary;
  try {
    summary = await summarizeSession({
      title: s.title,
      topicId: topic.id,
      topicTitle: topic.title,
      vocab: s.vocab,
      avg,
      answers: evaluated.map((a) => ({ question: a.question, transcript: a.transcript, evaluation: a.evaluation })),
    });
  } catch (e) {
    console.error("summarizeSession failed", e);
    const first = evaluated[0].evaluation!;
    summary = {
      headline: "Bạn đã hoàn thành buổi luyện. Xem chi tiết bên dưới.",
      strengths: first.strengths.slice(0, 3),
      improvements: first.improvements.slice(0, 3),
      practice: { instruction: "Hãy trả lời lại câu hỏi và dùng 3 từ nối sau:", keywords: ["because", "however", "therefore"] },
      nextActivity: activityFor(
        SKILLS.reduce((a, k) => (avg[k] < avg[a] ? k : a), SKILLS[0]),
        topic.id,
        topic.title,
        s.vocab,
      ),
    };
  }
  await sql(
    `UPDATE practice_sessions SET status = 'completed', completed_at = now(), scores = $2, summary = $3 WHERE id = $1`,
    [s.id, JSON.stringify({ ...avg, total: totalOf(avg) }), JSON.stringify(summary)],
  );
  await sql(`UPDATE users SET last_active_at = now() WHERE id = $1`, [user.id]);
  redirect(`/feedback/${s.id}`);
}

export async function discardAnswer(answerId: string) {
  const user = await requireUser("student");
  await sql(
    `DELETE FROM answers a USING practice_sessions p
     WHERE a.id = $1 AND a.session_id = p.id AND p.student_id = $2 AND p.status = 'in_progress'`,
    [answerId, user.id],
  );
}
