import "server-only";

/**
 * Tiny SQL adapter.
 * - DATABASE_URL set  → Neon serverless Postgres (production on Vercel).
 * - DATABASE_URL unset → PGlite (Postgres in WASM) stored in ./.data/pglite,
 *   so the app runs locally with zero setup. On Vercel without a database it
 *   falls back to /tmp, which is NOT persistent (demo only).
 */

type Row = Record<string, unknown>;
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

const g = globalThis as unknown as {
  __ecQuery?: QueryFn;
  __ecReady?: Promise<void>;
};

async function createQuery(): Promise<QueryFn> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return async (text, params = []) => (await sql.query(text, params)) as Row[];
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir =
    process.env.PGLITE_DIR || (process.env.VERCEL ? "/tmp/pglite" : "./.data/pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  return async (text, params = []) => (await db.query<Row>(text, params)).rows;
}

let queryPromise: Promise<QueryFn> | undefined;
function getQuery(): Promise<QueryFn> {
  if (g.__ecQuery) return Promise.resolve(g.__ecQuery);
  queryPromise ??= createQuery().then(
    (q) => (g.__ecQuery = q),
    (e) => {
      queryPromise = undefined;
      throw e;
    },
  );
  return queryPromise;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade INT NOT NULL,
    teacher_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class_id TEXT,
    password_hash TEXT,
    activation_code TEXT,
    activated BOOLEAN NOT NULL DEFAULT FALSE,
    reset_requested_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS practice_sessions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    seq INT NOT NULL,
    kind TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    subtopic TEXT NOT NULL,
    title TEXT NOT NULL,
    focus_skill TEXT,
    instruction TEXT,
    questions JSONB NOT NULL,
    tips JSONB NOT NULL DEFAULT '[]',
    vocab JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'in_progress',
    scores JSONB,
    summary JSONB,
    teacher_status TEXT NOT NULL DEFAULT 'pending',
    teacher_scores JSONB,
    teacher_comment TEXT,
    reviewed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_student ON practice_sessions(student_id, seq)`,
  `CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    idx INT NOT NULL,
    question TEXT NOT NULL,
    transcript TEXT NOT NULL,
    audio_url TEXT,
    duration_sec REAL,
    metrics JSONB,
    evaluation JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id, idx)`,
  `CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    sort INT NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    vi TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'lilac',
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS subtopics (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    sort INT NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    tips JSONB NOT NULL DEFAULT '[]',
    vocab JSONB NOT NULL DEFAULT '[]',
    hidden BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_subtopics_topic ON subtopics(topic_id, sort)`,
  // v3: admin teachers + per-teacher topics
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE topics ADD COLUMN IF NOT EXISTS owner_id TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_topics_owner ON topics(owner_id, sort)`,
];

async function init() {
  const q = await getQuery();
  for (const stmt of SCHEMA) await q(stmt);
  const [{ n }] = await q(`SELECT count(*)::int AS n FROM users`);
  if (Number(n) === 0) {
    const { seed } = await import("./seed");
    await seed(q);
  }
  // The demo admin's login used to be ha.tran@thpt-demo.edu.vn; it is now the simpler admin@edu.vn.
  await q(
    `UPDATE users SET login = 'admin@edu.vn'
     WHERE id = 't-ha' AND login = 'ha.tran@thpt-demo.edu.vn'
       AND NOT EXISTS (SELECT 1 FROM users WHERE login = 'admin@edu.vn')`,
  );
  // The first teacher becomes admin if there is none yet.
  await q(
    `UPDATE users SET is_admin = TRUE
     WHERE id = (SELECT id FROM users WHERE role = 'teacher' ORDER BY created_at ASC, id ASC LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin)`,
  );
  // Topics created before per-teacher topics existed belong to that first teacher.
  await q(
    `UPDATE topics SET owner_id = (SELECT id FROM users WHERE role = 'teacher' ORDER BY created_at ASC, id ASC LIMIT 1)
     WHERE owner_id IS NULL`,
  );
  // Every teacher gets their own copy of the default lessons.
  const bare = await q(
    `SELECT u.id FROM users u WHERE u.role = 'teacher'
       AND NOT EXISTS (SELECT 1 FROM topics t WHERE t.owner_id = u.id)`,
  );
  if (bare.length) {
    const { copyDefaultTopics } = await import("./seed");
    for (const t of bare) await copyDefaultTopics(q, String(t.id));
  }
}

export async function sql<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  g.__ecReady ??= init().catch((e) => {
    g.__ecReady = undefined;
    throw e;
  });
  await g.__ecReady;
  const q = await getQuery();
  return (await q(text, params)) as T[];
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await sql<T>(text, params);
  return rows[0] ?? null;
}

export type { QueryFn };
