import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { otpChallenges } from "@/lib/db/schema";
import { getSessionSecret } from "./session";

// One-time sign-in codes sent by SMS. A code is 6 random digits, valid for 5 minutes and for at most
// 5 tries; only an HMAC of phone and code (keyed with SESSION_SECRET) is stored. Sending a new code
// cancels the phone's earlier ones.

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_ATTEMPTS = 5;

/** Codes cannot be hashed: no SESSION_SECRET in production. */
export class OtpUnavailableError extends Error {
  constructor() {
    super("Sign-in codes need SESSION_SECRET (at least 32 characters).");
    this.name = "OtpUnavailableError";
  }
}

const devSecret = ((globalThis as Record<symbol, string>)[Symbol.for("paint-saathi.dev-otp-secret")] ??= randomBytes(32).toString("base64url"));

/**
 * The HMAC key: SESSION_SECRET. Without it, development uses a random key for this server process
 * (codes only live 5 minutes); production refuses.
 */
export function otpSecret(): string {
  const secret = getSessionSecret();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new OtpUnavailableError();
  return devSecret;
}

/** "******3210": the only form of a phone number that may appear in a log or a response about sending. */
export const maskPhone = (phone: string) => `******${phone.slice(-4)}`;

export const generateCode = () => String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

export function hashCode(phone: string, code: string, secret = otpSecret()): string {
  return createHmac("sha256", secret).update(`otp:${phone}:${code}`).digest("base64url");
}

/** A stand-in for the phone in rate-limit keys (Redis), so no number is stored outside Postgres. */
export function phoneKey(phone: string, secret = otpSecret()): string {
  return createHmac("sha256", secret).update(`limit:${phone}`).digest("base64url").slice(0, 32);
}

function sameHash(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Creates a challenge for the phone (cancelling its earlier ones) and returns the code to send. */
export async function createOtpChallenge(phone: string, now = new Date()): Promise<{ code: string; expiresAt: Date }> {
  const code = generateCode();
  const codeHash = hashCode(phone, code);
  const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(otpChallenges).where(eq(otpChallenges.phone, phone));
    await tx.insert(otpChallenges).values({ phone, codeHash, expiresAt, createdAt: now });
  });
  return { code, expiresAt };
}

/** Forgets a challenge whose SMS could not be sent. */
export async function cancelOtpChallenges(phone: string): Promise<void> {
  const db = await getDb();
  await db.delete(otpChallenges).where(eq(otpChallenges.phone, phone));
}

export type OtpCheck = { ok: true } | { ok: false; reason: "invalid_code"; attemptsLeft: number } | { ok: false; reason: "expired" };

/**
 * Checks a code against the phone's live challenge. A wrong code uses up one of the 5 tries (the
 * last one ends the challenge); a right one consumes it, so each code works once. No live
 * challenge (expired, used up, never sent) is `expired`: the customer asks for a new code.
 */
export async function verifyOtpChallenge(phone: string, code: string, now = new Date()): Promise<OtpCheck> {
  const db = await getDb();
  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(and(eq(otpChallenges.phone, phone), isNull(otpChallenges.consumedAt)))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);
  if (!challenge || challenge.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };

  // count the try first, atomically, so parallel guesses cannot exceed the limit
  const [counted] = await db
    .update(otpChallenges)
    .set({ attempts: sql`${otpChallenges.attempts} + 1` })
    .where(and(eq(otpChallenges.id, challenge.id), isNull(otpChallenges.consumedAt), lt(otpChallenges.attempts, OTP_MAX_ATTEMPTS)))
    .returning({ attempts: otpChallenges.attempts });
  if (!counted) return { ok: false, reason: "expired" };

  if (sameHash(hashCode(phone, code), challenge.codeHash)) {
    const [consumed] = await db
      .update(otpChallenges)
      .set({ consumedAt: now })
      .where(and(eq(otpChallenges.id, challenge.id), isNull(otpChallenges.consumedAt)))
      .returning({ id: otpChallenges.id });
    return consumed ? { ok: true } : { ok: false, reason: "expired" };
  }

  const attemptsLeft = OTP_MAX_ATTEMPTS - counted.attempts;
  if (attemptsLeft <= 0) await db.update(otpChallenges).set({ consumedAt: now }).where(eq(otpChallenges.id, challenge.id));
  return { ok: false, reason: "invalid_code", attemptsLeft };
}
