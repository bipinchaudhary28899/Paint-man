import * as SecureStore from "expo-secure-store";

import { ApiError, apiRequest, BAD_RESPONSE_MESSAGE } from "~/lib/api";
import {
  cleanCode,
  clearToken,
  CODE_MESSAGE,
  codeProblem,
  deleteMe,
  endSession,
  errorMessage,
  fetchMe,
  firstName,
  formatPhone,
  initials,
  isSignedOutError,
  phoneProblem,
  readToken,
  renameMe,
  retryAfter,
  safeNext,
  saveToken,
  sendCode,
  SESSION_KEY,
  verifyCode,
} from "~/lib/auth";
import { apiBase } from "~/lib/config";
import { FIELD_MESSAGES } from "~/shared";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

const envelope = (data: unknown, kind = "x") => ({ apiVersion: "v1", kind, label: "x", data, meta: { generatedAt: "2026-10-31T00:00:00.000Z" } });
const errorBody = (code: string, message: string, details?: unknown) => ({ apiVersion: "v1", kind: "error", label: message, error: { code, message, details } });
const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const fetchMock = jest.fn();
const store = () => (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, { method?: string; headers: Record<string, string>; body?: string }];
  return { url, method: init.method ?? "GET", headers: init.headers, body: init.body === undefined ? undefined : JSON.parse(init.body) };
};

describe("apiRequest", () => {
  it("sends JSON with the bearer token and returns the envelope", async () => {
    fetchMock.mockResolvedValue(json(envelope({ ok: 1 })));
    await expect(apiRequest("/api/v1/me", { method: "PATCH", body: { name: "Asha" }, token: "tok" })).resolves.toMatchObject({ data: { ok: 1 } });
    expect(lastCall()).toEqual({
      url: `${apiBase()}/api/v1/me`,
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: { name: "Asha" },
    });
  });

  it("throws the API's error with its HTTP status, and its own errors for no connection or a bad answer", async () => {
    fetchMock.mockResolvedValue(json(errorBody("unauthenticated", "Sign in to continue"), 401));
    await expect(apiRequest("/api/v1/me", { token: "old" })).rejects.toMatchObject({ code: "unauthenticated", status: 401 });
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await expect(apiRequest("/api/v1/me")).rejects.toMatchObject({ code: "network" });
    fetchMock.mockResolvedValue(json({ nope: true }, 500));
    await expect(apiRequest("/api/v1/me")).rejects.toMatchObject({ code: "bad_response", status: 500, message: BAD_RESPONSE_MESSAGE });
  });
});

describe("the session token", () => {
  it("lives in the secure store under one key", async () => {
    await expect(readToken()).resolves.toBeNull();
    await saveToken("secret-token");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(SESSION_KEY, "secret-token");
    expect(store().get(SESSION_KEY)).toBe("secret-token");
    await expect(readToken()).resolves.toBe("secret-token");
    await clearToken();
    expect(store().has(SESSION_KEY)).toBe(false);
    expect(SESSION_KEY).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it("treats a secure store that fails as holding nothing, and never throws", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error("locked"));
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error("locked"));
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error("locked"));
    await expect(readToken()).resolves.toBeNull();
    await expect(saveToken("t")).resolves.toBeUndefined();
    await expect(clearToken()).resolves.toBeUndefined();
  });
});

describe("the account calls", () => {
  it("sends a code to the cleaned number", async () => {
    const sent = { sent: true, phone: "******3210", expiresInSeconds: 300, resendInSeconds: 30 };
    fetchMock.mockResolvedValue(json(envelope(sent, "otp")));
    await expect(sendCode("+91 98765-43210")).resolves.toEqual(sent);
    expect(lastCall()).toMatchObject({ url: `${apiBase()}/api/v1/auth/otp`, method: "POST", body: { phone: "9876543210" } });
  });

  it("verifies the code as the app client and returns the user and the token", async () => {
    const session = { user: { id: "u1", phone: "9876543210", name: null }, token: "tok", expiresAt: "2027-01-29T00:00:00.000Z" };
    fetchMock.mockResolvedValue(json(envelope(session, "session")));
    await expect(verifyCode("98765 43210", "123456")).resolves.toEqual(session);
    expect(lastCall()).toMatchObject({ url: `${apiBase()}/api/v1/auth/verify`, method: "POST", body: { phone: "9876543210", code: "123456", client: "app" } });
  });

  it("refuses a sign-in answer without a token", async () => {
    fetchMock.mockResolvedValue(json(envelope({ user: { id: "u1", phone: "9876543210", name: null }, expiresAt: "x" })));
    await expect(verifyCode("9876543210", "123456")).rejects.toMatchObject({ code: "bad_response" });
    fetchMock.mockResolvedValue(json(envelope({ user: { id: "u1", phone: "9876543210", name: null }, token: "t" })));
    await expect(verifyCode("9876543210", "123456")).resolves.toMatchObject({ token: "t", expiresAt: "" });
  });

  it("passes the API's refusals through with their details", async () => {
    fetchMock.mockResolvedValue(json(errorBody("invalid_code", "That code is not right. 2 tries left.", { attemptsLeft: 2 }), 401));
    await expect(verifyCode("9876543210", "000000")).rejects.toMatchObject({ code: "invalid_code", status: 401, details: { attemptsLeft: 2 } });
  });

  it("reads, renames and deletes the account with the bearer token", async () => {
    const me = { id: "u1", phone: "9876543210", name: "Asha", createdAt: "2026-10-31T06:30:00.000Z" };
    fetchMock.mockResolvedValue(json(envelope(me, "user")));
    await expect(fetchMe("tok")).resolves.toEqual(me);
    expect(lastCall()).toMatchObject({ method: "GET", headers: { Authorization: "Bearer tok" } });
    await expect(renameMe("tok", "  Asha Verma ")).resolves.toEqual(me);
    expect(lastCall()).toMatchObject({ method: "PATCH", body: { name: "Asha Verma" } });
    fetchMock.mockResolvedValue(json(envelope({ deleted: true }, "user")));
    await expect(deleteMe("tok")).resolves.toBeUndefined();
    expect(lastCall()).toMatchObject({ url: `${apiBase()}/api/v1/me`, method: "DELETE" });
  });

  it("ends the session on the server, quietly when offline", async () => {
    fetchMock.mockResolvedValue(json(envelope({ signedOut: true }, "session")));
    await endSession("tok");
    expect(lastCall()).toMatchObject({ url: `${apiBase()}/api/v1/auth/logout`, method: "POST", headers: { Authorization: "Bearer tok" } });
    fetchMock.mockRejectedValue(new TypeError("offline"));
    await expect(endSession("tok")).resolves.toBeUndefined();
  });
});

describe("helpers", () => {
  it("checks the number with the website's message and the code with the API's", () => {
    expect(phoneProblem("12345")).toBe(FIELD_MESSAGES.phone);
    expect(phoneProblem("+91 98765 43210")).toBeUndefined();
    expect(codeProblem("12345")).toBe(CODE_MESSAGE);
    expect(codeProblem("123456")).toBeUndefined();
    expect(CODE_MESSAGE).toBe("Enter the 6-digit code from the SMS");
  });

  it("keeps the code's digits only, six at most", () => {
    expect(cleanCode("12 34-56")).toBe("123456");
    expect(cleanCode("1234567")).toBe("123456");
    expect(cleanCode("ab")).toBe("");
  });

  it("writes the number, initials and first name for the screens", () => {
    expect(formatPhone("9876543210")).toBe("+91 98765 43210");
    expect(formatPhone("12")).toBe("12");
    expect(initials("asha  verma")).toBe("AV");
    expect(initials("Asha Rani Verma")).toBe("AV");
    expect(initials("Asha")).toBe("A");
    expect(initials("  ")).toBeNull();
    expect(initials(null)).toBeNull();
    expect(firstName(" Asha Verma")).toBe("Asha");
    expect(firstName(undefined)).toBeNull();
  });

  it("reads the wait from a rate limit, and the words for any failure", () => {
    expect(retryAfter(new ApiError("rate_limited", "Too many requests. Try again in 27 seconds.", 429, { retryAfterSeconds: 27 }))).toBe(27);
    expect(retryAfter(new ApiError("rate_limited", "x", 429, { retryAfterSeconds: "soon" }))).toBe(0);
    expect(retryAfter(new ApiError("x", "x"))).toBe(0);
    expect(retryAfter(new Error("x"))).toBe(0);
    expect(errorMessage(new ApiError("otp_unavailable", "We can't send sign-in codes right now. Please call us or try again later.", 503))).toMatch(/can't send sign-in codes/);
    expect(errorMessage(new Error("boom"))).toBe(BAD_RESPONSE_MESSAGE);
    expect(isSignedOutError(new ApiError("unauthenticated", "x", 401))).toBe(true);
    expect(isSignedOutError(new ApiError("not_found", "x", 404))).toBe(false);
  });

  it("goes back only to the app's own screens after signing in", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext(["/book", "/x"])).toBe("/book");
    expect(safeNext("/account/projects/3f0c-1")).toBe("/account/projects/3f0c-1");
    expect(safeNext("/services/interior-painting/agra")).toBe("/services/interior-painting/agra");
    for (const bad of [undefined, "", "account", "//evil.example", "https://evil.example/", "/admin", "/login", `/${"a".repeat(300)}`]) expect(safeNext(bad)).toBeUndefined();
  });
});
