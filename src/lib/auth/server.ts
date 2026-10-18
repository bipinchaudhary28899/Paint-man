import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminConfig } from "./config";
import { sessionCookieName, verifySessionToken, type SessionPayload } from "./session";

/** Returns the signed-in admin session, or null. Always checked on the server. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const config = getAdminConfig();
  if (!config) return null;
  const token = (await cookies()).get(sessionCookieName())?.value;
  const session = await verifySessionToken(token, config.secret);
  return session && session.sub === config.username ? session : null;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
