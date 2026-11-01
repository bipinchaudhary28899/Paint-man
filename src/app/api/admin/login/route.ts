import { NextResponse, type NextRequest } from "next/server";
import { adminLogin } from "@/lib/admin/login";
import { SESSION_TTL_SECONDS, sessionCookieName } from "@/lib/auth/session";
import { bodyTooLarge, isSameOrigin, noStore } from "@/lib/http";

export const runtime = "nodejs";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status, headers: noStore });

/**
 * POST /api/admin/login
 * The website's admin sign-in form. Body: { username, password }. On success the signed session is
 * set as an HttpOnly cookie and the answer is { ok: true }; failures are { ok: false, error } with
 * 400, 401, 403 (cross-site), 413, 429 (lockout, shared with the app's POST /api/admin/session) or 503.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail(403, "Forbidden.");
  if (bodyTooLarge(req)) return fail(413, "Request too large.");

  const result = await adminLogin(req, () => req.json());
  if (!result.ok) return fail(result.status, result.message);

  const res = NextResponse.json({ ok: true }, { headers: noStore });
  res.cookies.set(sessionCookieName(), result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
