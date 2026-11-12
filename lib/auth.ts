import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import { one, sql } from "./db";
import type { Role, UserRow } from "./types";

const COOKIE = "ec_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return new TextEncoder().encode(s || "dev-only-secret-change-me-dev-only-secret");
}

export async function createSession(user: Pick<UserRow, "id" | "role">) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return await one<UserRow>(`SELECT * FROM users WHERE id = $1 AND activated = TRUE`, [payload.sub]);
  } catch {
    return null;
  }
}

export async function requireUser(role: Role): Promise<UserRow> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(user.role === "teacher" ? "/teacher" : "/dashboard");
  return user;
}

export async function touch(userId: string) {
  await sql(`UPDATE users SET last_active_at = now() WHERE id = $1`, [userId]);
}
