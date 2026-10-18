import { NextRequest } from "next/server";

type Opts = { body?: unknown; origin?: string | null; headers?: Record<string, string>; raw?: string; cookie?: string };

/** Builds a same-origin JSON POST request for route handler tests. */
export function postJson(url: string, { body, origin = "http://localhost:3000", headers = {}, raw, cookie }: Opts = {}) {
  const payload = raw ?? JSON.stringify(body ?? {});
  const h: Record<string, string> = {
    "content-type": "application/json",
    host: "localhost:3000",
    "x-forwarded-for": headers["x-forwarded-for"] ?? "203.0.113.10",
    "content-length": String(Buffer.byteLength(payload)),
    ...headers,
  };
  if (origin) h.origin = origin;
  if (cookie) h.cookie = cookie;
  return new NextRequest(url, { method: "POST", headers: h, body: payload });
}
