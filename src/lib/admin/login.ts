import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminConfig } from "@/lib/auth/config";
import { safeEqual, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { clientIp } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";

// The admin sign-in check, shared by the website's form (POST /api/admin/login sets the session
// cookie) and the phone app (POST /api/admin/session answers the same signed token, which the app
// sends as a bearer token). One set of limits covers both, so the app is no way around the lockout.

const credentials = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

// 5 failed attempts per IP per 15 minutes, and 30 failures site-wide.
const perIp = createRateLimiter({ name: "login-ip", limit: 5, windowMs: 15 * 60 * 1000 });
const global = createRateLimiter({ name: "login-all", limit: 30, windowMs: 15 * 60 * 1000 });

// A real hash so failed usernames take as long as failed passwords.
const DUMMY_HASH = "scrypt:32768:8:1:AAAAAAAAAAAAAAAAAAAAAA:" + Buffer.alloc(64).toString("base64url");

export type AdminLoginFailure = { ok: false; status: 400 | 401 | 429 | 503; code: string; message: string };
export type AdminLoginResult = { ok: true; username: string; token: string; expiresAt: string } | AdminLoginFailure;

const fail = (status: AdminLoginFailure["status"], code: string, message: string): AdminLoginFailure => ({ ok: false, status, code, message });

/**
 * Checks a sign-in: admin login set up, the IP and the site not locked out, then the username and
 * password from `readBody` (which throws on a body that is not JSON). A wrong username or password
 * counts against both limits; a right one clears the IP's count and returns a fresh session token.
 */
export async function adminLogin(req: NextRequest, readBody: () => Promise<unknown>, now = Date.now()): Promise<AdminLoginResult> {
  const config = getAdminConfig();
  if (!config) return fail(503, "not_configured", "Admin login is not configured.");

  const ip = clientIp(req);
  if ((await perIp.isBlocked(ip)) || (await global.isBlocked("all"))) {
    return fail(429, "rate_limited", "Too many attempts. Try again in 15 minutes.");
  }

  let body: unknown;
  try {
    body = await readBody();
  } catch {
    return fail(400, "invalid_request", "Invalid request.");
  }
  const parsed = credentials.safeParse(body);
  if (!parsed.success) return fail(400, "invalid_request", "Enter your username and password.");

  const { username, password } = parsed.data;
  const userOk = safeEqual(username, config.username);
  const passOk = await verifyPassword(password, userOk ? config.passwordHash : DUMMY_HASH);

  if (!userOk || !passOk) {
    await Promise.all([perIp.hit(ip), global.hit("all")]);
    return fail(401, "invalid_credentials", "Incorrect username or password.");
  }

  await perIp.reset(ip);
  const token = await createSessionToken(config.username, config.secret, now);
  const expiresAt = new Date((Math.floor(now / 1000) + SESSION_TTL_SECONDS) * 1000).toISOString();
  return { ok: true, username: config.username, token, expiresAt };
}
