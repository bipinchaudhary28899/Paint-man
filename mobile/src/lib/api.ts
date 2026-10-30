import { apiBase } from "./config";

// A client for the website's public JSON API (/api/v1/...). Every response comes in the envelope
// described in the website's src/lib/api.ts and AGENTS.md rule 3; the app relies only on that
// public contract, as any other integration would.

export type ApiEnvelope<T> = {
  apiVersion: "v1";
  kind: string;
  label: string;
  data: T;
  meta: Record<string, unknown> & { generatedAt: string };
  links?: Record<string, string>;
};

type ApiErrorBody = {
  apiVersion: "v1";
  kind: "error";
  label: string;
  error: { code: string; message: string; details?: unknown };
};

/** A failed call: the API's own error code and message, or `network` / `bad_response` from the app. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 0,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const NETWORK_MESSAGE = "Network error. Please check your connection and try again.";
const BAD_RESPONSE_MESSAGE = "Something went wrong. Please try again.";

type Params = Record<string, string | number | undefined | null>;

/** "/api/v1/colours/paint?brand=berger&q=3P0050": empty and missing parameters are left out. */
export function apiPath(path: string, params: Params = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

const isErrorBody = (body: unknown): body is ApiErrorBody =>
  typeof body === "object" && body !== null && (body as ApiErrorBody).kind === "error" && typeof (body as ApiErrorBody).error?.code === "string";

const isEnvelope = (body: unknown): body is ApiEnvelope<unknown> =>
  typeof body === "object" && body !== null && (body as ApiEnvelope<unknown>).apiVersion === "v1" && "data" in body;

/** GETs one endpoint and returns its envelope, or throws an ApiError. */
export async function apiGet<T>(path: string, params?: Params, init?: { signal?: AbortSignal }): Promise<ApiEnvelope<T>> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${apiPath(path, params)}`, { headers: { Accept: "application/json" }, signal: init?.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new ApiError("network", NETWORK_MESSAGE);
  }
  const body: unknown = await res.json().catch(() => undefined);
  if (isErrorBody(body)) throw new ApiError(body.error.code, body.error.message, res.status, body.error.details);
  if (!res.ok || !isEnvelope(body)) throw new ApiError("bad_response", BAD_RESPONSE_MESSAGE, res.status);
  return body as ApiEnvelope<T>;
}
