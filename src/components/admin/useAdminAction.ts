"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

// How the admin project tools talk to /api/admin: a same-origin JSON request whose answer is the
// API envelope, read into a plain result. After a change the page's server data is refreshed
// (router.refresh re-renders the server components; the forms keep what is typed in them).

export type ActionFailure = { ok: false; status: number; message: string; details?: Record<string, string> };
export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

/** Sends one admin request and reads the envelope: `data` on success, the server's message on failure. */
export async function adminSend<T = unknown>(method: "POST" | "PUT" | "PATCH", url: string, body?: unknown): Promise<ActionResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
    const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string; details?: Record<string, string> } } | null;
    if (res.ok && json && "data" in json) return { ok: true, data: json.data as T };
    return {
      ok: false,
      status: res.status,
      message: json?.error?.message ?? `Something went wrong (error ${res.status}). Try again.`,
      ...(json?.error?.details && { details: json.error.details }),
    };
  } catch {
    return { ok: false, status: 0, message: "Network error: check the connection and try again." };
  }
}

/**
 * One admin action's state: busy while it runs, then the success line or the failure. `run`
 * resolves to the result, so a form can chain steps (save, then send).
 */
export function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ActionFailure | null>(null);
  const [done, setDone] = useState("");

  async function run<T = unknown>(method: "POST" | "PUT" | "PATCH", url: string, body: unknown, success: string, { refresh = true } = {}): Promise<ActionResult<T>> {
    setBusy(true);
    setError(null);
    setDone("");
    const result = await adminSend<T>(method, url, body);
    setBusy(false);
    if (result.ok) {
      setDone(success);
      if (refresh) startTransition(() => router.refresh());
    } else {
      setError(result);
    }
    return result;
  }

  return { run, busy, error, done, setError, setDone };
}
