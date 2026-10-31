import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { leads, projects, users } from "@/lib/db/schema";

// Customer accounts: one per verified mobile number. Separate from the admin login.

export type PublicUser = { id: string; phone: string; name: string | null; createdAt: string };

export const toPublicUser = (u: { id: string; phone: string; name: string | null; createdAt: Date }): PublicUser => ({
  id: u.id,
  phone: u.phone,
  name: u.name,
  createdAt: u.createdAt.toISOString(),
});

/**
 * After a verified code: creates the account for the phone (or finds it), records the sign-in and
 * links every lead and project with that phone and no account yet. One transaction.
 */
export async function signInUser(phone: string, now = new Date()): Promise<PublicUser> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ phone, lastLoginAt: now })
      .onConflictDoUpdate({ target: users.phone, set: { lastLoginAt: now } })
      .returning();
    await tx.update(projects).set({ userId: user.id }).where(and(eq(projects.phone, phone), isNull(projects.userId)));
    await tx.update(leads).set({ userId: user.id }).where(and(eq(leads.phone, phone), isNull(leads.userId)));
    return toPublicUser(user);
  });
}

export async function getUser(id: string): Promise<PublicUser | null> {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ? toPublicUser(user) : null;
}

export async function renameUser(id: string, name: string): Promise<PublicUser | null> {
  const db = await getDb();
  const [user] = await db.update(users).set({ name }).where(eq(users.id, id)).returning();
  return user ? toPublicUser(user) : null;
}

/**
 * Deletes the account and, through the foreign keys, its sessions. Its leads and projects stay
 * for the business, unlinked (user_id becomes null).
 */
export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDb();
  const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  return deleted.length > 0;
}
