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
];

async function init() {
  const q = await getQuery();
  for (const stmt of SCHEMA) await q(stmt);
  const [{ n }] = await q(`SELECT count(*)::int AS n FROM users`);
  if (Number(n) === 0) {
    const { seed } = await import("./seed");
    await seed(q);
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
