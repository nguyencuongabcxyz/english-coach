import "server-only";
import { cache } from "react";
import { sql } from "./db";
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

async function load(): Promise<Topic[]> {
  const [topics, subs] = await Promise.all([
    sql<TopicRow>(`SELECT * FROM topics ORDER BY sort ASC, title ASC`),
    sql<SubRow>(`SELECT * FROM subtopics ORDER BY sort ASC, name ASC`),
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

/** Every topic, including hidden ones (teacher editor). Cached per request. */
export const getAllTopics = cache(load);

/** What students see: visible topics with at least one visible subtopic that has questions. */
export const getTopics = cache(async (): Promise<Topic[]> => {
  const all = await getAllTopics();
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
export async function saveTopic(input: TopicInput, teacherId: string): Promise<string> {
  const id = input.id ?? `${slug(input.title)}-${suffix()}`;
  if (input.id) {
    await sql(
      `UPDATE topics SET title = $2, vi = $3, theme = $4, hidden = $5, updated_by = $6, updated_at = now() WHERE id = $1`,
      [id, input.title, input.vi, input.theme, input.hidden, teacherId],
    );
  } else {
    const [{ n }] = await sql<{ n: number }>(`SELECT COALESCE(MAX(sort), 0)::int + 1 AS n FROM topics`);
    await sql(
      `INSERT INTO topics (id, sort, title, vi, theme, hidden, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, n, input.title, input.vi, input.theme, input.hidden, teacherId],
    );
  }

  const keep: string[] = [];
  for (const [i, s] of input.subtopics.entries()) {
    const subId = s.id ?? `${slug(s.name)}-${suffix()}`;
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
  await sql(`UPDATE topics SET hidden = $2, updated_by = $3, updated_at = now() WHERE id = $1`, [id, hidden, teacherId]);
}

export async function moveTopic(id: string, dir: -1 | 1) {
  const list = await sql<{ id: string; sort: number }>(`SELECT id, sort FROM topics ORDER BY sort ASC, title ASC`);
  const i = list.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  for (const [k, t] of list.entries()) await sql(`UPDATE topics SET sort = $2 WHERE id = $1`, [t.id, k + 1]);
}
