import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { personalError, unauthenticated } from "@/lib/api-personal";
import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { isSameOrigin } from "@/lib/http";
import { toPublicUser, type PublicUser } from "./users";

// Customer sessions (separate from the admin login in ./session.ts).
//
// A session is a random 32-byte token; the database keeps only its sha256. The website holds it in
// the httpOnly cookie `ps_session` (plus `ps_signed_in=1`, a readable hint with no personal data so
// static pages can show "My account" without a request); the app keeps it in secure storage and
// sends `Authorization: Bearer <token>`. Lookups try the bearer header first, then the cookie.

export const SESSION_COOKIE = "ps_session";
export const SIGNED_IN_COOKIE = "ps_signed_in";
export type SessionClient = "web" | "app";
export const SESSION_TTL_DAYS: Record<SessionClient, number> = { web: 30, app: 90 };

/** last_used_at is refreshed at most this often, so reading a session is not a write every time. */
const TOUCH_AFTER_MS = 60 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type UserSession = { sessionId: string; client: SessionClient; expiresAt: Date; user: PublicUser; via: "bearer" | "cookie" };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");

export async function createUserSession(userId: string, client: SessionClient, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS[client] * 24 * 60 * 60 * 1000);
  const db = await getDb();
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), client, expiresAt, createdAt: now, lastUsedAt: now });
  return { token, expiresAt };
}

/** The token a request carries: `Authorization: Bearer` first, else the `ps_session` cookie. */
export function requestToken(req: NextRequest): { token: string; via: "bearer" | "cookie" } | null {
  const auth = req.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(\S+)\s*$/i)?.[1];
  if (bearer) return { token: bearer, via: "bearer" };
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  return cookie ? { token: cookie, via: "cookie" } : null;
}

/** The live session for a token, with its user, or null (malformed, unknown or expired). */
export async function findSession(token: string, now = new Date()): Promise<Omit<UserSession, "via"> | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  if (now.getTime() - row.session.lastUsedAt.getTime() > TOUCH_AFTER_MS) {
    await db.update(sessions).set({ lastUsedAt: now }).where(eq(sessions.id, row.session.id));
  }
  return { sessionId: row.session.id, client: row.session.client, expiresAt: row.session.expiresAt, user: toPublicUser(row.user) };
}

/** The signed-in customer of a request (bearer, then cookie), or null. */
export async function readUserSession(req: NextRequest, now = new Date()): Promise<UserSession | null> {
  const found = requestToken(req);
  if (!found) return null;
  const session = await findSession(found.token, now);
  return session ? { ...session, via: found.via } : null;
}

export async function deleteUserSession(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * The session, or the error to answer: 401 `unauthenticated` without a live one, 403 `forbidden`
 * for a cookie-signed request that changes something from another site. `bearerOnly` refuses the
 * cookie (the app's endpoints).
 */
export async function requireUser(
  req: NextRequest,
  { mutating = false, bearerOnly = false }: { mutating?: boolean; bearerOnly?: boolean } = {},
): Promise<{ ok: true; session: UserSession } | { ok: false; response: NextResponse }> {
  const session = await readUserSession(req);
  if (!session || (bearerOnly && session.via !== "bearer")) return { ok: false, response: unauthenticated() };
  if (mutating && session.via === "cookie" && !isSameOrigin(req)) {
    return { ok: false, response: personalError(403, "forbidden", "This request must come from the Paint Saathi website.") };
  }
  return { ok: true, session };
}

const cookieBase = () => ({ secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" });

/** Signs the browser in: the httpOnly session cookie and the readable hint, for the session's lifetime. */
export function setSessionCookies(res: NextResponse, token: string, expiresAt: Date, now = new Date()) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
  res.cookies.set(SESSION_COOKIE, token, { ...cookieBase(), httpOnly: true, maxAge });
  res.cookies.set(SIGNED_IN_COOKIE, "1", { ...cookieBase(), httpOnly: false, maxAge });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase(), httpOnly: true, maxAge: 0 });
  res.cookies.set(SIGNED_IN_COOKIE, "", { ...cookieBase(), httpOnly: false, maxAge: 0 });
}

/**
 * The signed-in customer for a server component or server action (the website's /account pages),
 * from the session cookie, or null.
 */
export async function getSignedInUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return (await findSession(token))?.user ?? null;
}
