import type { NextRequest } from "next/server";
import { z } from "zod";
import { failure, fieldErrors, personalError, personalOk, readJsonBody } from "@/lib/api-personal";
import { checkLimits, profileUserLimit, rateLimited } from "@/lib/auth/limits";
import { requireUser } from "@/lib/auth/user-session";
import { EXPO_TOKEN_PATTERN, removePushToken, savePushToken } from "@/lib/push/tokens";

export const runtime = "nodejs";

const tokenField = z.string({ message: "token must be an Expo push token" }).regex(EXPO_TOKEN_PATTERN, "token must be an Expo push token (ExponentPushToken[…])");
const registerSchema = z.object({ token: tokenField, platform: z.enum(["ios", "android"], { message: "platform must be ios or android" }) });
const removeSchema = z.object({ token: tokenField });

/**
 * POST /api/v1/me/push-tokens (the app; `Authorization: Bearer <token>` required)
 * Registers this phone for the customer's project updates (booking, inspection, quotation and work
 * stages) as push notifications. Body: { token: "ExponentPushToken[…]", platform: "ios" | "android" }.
 * Registering again refreshes it; the newest 10 phones per account are kept.
 * 201 { kind: "push-token", data: { registered: true } }.
 * DELETE /api/v1/me/push-tokens: forgets the phone (the app does this on signing out).
 * Body: { token }. 200 { kind: "push-token", data: { removed: true | false } }.
 * Both: 20 changes per account per 10 minutes. Errors: 400 invalid_request (details: field →
 * message), 401 unauthenticated, 413, 415, 429 rate_limited.
 * Example: POST /api/v1/me/push-tokens { "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", "platform": "android" }
 *   → 201 { "kind": "push-token", "data": { "registered": true } }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req, { bearerOnly: true });
    if (!auth.ok) return auth.response;
    const read = await readBody(req, registerSchema);
    if (!read.ok) return read.response;
    const wait = await checkLimits([[profileUserLimit(), auth.session.user.id]]);
    if (wait) return rateLimited(wait);
    await savePushToken(auth.session.user.id, read.data.token, read.data.platform);
    return personalOk({
      status: 201,
      kind: "push-token",
      label: "This phone gets your project updates.",
      data: { registered: true },
      links: { self: "/api/v1/me/push-tokens", me: "/api/v1/me" },
    });
  } catch (err) {
    return failure(err, "Registering a phone for updates");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUser(req, { bearerOnly: true });
    if (!auth.ok) return auth.response;
    const read = await readBody(req, removeSchema);
    if (!read.ok) return read.response;
    const wait = await checkLimits([[profileUserLimit(), auth.session.user.id]]);
    if (wait) return rateLimited(wait);
    const removed = await removePushToken(auth.session.user.id, read.data.token);
    return personalOk({
      kind: "push-token",
      label: removed ? "This phone no longer gets your project updates." : "This phone was not getting your project updates.",
      data: { removed },
      links: { self: "/api/v1/me/push-tokens", me: "/api/v1/me" },
    });
  } catch (err) {
    return failure(err, "Forgetting a phone for updates");
  }
}

/** The JSON body checked against `schema`, or the response that refuses it. */
async function readBody<T>(req: NextRequest, schema: z.ZodType<T>) {
  const read = await readJsonBody(req);
  if (!read.ok) return read;
  if (!read.body || typeof read.body !== "object" || Array.isArray(read.body)) {
    return { ok: false as const, response: personalError(400, "invalid_request", "The body must be a JSON object.") };
  }
  const parsed = schema.safeParse(read.body);
  if (!parsed.success) return { ok: false as const, response: personalError(400, "invalid_request", "Please check the fields.", fieldErrors(parsed.error)) };
  return { ok: true as const, data: parsed.data };
}
