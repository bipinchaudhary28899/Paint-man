import { getSessionSecret } from "./session";

export type AdminConfig = { username: string; passwordHash: string; secret: string };

/** Admin login is disabled unless all three settings are present. */
export function getAdminConfig(): AdminConfig | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const secret = getSessionSecret();
  if (!username || !passwordHash?.startsWith("scrypt:") || !secret) return null;
  return { username, passwordHash, secret };
}
