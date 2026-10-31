import type { NextRequest, NextResponse } from "next/server";
import type { ZodError } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { bodyTooLarge, noStore } from "@/lib/http";
import { dbErrorCode } from "@/lib/leads/load-error";

// Helpers for the /api/v1 endpoints that touch personal data (accounts, projects, bookings): every
// answer is in the envelope and `no-store`, bodies are bounded JSON, and failures are logged by
// type only, never with the request's data.

/** A success envelope that is never cached. */
export function personalOk<T>({ headers, ...rest }: Parameters<typeof apiOk<T>>[0]) {
  return apiOk({ ...rest, headers: { ...noStore, ...headers } });
}

/** An error envelope that is never cached. */
export const personalError = (status: number, code: string, message: string, details?: unknown) => apiError(status, code, message, details, noStore);

export const unauthenticated = () => personalError(401, "unauthenticated", "Sign in to continue: your session is missing or has expired.");

/**
 * The request's JSON body, or the error to answer: 413 over 16 KB, 415 when it is not JSON,
 * 400 when it does not parse.
 */
export async function readJsonBody(req: NextRequest): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  if (bodyTooLarge(req)) return { ok: false, response: personalError(413, "payload_too_large", "The request body is too large (16 KB at most).") };
  const type = req.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type.trim())) {
    return { ok: false, response: personalError(415, "unsupported_media_type", "Send the body as JSON (Content-Type: application/json).") };
  }
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false, response: personalError(400, "invalid_request", "The request body is not valid JSON.") };
  }
}

/** Field → first message, from a zod error: the site's own wording for each field. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "body")] ??= issue.message;
  return out;
}

/**
 * The answer to an unexpected failure: 503 when the database is not configured, else 500. Logs
 * the error's type and code only (a database message can quote the values it was given).
 */
export function failure(err: unknown, context: string): NextResponse {
  const name = err instanceof Error ? err.name : "unknown";
  const code = dbErrorCode(err);
  console.error(`${context} failed:`, code ? `${name} (${code})` : name);
  if (err instanceof DatabaseNotConfiguredError) {
    return personalError(503, "database_unavailable", "Accounts are not available right now. Please call us or try again later.");
  }
  return personalError(500, "internal_error", "Something went wrong on our side. Please try again.");
}
