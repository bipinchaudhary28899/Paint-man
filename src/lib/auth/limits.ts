import { apiError } from "@/lib/api";
import { noStore } from "@/lib/http";
import { createRateLimiter, type RateLimiter } from "@/lib/rate-limit";

// Rate limits for the customer account endpoints (Upstash Redis on Vercel, memory locally).

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const lazy = (name: string, limit: number, windowMs: number) => {
  let limiter: RateLimiter | null = null;
  return () => (limiter ??= createRateLimiter({ name, limit, windowMs }));
};

/** Sending a code: per IP 15 an hour; per phone 1 every 30 seconds and 5 an hour. */
export const otpIpLimit = lazy("otp-ip", 15, HOUR);
export const otpPhoneShortLimit = lazy("otp-phone-short", 1, 30 * 1000);
export const otpPhoneHourLimit = lazy("otp-phone-hour", 5, HOUR);
/** Checking codes: 30 tries per IP per 15 minutes (each code also allows only 5). */
export const verifyIpLimit = lazy("otp-verify-ip", 30, 15 * MINUTE);
/** App bookings: 5 per account per 10 minutes. */
export const bookingUserLimit = lazy("booking-user", 5, 10 * MINUTE);
/** Profile changes: 20 per account per 10 minutes. */
export const profileUserLimit = lazy("profile-user", 20, 10 * MINUTE);

/**
 * Checks each limiter for its key. When any is used up, nothing is counted and the result is the
 * longest wait in seconds; otherwise one hit is recorded on each and the result is 0.
 */
export async function checkLimits(entries: [RateLimiter, string][], now = Date.now()): Promise<number> {
  const waitFor = async (blocked: [RateLimiter, string][]) =>
    Math.max(1, ...(await Promise.all(blocked.map(([l, k]) => l.retryAfterMs(k, now)))).map((ms) => Math.ceil(ms / 1000)));

  const blocked = (await Promise.all(entries.map(async (e) => ((await e[0].isBlocked(e[1], now)) ? e : null)))).filter((e) => e !== null);
  if (blocked.length) return waitFor(blocked);
  const hits = await Promise.all(entries.map(async (e) => ((await e[0].hit(e[1], now)) ? null : e)));
  const over = hits.filter((e) => e !== null);
  return over.length ? waitFor(over) : 0;
}

/** 429 `rate_limited` with the wait in `details.retryAfterSeconds` and the Retry-After header. */
export function rateLimited(retryAfterSeconds: number) {
  return apiError(
    429,
    "rate_limited",
    `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
    { retryAfterSeconds },
    { ...noStore, "Retry-After": String(retryAfterSeconds) },
  );
}
