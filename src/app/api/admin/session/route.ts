import type { NextRequest } from "next/server";
import { adminLogin } from "@/lib/admin/login";
import { failure, personalError, personalOk } from "@/lib/api-personal";
import { bodyTooLarge, isSameOrigin } from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST /api/admin/session
 * Admin sign-in for the phone app: the same check and lockout as the website's form (POST
 * /api/admin/login), but the signed session comes back as a token for the app to keep and send as
 * `Authorization: Bearer <token>` to every /api/admin endpoint. It lasts 8 hours (`expiresAt`); the
 * app signs out by forgetting it. Body: { username, password }.
 * 200 { kind: "admin-session", data: { username, token, expiresAt } }. Errors: 400 invalid_request,
 * 401 invalid_credentials, 403 forbidden (cross-site), 413 payload_too_large, 429 rate_limited,
 * 503 not_configured, 500 internal_error. Never cached.
 * Example: POST /api/admin/session { "username": "owner", "password": "…" }
 *   → 200 { "kind": "admin-session", "data": { "username": "owner", "token": "eyJ…", "expiresAt": "2026-11-01T14:00:00.000Z" } }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return personalError(403, "forbidden", "Cross-site requests are not accepted.");
    if (bodyTooLarge(req)) return personalError(413, "payload_too_large", "The request body is too large (16 KB at most).");
    const result = await adminLogin(req, () => req.json());
    if (!result.ok) return personalError(result.status, result.code, result.message);
    const { username, token, expiresAt } = result;
    return personalOk({
      kind: "admin-session",
      label: `Signed in as ${username} until ${expiresAt}.`,
      data: { username, token, expiresAt },
      links: { self: "/api/admin/session", html: "/admin", leads: "/api/admin/leads", projects: "/api/admin/projects" },
    });
  } catch (err) {
    return failure(err, "Admin sign-in");
  }
}
