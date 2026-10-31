import type { NextRequest } from "next/server";
import { failure, personalError, personalOk, readJsonBody } from "@/lib/api-personal";
import { checkLimits, otpIpLimit, otpPhoneHourLimit, otpPhoneShortLimit, rateLimited } from "@/lib/auth/limits";
import { cancelOtpChallenges, createOtpChallenge, maskPhone, OTP_RESEND_SECONDS, OTP_TTL_SECONDS, otpSecret, OtpUnavailableError, phoneKey } from "@/lib/auth/otp";
import { getOtpProvider } from "@/lib/auth/otp-provider";
import { clientIp, isSameOrigin } from "@/lib/http";
import { FIELD_MESSAGES, MOBILE_PATTERN, normalizeMobile } from "@/lib/leads/field-checks";

export const runtime = "nodejs";

/**
 * POST /api/v1/auth/otp
 * Sends a 6-digit sign-in code by SMS to an Indian mobile number (valid 5 minutes, 5 tries). The
 * answer is the same whether or not the number has an account. Body: { "phone": "98765 43210" }
 * (spaces, +91, 91 or 0 allowed). Limits: per number 1 code every 30 s and 5 an hour; per IP 15 an
 * hour. Errors: 400 invalid_phone, 403 forbidden (another website), 413, 415, 429 rate_limited
 * (details.retryAfterSeconds), 503 otp_unavailable (SMS not configured or not accepted).
 * Example: POST /api/v1/auth/otp { "phone": "9876543210" } → 200 { "kind": "otp", "data": { "sent": true,
 *   "phone": "******3210", "expiresInSeconds": 300, "resendInSeconds": 30 } }
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return personalError(403, "forbidden", "This request must come from the Paint Saathi website or app.");
  const read = await readJsonBody(req);
  if (!read.ok) return read.response;

  const raw = (read.body as { phone?: unknown } | null)?.phone;
  const phone = typeof raw === "string" && raw.length <= 20 ? normalizeMobile(raw) : "";
  if (!MOBILE_PATTERN.test(phone)) return personalError(400, "invalid_phone", FIELD_MESSAGES.phone);

  const provider = getOtpProvider();
  const unavailable = () => personalError(503, "otp_unavailable", "We can't send sign-in codes right now. Please call us or try again later.");
  if (!provider) return unavailable();

  try {
    const key = phoneKey(phone, otpSecret());
    const wait = await checkLimits([
      [otpIpLimit(), clientIp(req)],
      [otpPhoneShortLimit(), key],
      [otpPhoneHourLimit(), key],
    ]);
    if (wait) return rateLimited(wait);

    const { code } = await createOtpChallenge(phone);
    try {
      await provider.send(phone, code);
    } catch (err) {
      await cancelOtpChallenges(phone);
      console.error("Sign-in code not sent:", err instanceof Error ? err.message.slice(0, 120) : "unknown");
      return unavailable();
    }
    return personalOk({
      kind: "otp",
      label: `A ${code.length}-digit sign-in code was sent to ${maskPhone(phone)}. It works for ${OTP_TTL_SECONDS / 60} minutes.`,
      data: { sent: true, phone: maskPhone(phone), expiresInSeconds: OTP_TTL_SECONDS, resendInSeconds: OTP_RESEND_SECONDS },
      links: { self: "/api/v1/auth/otp", verify: "/api/v1/auth/verify" },
    });
  } catch (err) {
    if (err instanceof OtpUnavailableError) return unavailable();
    return failure(err, "Sending a sign-in code");
  }
}
