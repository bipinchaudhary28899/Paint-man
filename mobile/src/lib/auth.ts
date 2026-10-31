import * as SecureStore from "expo-secure-store";

import { fieldProblem, normalizeMobile } from "~/shared";
import { apiRequest, ApiError, BAD_RESPONSE_MESSAGE } from "./api";
import { routeFor } from "./links";

// Customer accounts, as the website's API offers them (/api/v1/auth/*, /api/v1/me): sign in with a
// mobile number and a 6-digit code sent by SMS, with `client: "app"` so the session comes back as a
// bearer token (90 days) instead of the website's cookie. The token lives only in the phone's secure
// store (Keychain / Keystore) under one key, is sent only as `Authorization: Bearer`, and is never
// logged. Error wording is the API's own (invalid code with the tries left, expired, rate limited
// with the wait, sign-in codes not set up yet); the app adds only "network" and "bad_response".

/** The one secure-store key holding the session token. */
export const SESSION_KEY = "paintsaathi.session";

/** The sign-in code's length and the API's own message for a code that is not six digits. */
export const CODE_LENGTH = 6;
export const CODE_MESSAGE = `Enter the ${CODE_LENGTH}-digit code from the SMS`;

/** What a request needing a session says when there is none (the API's 401 wording). */
export const SIGNED_OUT_MESSAGE = "Sign in to continue: your session is missing or has expired.";

/** The signed-in customer, as GET /api/v1/me and the sign-in answer give it. */
export type User = { id: string; phone: string; name: string | null; createdAt?: string };

/** POST /api/v1/auth/otp's answer: the masked number and how long the code works. */
export type CodeSent = { sent: true; phone: string; expiresInSeconds: number; resendInSeconds: number };

type Session = { user: User; token: string; expiresAt: string };

// ---------- The token (secure store only) ----------

/** The saved session token, or null (none saved, or the secure store cannot be read). */
export async function readToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Saves the token; when the secure store refuses, the session lasts until the app closes. */
export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, token);
  } catch {
    // kept in memory only (AuthProvider), never anywhere less safe
  }
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // nothing saved, or nothing that could be read back
  }
}

// ---------- The API calls ----------

/** Sends a sign-in code by SMS to the number (spaces, +91, 91 or 0 allowed, as on the website). */
export async function sendCode(phone: string): Promise<CodeSent> {
  const res = await apiRequest<CodeSent>("/api/v1/auth/otp", { method: "POST", body: { phone: normalizeMobile(phone) } });
  return res.data;
}

/** Checks the code and opens an app session: the user and the bearer token. */
export async function verifyCode(phone: string, code: string): Promise<Session> {
  const res = await apiRequest<Partial<Session>>("/api/v1/auth/verify", { method: "POST", body: { phone: normalizeMobile(phone), code, client: "app" } });
  const { user, token, expiresAt } = res.data;
  if (!user || !token) throw new ApiError("bad_response", BAD_RESPONSE_MESSAGE, 200);
  return { user, token, expiresAt: expiresAt ?? "" };
}

/** Ends the session on the server. Best effort: signing out on the phone never waits on the network. */
export async function endSession(token: string): Promise<void> {
  try {
    await apiRequest("/api/v1/auth/logout", { method: "POST", token });
  } catch {
    // offline or already expired: the token is gone from the phone either way
  }
}

/** The signed-in customer (GET /api/v1/me). */
export async function fetchMe(token: string): Promise<User> {
  return (await apiRequest<User>("/api/v1/me", { token })).data;
}

/** Changes the name on the account (PATCH /api/v1/me, 2–80 characters). */
export async function renameMe(token: string, name: string): Promise<User> {
  return (await apiRequest<User>("/api/v1/me", { method: "PATCH", body: { name: name.trim() }, token })).data;
}

/** Deletes the account and every session (DELETE /api/v1/me). Its bookings stay with us, unlinked. */
export async function deleteMe(token: string): Promise<void> {
  await apiRequest("/api/v1/me", { method: "DELETE", token });
}

// ---------- Helpers for the screens ----------

/** The website's message for a mobile number that is not a valid Indian mobile, or undefined. */
export const phoneProblem = (phone: string) => fieldProblem("phone", phone);

/** The digits of what was typed or pasted into the code field, at most six. */
export const cleanCode = (text: string) => text.replace(/\D/g, "").slice(0, CODE_LENGTH);

export const codeProblem = (code: string) => (new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code) ? undefined : CODE_MESSAGE);

/** "+91 98765 43210" for a 10-digit mobile (anything else as it is). */
export function formatPhone(phone: string): string {
  const digits = normalizeMobile(phone);
  return /^\d{10}$/.test(digits) ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

/** "AV" for "Asha Verma", "A" for "Asha"; null without a name. */
export function initials(name: string | null | undefined): string | null {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return `${first}${last}`.toUpperCase();
}

/** The first name, for a greeting ("Asha"); null without a name. */
export const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || null;

/** How long the API asks to wait before trying again (429 `rate_limited`), in seconds; 0 when it did not say. */
export function retryAfter(err: unknown): number {
  const details = err instanceof ApiError ? (err.details as { retryAfterSeconds?: unknown } | undefined) : undefined;
  const s = details?.retryAfterSeconds;
  return typeof s === "number" && Number.isFinite(s) && s > 0 ? Math.ceil(s) : 0;
}

/** The words to show for a failed call: the API's own message, else the app's general one. */
export const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : BAD_RESPONSE_MESSAGE);

/** A 401 from the API: the session is missing or expired. */
export const isSignedOutError = (err: unknown) => err instanceof ApiError && err.status === 401;

/**
 * Where to go after signing in: `next` when it is a screen of the app (never the login screen
 * itself, another site or a malformed path), else undefined.
 */
export function safeNext(next: string | string[] | undefined): string | undefined {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || value.length > 200 || !value.startsWith("/") || value.startsWith("//")) return undefined;
  const route = routeFor(value);
  return route && route.pathname !== "/login" ? value : undefined;
}
