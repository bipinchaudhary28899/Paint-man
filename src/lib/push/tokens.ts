import "server-only";
import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { pushTokens } from "@/lib/db/schema";

// The phones that get a customer's project updates: Expo push tokens, saved when the app registers
// one and forgotten when the customer signs out or Expo reports the phone gone.

export type PushPlatform = "ios" | "android";

/** How many phones per account get updates: the ones that registered last. */
export const MAX_TOKENS_PER_USER = 10;

/** An Expo push token: "ExponentPushToken[…]" (or the newer "ExpoPushToken[…]"). */
export const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/;

/** Saves a phone's token for the account (moving it over if another account had it), keeping the newest few. */
export async function savePushToken(userId: string, token: string, platform: PushPlatform, now: Date = new Date()): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .insert(pushTokens)
      .values({ token, userId, platform, createdAt: now, lastSeenAt: now })
      .onConflictDoUpdate({ target: pushTokens.token, set: { userId, platform, lastSeenAt: now } });
    const keep = await tx.select({ token: pushTokens.token }).from(pushTokens).where(eq(pushTokens.userId, userId)).orderBy(desc(pushTokens.lastSeenAt)).limit(MAX_TOKENS_PER_USER);
    await tx.delete(pushTokens).where(and(eq(pushTokens.userId, userId), notInArray(pushTokens.token, keep.map((k) => k.token))));
  });
}

/** Forgets one of the account's phones; true when it had it. */
export async function removePushToken(userId: string, token: string): Promise<boolean> {
  const db = await getDb();
  const gone = await db.delete(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token))).returning({ token: pushTokens.token });
  return gone.length > 0;
}

/** The account's phones. */
export async function tokensFor(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ token: pushTokens.token }).from(pushTokens).where(eq(pushTokens.userId, userId));
  return rows.map((r) => r.token);
}

/** Deletes tokens Expo reported as no longer registered. */
export async function dropTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  const db = await getDb();
  await db.delete(pushTokens).where(inArray(pushTokens.token, tokens));
}
