import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import type { ZodError, ZodType } from "zod";
import { failure, personalError } from "@/lib/api-personal";
import { getAdminConfig } from "@/lib/auth/config";
import { sessionCookieName, verifySessionToken, type SessionPayload } from "@/lib/auth/session";
import { isSameOrigin, MAX_BODY_BYTES } from "@/lib/http";
import { ProjectError } from "@/lib/projects/repo";

// The checks every /api/admin endpoint makes before it touches data: the signed admin session (the
// same cookie and rules as getAdminSession in src/lib/auth/server.ts, read from the request so a
// route handler needs nothing else), same-origin for anything that changes data, and bounded,
// validated JSON. Answers use the API envelope and are never cached.

type Rejected = { ok: false; response: NextResponse };

/** The admin session a request carries, or null (no cookie, forged, expired, another username or login not set up). */
export async function adminSessionFrom(req: NextRequest): Promise<SessionPayload | null> {
  const config = getAdminConfig();
  if (!config) return null;
  const session = await verifySessionToken(req.cookies.get(sessionCookieName())?.value, config.secret);
  return session && session.sub === config.username ? session : null;
}

/**
 * Lets the request through only with a valid admin session; one that changes data (the default)
 * must also come from this site. 403 `forbidden` cross-site, 401 `unauthenticated` without a session.
 */
export async function requireAdminRequest(req: NextRequest, { mutating = true } = {}): Promise<{ ok: true; session: SessionPayload } | Rejected> {
  if (mutating && !isSameOrigin(req)) return { ok: false, response: personalError(403, "forbidden", "Cross-site requests are not accepted.") };
  const session = await adminSessionFrom(req);
  if (!session) return { ok: false, response: personalError(401, "unauthenticated", "Your admin session has ended. Sign in again at /admin/login.") };
  return { ok: true, session };
}

/** "lines.1.item" → "Line 2", so a message can say which quotation line it is about. */
function where(path: PropertyKey[]): string {
  return path[0] === "lines" && typeof path[1] === "number" ? `Line ${path[1] + 1}` : "";
}

/** Field path ("stage", "lines.1.amountPaise") → message; a bad choice lists the valid ones. */
export function inputErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "body";
    const values = "values" in issue && Array.isArray(issue.values) ? issue.values : null;
    out[key] ??= values ? `${issue.message} (one of: ${values.join(", ")})` : issue.message;
  }
  return out;
}

/**
 * The request's JSON body, bounded: 413 over `maxBytes` (16 KB unless the endpoint allows more, as a
 * long quotation needs), 415 when it is not JSON, 400 when it does not parse.
 */
async function readBody(req: NextRequest, maxBytes: number): Promise<{ ok: true; body: unknown } | Rejected> {
  const tooLarge = () => ({ ok: false as const, response: personalError(413, "payload_too_large", `The request body is too large (${Math.round(maxBytes / 1024)} KB at most).`) });
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return tooLarge();
  if (!/^application\/json\b/i.test((req.headers.get("content-type") ?? "").trim())) {
    return { ok: false, response: personalError(415, "unsupported_media_type", "Send the body as JSON (Content-Type: application/json).") };
  }
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) return tooLarge();
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: personalError(400, "invalid_request", "The request body is not valid JSON.") };
  }
}

/** The request's JSON body validated by `schema`, or the error to answer (400 with field messages, 413, 415). */
export async function readAdminInput<T>(req: NextRequest, schema: ZodType<T>, { maxBytes = MAX_BODY_BYTES } = {}): Promise<{ ok: true; data: T } | Rejected> {
  const body = await readBody(req, maxBytes);
  if (!body.ok) return body;
  const parsed = schema.safeParse(body.body);
  if (parsed.success) return { ok: true, data: parsed.data };
  const first = parsed.error.issues[0];
  const details = inputErrors(parsed.error);
  const message = details[first.path.length ? first.path.map(String).join(".") : "body"];
  const prefix = where(first.path);
  return { ok: false, response: personalError(400, "invalid_request", prefix ? `${prefix}: ${message}` : message, details) };
}

/**
 * The answer to a failed admin action: 404 for a missing project or quotation, 409 when the action
 * does not fit the current state (with the repo's message, e.g. "Version 2 has already been sent."),
 * else 503/500 as for every personal-data endpoint.
 */
export function adminFailure(err: unknown, context: string): NextResponse {
  if (err instanceof ProjectError) {
    return err.code === "not_found" ? personalError(404, "not_found", err.message) : personalError(409, "invalid_state", err.message);
  }
  return failure(err, context);
}
