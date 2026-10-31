import type { NextRequest } from "next/server";
import { failure, personalError, personalOk } from "@/lib/api-personal";
import { clearSessionCookies, deleteUserSession, readUserSession } from "@/lib/auth/user-session";
import { isSameOrigin } from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST /api/v1/auth/logout
 * Signs out: ends the session of the bearer token (app) or the `ps_session` cookie (website) and
 * clears both cookies. Safe to repeat: without a live session it still answers 200. No body.
 * Errors: 403 forbidden (a cookie-signed request from another website).
 * Example: POST /api/v1/auth/logout (Authorization: Bearer …) → 200 { "kind": "session", "data": { "signedOut": true } }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await readUserSession(req);
    if (session?.via === "cookie" && !isSameOrigin(req)) {
      return personalError(403, "forbidden", "This request must come from the Paint Saathi website.");
    }
    if (session) await deleteUserSession(session.sessionId);
    const res = personalOk({
      kind: "session",
      label: "Signed out.",
      data: { signedOut: true },
      links: { self: "/api/v1/auth/logout", signIn: "/api/v1/auth/otp", html: "/login" },
    });
    clearSessionCookies(res);
    return res;
  } catch (err) {
    return failure(err, "Signing out");
  }
}
