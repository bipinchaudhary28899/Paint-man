import { apiBase } from "./config";

// A client for the website's JSON API (/api/v1/...). Every response comes in the envelope described
// in the website's src/lib/api.ts and AGENTS.md rule 3; the app relies only on that public contract,
// as any other integration would. The public catalogue is read with apiGet; the signed-in calls
// (accounts, projects, bookings) go through apiRequest with the session's bearer token (src/lib/auth.ts).

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
export const BAD_RESPONSE_MESSAGE = "Something went wrong. Please try again.";

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

export const isErrorBody = (body: unknown): body is ApiErrorBody =>
  typeof body === "object" && body !== null && (body as ApiErrorBody).kind === "error" && typeof (body as ApiErrorBody).error?.code === "string";

const isEnvelope = (body: unknown): body is ApiEnvelope<unknown> =>
  typeof body === "object" && body !== null && (body as ApiEnvelope<unknown>).apiVersion === "v1" && "data" in body;

export type ApiRequestInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** sent as JSON */
  body?: unknown;
  /** the session's bearer token (never logged) */
  token?: string;
  signal?: AbortSignal;
};

/** Calls one endpoint and returns its envelope, or throws an ApiError (the API's own code and message). */
export async function apiRequest<T>(path: string, { method = "GET", body, token, signal }: ApiRequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const init: Parameters<typeof fetch>[1] = { headers, signal };
  if (method !== "GET") init.method = method;
  if (body !== undefined) init.body = JSON.stringify(body);
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, init);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new ApiError("network", NETWORK_MESSAGE);
  }
  const answer: unknown = await res.json().catch(() => undefined);
  if (isErrorBody(answer)) throw new ApiError(answer.error.code, answer.error.message, res.status, answer.error.details);
  if (!res.ok || !isEnvelope(answer)) throw new ApiError("bad_response", BAD_RESPONSE_MESSAGE, res.status);
  return answer as ApiEnvelope<T>;
}

/** GETs one public endpoint and returns its envelope, or throws an ApiError. */
export function apiGet<T>(path: string, params?: Params, init?: { signal?: AbortSignal }): Promise<ApiEnvelope<T>> {
  return apiRequest<T>(apiPath(path, params), { signal: init?.signal });
}
