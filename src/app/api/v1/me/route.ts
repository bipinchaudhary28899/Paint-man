import type { NextRequest } from "next/server";
import { z } from "zod";
import { failure, fieldErrors, personalError, personalOk, readJsonBody, unauthenticated } from "@/lib/api-personal";
import { checkLimits, profileUserLimit, rateLimited } from "@/lib/auth/limits";
import { clearSessionCookies, requireUser } from "@/lib/auth/user-session";
import { deleteUser, renameUser, type PublicUser } from "@/lib/auth/users";
import { FIELD_MESSAGES } from "@/lib/leads/field-checks";

export const runtime = "nodejs";

/**
 * GET | PATCH | DELETE /api/v1/me — the signed-in customer's account (bearer token or the
 * `ps_session` cookie; cookie-signed PATCH and DELETE must come from this website).
 * - GET → 200 { kind: "user", data: { id, phone, name, createdAt } }.
 * - PATCH { "name": "Asha Verma" } (2–80 characters) → 200 with the updated user. 20 changes per
 *   account per 10 minutes.
 * - DELETE → 200 { kind: "user", data: { deleted: true } }: removes the account and every session
 *   (and clears the cookies). Its bookings stay with Paint Saathi, no longer linked to an account.
 * Errors: 400 invalid_request (details: field → message), 401 unauthenticated, 403 forbidden, 413,
 * 415, 429 rate_limited.
 * Example: GET /api/v1/me (Authorization: Bearer …) → 200 { "kind": "user", "data": { "id": "…",
 *   "phone": "9876543210", "name": "Asha Verma", "createdAt": "2026-10-31T06:30:00.000Z" } }
 */

const links = { self: "/api/v1/me", projects: "/api/v1/projects", html: "/account" };
const userOk = (user: PublicUser, label: string) => personalOk({ kind: "user", label, data: user, links });

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const { user } = auth.session;
    return userOk(user, user.name ? `The signed-in customer, ${user.name}.` : "The signed-in customer (no name set yet).");
  } catch (err) {
    return failure(err, "Reading the account");
  }
}

const profileSchema = z.object({ name: z.string().trim().min(2, FIELD_MESSAGES.name).max(80, "Use 80 characters or fewer") });

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireUser(req, { mutating: true });
    if (!auth.ok) return auth.response;
    const read = await readJsonBody(req);
    if (!read.ok) return read.response;
    const parsed = profileSchema.safeParse(read.body);
    if (!parsed.success) return personalError(400, "invalid_request", "Please check the highlighted fields.", fieldErrors(parsed.error));

    const wait = await checkLimits([[profileUserLimit(), auth.session.user.id]]);
    if (wait) return rateLimited(wait);
    const user = await renameUser(auth.session.user.id, parsed.data.name);
    if (!user) return unauthenticated();
    return userOk(user, `Name updated to ${user.name}.`);
  } catch (err) {
    return failure(err, "Updating the account");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUser(req, { mutating: true });
    if (!auth.ok) return auth.response;
    await deleteUser(auth.session.user.id);
    const res = personalOk({
      kind: "user",
      label: "The account was deleted and every device signed out. Bookings stay with Paint Saathi, no longer linked to an account.",
      data: { deleted: true },
      links: { self: "/api/v1/me", signIn: "/api/v1/auth/otp" },
    });
    clearSessionCookies(res);
    return res;
  } catch (err) {
    return failure(err, "Deleting the account");
  }
}
