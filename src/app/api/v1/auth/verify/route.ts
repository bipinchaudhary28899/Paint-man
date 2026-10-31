import type { NextRequest } from "next/server";
import { z } from "zod";
import { failure, fieldErrors, personalError, personalOk, readJsonBody } from "@/lib/api-personal";
import { checkLimits, rateLimited, verifyIpLimit } from "@/lib/auth/limits";
import { maskPhone, OTP_LENGTH, verifyOtpChallenge } from "@/lib/auth/otp";
import { createUserSession, setSessionCookies } from "@/lib/auth/user-session";
import { signInUser } from "@/lib/auth/users";
import { clientIp, isSameOrigin } from "@/lib/http";
import { FIELD_MESSAGES, MOBILE_PATTERN, normalizeMobile } from "@/lib/leads/field-checks";

export const runtime = "nodejs";

const verifySchema = z.object({
  phone: z.string().max(20).transform(normalizeMobile).refine((v) => MOBILE_PATTERN.test(v), FIELD_MESSAGES.phone),
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code from the SMS`),
  client: z.enum(["web", "app"], { message: 'client must be "web" or "app"' }),
});

/**
 * POST /api/v1/auth/verify
 * Checks the SMS code and signs the customer in, creating their account on first sign-in and
 * linking every booking made with that number. Body: { "phone": "9876543210", "code": "123456",
 * "client": "web" | "app" }. "web" sets the httpOnly `ps_session` cookie and the readable
 * `ps_signed_in=1` hint (30 days); "app" returns the bearer token in the body (90 days) for
 * `Authorization: Bearer <token>`. Errors: 400 invalid_request (details: field → message),
 * 401 invalid_code (details.attemptsLeft), 403 forbidden, 410 code_expired (expired, used up or
 * never sent: ask for a new code), 413, 415, 429 rate_limited (30 tries per IP per 15 minutes).
 * Example: POST /api/v1/auth/verify { "phone": "9876543210", "code": "123456", "client": "app" } → 200
 *   { "kind": "session", "data": { "user": { "id": "…", "phone": "9876543210", "name": null }, "token": "…", "expiresAt": "2027-01-29T…Z" } }
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return personalError(403, "forbidden", "This request must come from the Paint Saathi website or app.");
  const read = await readJsonBody(req);
  if (!read.ok) return read.response;
  const parsed = verifySchema.safeParse(read.body);
  if (!parsed.success) return personalError(400, "invalid_request", "Please check the highlighted fields.", fieldErrors(parsed.error));
  const { phone, code, client } = parsed.data;

  try {
    const wait = await checkLimits([[verifyIpLimit(), clientIp(req)]]);
    if (wait) return rateLimited(wait);

    const check = await verifyOtpChallenge(phone, code);
    if (!check.ok && check.reason === "expired") {
      return personalError(410, "code_expired", "This code has expired or was used up. Ask for a new code.");
    }
    if (!check.ok) {
      const tries = check.attemptsLeft === 1 ? "1 try" : `${check.attemptsLeft} tries`;
      const message = check.attemptsLeft > 0 ? `That code is not right. ${tries} left.` : "That code is not right, and it has no tries left. Ask for a new code.";
      return personalError(401, "invalid_code", message, { attemptsLeft: check.attemptsLeft });
    }

    const user = await signInUser(phone);
    const { token, expiresAt } = await createUserSession(user.id, client);
    const res = personalOk({
      kind: "session",
      label: `Signed in with ${maskPhone(user.phone)}; the session lasts until ${expiresAt.toISOString().slice(0, 10)}.`,
      data: { user: { id: user.id, phone: user.phone, name: user.name }, ...(client === "app" && { token }), expiresAt: expiresAt.toISOString() },
      links: { self: "/api/v1/auth/verify", me: "/api/v1/me", projects: "/api/v1/projects", html: "/account" },
    });
    if (client === "web") setSessionCookies(res, token, expiresAt);
    return res;
  } catch (err) {
    return failure(err, "Signing in");
  }
}
