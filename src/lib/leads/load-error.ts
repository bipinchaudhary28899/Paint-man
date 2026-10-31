import { DatabaseNotConfiguredError } from "@/lib/db/client";

/** The error code of a database failure: Postgres's SQLSTATE or the driver's network code, looking through wrapped causes. */
export function dbErrorCode(err: unknown): string {
  for (let e: unknown = err, depth = 0; e && typeof e === "object" && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

const NETWORK = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "CONNECT_TIMEOUT", "CONNECTION_CLOSED", "CONNECTION_ENDED"]);

/**
 * Turns a lead-loading failure into a fix-it message for the signed-in admin.
 * Messages name settings, never their values.
 */
export function leadLoadErrorMessage(err: unknown): string {
  if (err instanceof DatabaseNotConfiguredError) {
    return "The database isn't connected yet. Add DATABASE_URL (the Supabase pooled connection string) to the environment settings (on Vercel: Settings → Environment Variables), then redeploy.";
  }
  const code = dbErrorCode(err);
  if (code === "42P01") return "The database has no tables yet. Run npm run db:migrate with DATABASE_URL_DIRECT set, then refresh.";
  if (code === "28P01" || code === "28000") {
    return "The database refused the login in DATABASE_URL. Copy the connection string again from Supabase (Connect → Transaction pooler), check the password, then redeploy.";
  }
  if (NETWORK.has(code)) return "Couldn't reach the database. Check the host and port in DATABASE_URL and that the Supabase project isn't paused, then refresh.";
  return "Couldn't load leads. Check the server logs and the database settings, then try again.";
}
