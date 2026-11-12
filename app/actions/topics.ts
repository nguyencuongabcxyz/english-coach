"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { draftSubtopic } from "@/lib/ai";
import { moveTopic, saveTopic, setTopicHidden, type TopicInput } from "@/lib/topics-db";
import { THEME_KEYS, type ThemeKey } from "@/lib/topics";

export type SaveTopicResult = { ok: true; id: string } | { ok: false; error: string };

const clean = (s: unknown, max: number) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/** Validates the editor payload; empty question rows / tips / vocab are dropped. */
function parse(raw: unknown): TopicInput | string {
  const t = raw as Partial<TopicInput>;
  const title = clean(t?.title, 60);
  if (!title) return "Nhập tên chủ đề (tiếng Anh).";
  const theme: ThemeKey = THEME_KEYS.includes(t.theme as ThemeKey) ? (t.theme as ThemeKey) : "lilac";
  const subs = Array.isArray(t.subtopics) ? t.subtopics.slice(0, 20) : [];
  const subtopics: TopicInput["subtopics"] = [];
  for (const [i, s] of subs.entries()) {
    const name = clean(s?.name, 80);
    const questions = (Array.isArray(s?.questions) ? s.questions : [])
      .map((q) => ({ q: clean(q?.q, 300), hint: clean(q?.hint, 300) }))
      .filter((q) => q.q)
      .slice(0, 20);
    if (!name) return `Tiểu chủ đề số ${i + 1} chưa có tên.`;
    if (!questions.length) return `Tiểu chủ đề “${name}” cần ít nhất 1 câu hỏi.`;
    subtopics.push({
      id: typeof s.id === "string" && s.id ? s.id : undefined,
      name,
      hidden: Boolean(s.hidden),
      questions,
      tips: (Array.isArray(s.tips) ? s.tips : []).map((x) => clean(x, 200)).filter(Boolean).slice(0, 8),
      vocab: (Array.isArray(s.vocab) ? s.vocab : []).map((x) => clean(x, 60)).filter(Boolean).slice(0, 12),
    });
  }
  if (!subtopics.length) return "Thêm ít nhất 1 tiểu chủ đề.";
  return {
    id: typeof t.id === "string" && t.id ? t.id : undefined,
    title,
    vi: clean(t.vi, 60),
    theme,
    hidden: Boolean(t.hidden),
    subtopics,
  };
}

function refresh() {
  revalidatePath("/teacher/topics");
  revalidatePath("/topics");
  revalidatePath("/practice");
  revalidatePath("/dashboard");
}

export async function saveTopicAction(payload: unknown): Promise<SaveTopicResult> {
  const teacher = await requireUser("teacher");
  const input = parse(payload);
  if (typeof input === "string") return { ok: false, error: input };
  try {
    const id = await saveTopic(input, teacher.id);
    if (!id) return { ok: false, error: "Bạn không có quyền sửa chủ đề này." };
    refresh();
    return { ok: true, id };
  } catch (e) {
    console.error("saveTopic failed", e);
    return { ok: false, error: "Không lưu được chủ đề, vui lòng thử lại." };
  }
}

export async function toggleTopicHidden(id: string, hidden: boolean) {
  const teacher = await requireUser("teacher");
  await setTopicHidden(id, hidden, teacher.id);
  refresh();
}

export async function moveTopicAction(id: string, dir: -1 | 1) {
  const teacher = await requireUser("teacher");
  await moveTopic(id, dir === -1 ? -1 : 1, teacher.id);
  refresh();
}

export async function draftSubtopicAction(topic: string, subtopic: string, count = 5) {
  await requireUser("teacher");
  const t = clean(topic, 60);
  const s = clean(subtopic, 80);
  if (!s) return { ok: false as const, error: "Nhập tên tiểu chủ đề trước khi nhờ AI gợi ý." };
  try {
    const draft = await draftSubtopic({ topic: t || s, subtopic: s, count: Math.min(Math.max(count, 1), 8) });
    return { ok: true as const, draft };
  } catch (e) {
    console.error("draftSubtopic failed", e);
    return { ok: false as const, error: "AI đang bận, vui lòng thử lại." };
  }
}
