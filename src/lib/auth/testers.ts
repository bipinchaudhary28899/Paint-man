import "server-only";
import { timingSafeEqual } from "node:crypto";
import { MOBILE_PATTERN, normalizeMobile } from "@/lib/leads/field-checks";
import { OTP_LENGTH } from "./otp";

// Tester sign-in, for the owner (and later the App Store's reviewer): the numbers in LOGIN_TEST_PHONES
// (comma-separated 10-digit mobiles) sign in with LOGIN_TEST_CODE (a secret 6-digit code) instead of
// an SMS, in development and in production, whether or not customer login is open. No SMS is sent
// for them. Both live only in the environment (Vercel, .env.local), never in the repository. With
// either unset there are no testers.

type Env = Record<string, string | undefined>;

/** Codes anyone would try first: one digit six times, or a straight run. */
const OBVIOUS = /^(\d)\1{5}$|^(012345|123456|234567|345678|456789|987654|876543|765432|654321|543210)$/;

/** The tester code, when it is set and a real secret (6 digits, not 000000 or 123456). */
export function testerCode(env: Env = process.env): string | undefined {
  const code = env.LOGIN_TEST_CODE?.trim();
  return code && new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code) && !OBVIOUS.test(code) ? code : undefined;
}

/** The tester numbers, normalised; the ones that are not Indian mobiles are dropped. */
export function testerPhones(env: Env = process.env): Set<string> {
  return new Set(
    (env.LOGIN_TEST_PHONES ?? "")
      .split(",")
      .map((p) => normalizeMobile(p))
      .filter((p) => MOBILE_PATTERN.test(p)),
  );
}

/** Whether this (normalised) number signs in with the tester code. */
export const isTester = (phone: string, env: Env = process.env) => testerCode(env) !== undefined && testerPhones(env).has(phone);

/** Whether `code` is the tester code, compared in constant time. */
export function testerCodeMatches(code: string, env: Env = process.env): boolean {
  const expected = testerCode(env);
  if (!expected || code.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(code), Buffer.from(expected));
}
