import { NextResponse } from "next/server";

/**
 * Every public JSON API answers in this envelope so an AI integration (or any client) can
 * read it without knowing the endpoint: `data` is always the payload, `label` says what it is
 * in plain words, `kind` names the record type, and `apiVersion` tracks breaking changes.
 * Versioning is in the path (/api/v1/...) AND in the body; bump both together.
 *
 * {
 *   "apiVersion": "v1",
 *   "kind": "paint-colour",      // record type, singular
 *   "label": "1 brand paint shade matching \"8386\", from Asian Paints (page 1 of 1)", // human/LLM-readable summary
 *   "data": {...} | [...],
 *   "meta": { "total": 1, "query": {...}, "generatedAt": "..." },
 *   "links": { "self": "/api/v1/colours/paint?brand=asian-paints&q=8386", "html": "/colours?brand=asian-paints&q=8386" }
 * }
 */
export const API_VERSION = "v1" as const;

export type ApiEnvelope<T> = {
  apiVersion: typeof API_VERSION;
  kind: string;
  label: string;
  data: T;
  meta: Record<string, unknown> & { generatedAt: string };
  links?: Record<string, string>;
};

export type ApiErrorBody = {
  apiVersion: typeof API_VERSION;
  kind: "error";
  label: string;
  error: { code: string; message: string; details?: unknown };
  meta: { generatedAt: string };
};

type OkOpts<T> = { kind: string; label: string; data: T; meta?: Record<string, unknown>; links?: Record<string, string>; headers?: HeadersInit };

export function apiOk<T>({ kind, label, data, meta = {}, links, headers }: OkOpts<T>) {
  const body: ApiEnvelope<T> = {
    apiVersion: API_VERSION,
    kind,
    label,
    data,
    meta: { ...meta, generatedAt: new Date().toISOString() },
    ...(links && { links }),
  };
  return NextResponse.json(body, { headers });
}

/** An error in the envelope. `headers` is for the rare cacheable error, such as a 410 for a retired endpoint. */
export function apiError(status: number, code: string, message: string, details?: unknown, headers?: HeadersInit) {
  const body: ApiErrorBody = {
    apiVersion: API_VERSION,
    kind: "error",
    label: message,
    error: { code, message, ...(details !== undefined && { details }) },
    meta: { generatedAt: new Date().toISOString() },
  };
  return NextResponse.json(body, { status, headers });
}

/** Public, read-only catalogue data: cache at the edge for a day, serve stale while revalidating. */
export const publicCache = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" };
