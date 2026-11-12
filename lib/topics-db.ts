import "server-only";
import { cache } from "react";
import { one, sql } from "./db";
import type { UserRow } from "./types";
import { THEMES, type Question, type ThemeKey, type Topic } from "./topics";

type TopicRow = { id: string; sort: number; title: string; vi: string; theme: string; hidden: boolean };
type SubRow = {
  id: string;
  topic_id: string;
  sort: number;
  name: string;
  questions: Question[];
  tips: string[];
  vocab: string[];
  hidden: boolean;
};

const themeOf = (t: string): ThemeKey => (t in THEMES ? (t as ThemeKey) : "lilac");

async function load(ownerId: string): Promise<Topic[]> {
  const [topics, subs] = await Promise.all([
    sql<TopicRow>(`SELECT * FROM topics WHERE owner_id = $1 ORDER BY sort ASC, title ASC`, [ownerId]),
    sql<SubRow>(
      `SELECT s.* FROM subtopics s JOIN topics t ON t.id = s.topic_id WHERE t.owner_id = $1
       ORDER BY s.sort ASC, s.name ASC`,
      [ownerId],
    ),
  ]);
  return topics.map((t, i) => {
    const theme = themeOf(t.theme);
    return {
      id: t.id,
      n: String(i + 1).padStart(2, "0"),
      title: t.title,
      vi: t.vi,
      theme,
      ...THEMES[theme],
      hidden: t.hidden,
      subtopics: subs
        .filter((s) => s.topic_id === t.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          questions: s.questions ?? [],
          tips: s.tips ?? [],
          vocab: s.vocab ?? [],
          hidden: s.hidden,
        })),
    };
  });
}

/** Whose lessons a user works with: a teacher's own, or the teacher of a student's class. */
export const ownerIdFor = cache(async (user: Pick<UserRow, "id" | "role" | "class_id">): Promise<string> => {
  if (user.role === "teacher") return user.id;
  const r = await one<{ teacher_id: string | null }>(`SELECT teacher_id FROM classes WHERE id = $1`, [user.class_id]);
  return r?.teacher_id ?? "";
});

/** Every topic of one teacher, including hidden ones (teacher editor). Cached per request. */
export const getAllTopics = cache(load);

/** What students see: visible topics with at least one visible subtopic that has questions. */
export const getTopics = cache(async (ownerId: string): Promise<Topic[]> => {
  const all = await getAllTopics(ownerId);
  return all
    .filter((t) => !t.hidden)
    .map((t) => ({ ...t, subtopics: t.subtopics.filter((s) => !s.hidden && s.questions.length > 0) }))
    .filter((t) => t.subtopics.length > 0)
    .map((t, i) => ({ ...t, n: String(i + 1).padStart(2, "0") }));
});

export type TopicInput = {
  id?: string;
  title: string;
  vi: string;
  theme: ThemeKey;
  hidden: boolean;
  subtopics: {
    id?: string;
    name: string;
    hidden: boolean;
    questions: Question[];
    tips: string[];
    vocab: string[];
  }[];
};

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "topic";

const suffix = () => crypto.randomUUID().slice(0, 6);

/** Creates or updates a topic and its subtopics (subtopics missing from the input are removed). */
export async function saveTopic(input: TopicInput, teacherId: string): Promise<string | null> {
  const id = input.id ?? `${slug(input.title)}-${suffix()}`;
  if (input.id) {
    const owned = await one(`SELECT 1 FROM topics WHERE id = $1 AND owner_id = $2`, [id, teacherId]);
    if (!owned) return null;
    await sql(
      `UPDATE topics SET title = $2, vi = $3, theme = $4, hidden = $5, updated_by = $6, updated_at = now() WHERE id = $1`,
      [id, input.title, input.vi, input.theme, input.hidden, teacherId],
    );
  } else {
    const [{ n }] = await sql<{ n: number }>(
      `SELECT COALESCE(MAX(sort), 0)::int + 1 AS n FROM topics WHERE owner_id = $1`,
      [teacherId],
    );
    await sql(
      `INSERT INTO topics (id, sort, title, vi, theme, hidden, updated_by, owner_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
      [id, n, input.title, input.vi, input.theme, input.hidden, teacherId],
    );
  }

  const keep: string[] = [];
  for (const [i, s] of input.subtopics.entries()) {
    // A subtopic id from the client must already belong to this topic; otherwise make a new one.
    const known = s.id ? await one(`SELECT 1 FROM subtopics WHERE id = $1 AND topic_id = $2`, [s.id, id]) : null;
    const subId = known ? s.id! : `${slug(s.name)}-${suffix()}`;
    keep.push(subId);
    await sql(
      `INSERT INTO subtopics (id, topic_id, sort, name, questions, tips, vocab, hidden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET topic_id = EXCLUDED.topic_id, sort = EXCLUDED.sort, name = EXCLUDED.name,
         questions = EXCLUDED.questions, tips = EXCLUDED.tips, vocab = EXCLUDED.vocab, hidden = EXCLUDED.hidden`,
      [subId, id, i + 1, s.name, JSON.stringify(s.questions), JSON.stringify(s.tips), JSON.stringify(s.vocab), s.hidden],
    );
  }
  // Subtopics the teacher removed. Past sessions keep their own copy of the questions,
  // so deleting the row is safe.
  const existing = await sql<{ id: string }>(`SELECT id FROM subtopics WHERE topic_id = $1`, [id]);
  for (const e of existing) {
    if (!keep.includes(e.id)) await sql(`DELETE FROM subtopics WHERE id = $1`, [e.id]);
  }
  return id;
}

export async function setTopicHidden(id: string, hidden: boolean, teacherId: string) {
  await sql(
    `UPDATE topics SET hidden = $2, updated_by = $3, updated_at = now() WHERE id = $1 AND owner_id = $3`,
    [id, hidden, teacherId],
  );
}

export async function moveTopic(id: string, dir: -1 | 1, teacherId: string) {
  const list = await sql<{ id: string; sort: number }>(
    `SELECT id, sort FROM topics WHERE owner_id = $1 ORDER BY sort ASC, title ASC`,
    [teacherId],
  );
  const i = list.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  for (const [k, t] of list.entries()) await sql(`UPDATE topics SET sort = $2 WHERE id = $1`, [t.id, k + 1]);
}

/** Gives a newly created teacher their own copy of the default lessons. */
export async function giveDefaultTopics(teacherId: string) {
  const { copyDefaultTopics } = await import("./seed");
  await copyDefaultTopics((text, params) => sql(text, params), teacherId);
}
