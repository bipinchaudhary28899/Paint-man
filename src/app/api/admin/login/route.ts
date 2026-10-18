import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminConfig } from "@/lib/auth/config";
import { safeEqual, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_TTL_SECONDS, sessionCookieName } from "@/lib/auth/session";
import { bodyTooLarge, clientIp, isSameOrigin, noStore } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

const credentials = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

// 5 failed attempts per IP per 15 minutes, and 30 failures site-wide.
const perIp = createRateLimiter({ name: "login-ip", limit: 5, windowMs: 15 * 60 * 1000 });
const global = createRateLimiter({ name: "login-all", limit: 30, windowMs: 15 * 60 * 1000 });

// A real hash so failed usernames take as long as failed passwords.
const DUMMY_HASH =
  "scrypt:32768:8:1:AAAAAAAAAAAAAAAAAAAAAA:" + Buffer.alloc(64).toString("base64url");

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status, headers: noStore });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail(403, "Forbidden.");
  if (bodyTooLarge(req)) return fail(413, "Request too large.");

  const config = getAdminConfig();
  if (!config) return fail(503, "Admin login is not configured.");

  const ip = clientIp(req);
  if ((await perIp.isBlocked(ip)) || (await global.isBlocked("all"))) {
    return fail(429, "Too many attempts. Try again in 15 minutes.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request.");
  }
  const parsed = credentials.safeParse(body);
  if (!parsed.success) return fail(400, "Enter your username and password.");

  const { username, password } = parsed.data;
  const userOk = safeEqual(username, config.username);
  const passOk = await verifyPassword(password, userOk ? config.passwordHash : DUMMY_HASH);

  if (!userOk || !passOk) {
    await Promise.all([perIp.hit(ip), global.hit("all")]);
    return fail(401, "Incorrect username or password.");
  }

  await perIp.reset(ip);
  const token = await createSessionToken(config.username, config.secret);
  const res = NextResponse.json({ ok: true }, { headers: noStore });
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
