import type { NextRequest } from "next/server";

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Blocks cross-site requests: browsers always send Origin on POST, so a
 * mismatch means another site is trying to submit to us.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const MAX_BODY_BYTES = 16 * 1024;

export function bodyTooLarge(req: NextRequest): boolean {
  const len = Number(req.headers.get("content-length") ?? 0);
  return Number.isFinite(len) && len > MAX_BODY_BYTES;
}

export const noStore = { "Cache-Control": "no-store, max-age=0" };
