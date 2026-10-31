// The browser side of the account API (/api/v1/auth/*, /api/v1/me): one JSON request, read through
// the envelope (src/lib/api.ts), so a form shows the API's own words for every error.

export const NETWORK_ERROR = "Network error. Please check your connection and try again.";
const UNKNOWN_ERROR = "Something went wrong on our side. Please try again.";

export type ApiFailure = { ok: false; status: number; code: string; message: string; details?: unknown };
export type ApiResult<T> = { ok: true; status: number; data: T } | ApiFailure;

/** Sends `body` as JSON (or nothing) to a same-origin endpoint and unwraps the envelope. */
export async function callApi<T>(path: string, { method = "POST", body }: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      ...(body !== undefined && { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch {
    return { ok: false, status: 0, code: "network_error", message: NETWORK_ERROR };
  }
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { code?: string; message?: string; details?: unknown } } | null;
  if (res.ok && json && "data" in json) return { ok: true, status: res.status, data: json.data as T };
  const error = json?.error;
  return { ok: false, status: res.status, code: error?.code ?? "unknown", message: error?.message ?? UNKNOWN_ERROR, ...(error?.details !== undefined && { details: error.details }) };
}

/** "45 seconds", "1 minute", "50 minutes". */
export function waitText(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/** The seconds a 429 `rate_limited` answer asks to wait, or undefined. */
export function retryAfter(failure: ApiFailure): number | undefined {
  const seconds = (failure.details as { retryAfterSeconds?: unknown } | undefined)?.retryAfterSeconds;
  return failure.code === "rate_limited" && typeof seconds === "number" && seconds > 0 ? Math.ceil(seconds) : undefined;
}

/** What to show for a failed request: the API's message, with a rate limit's wait in minutes once it is long. */
export function errorText(failure: ApiFailure): string {
  const wait = retryAfter(failure);
  return wait ? `Too many requests. Try again in ${waitText(wait)}.` : failure.message;
}

/** The message for one field from a 400's `details` (field → message), else the general message. */
export function fieldError(failure: ApiFailure, field: string): string {
  const details = failure.details as Record<string, unknown> | undefined;
  const message = details && typeof details === "object" ? details[field] : undefined;
  return typeof message === "string" ? message : errorText(failure);
}
