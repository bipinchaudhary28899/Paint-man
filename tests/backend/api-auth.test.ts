import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDb } from "@/lib/db/client";
import { otpChallenges, sessions } from "@/lib/db/schema";
import { postJson } from "../support/request";
import { resetTestDb, useTestDb } from "../support/db";

// The sign-in API: POST /api/v1/auth/otp, /verify and /logout, end to end against an in-memory
// Postgres, with the development SMS provider (the code is read from its masked log line).

const testDb = useTestDb();
const PHONE = "9876543210";
const OTP_URL = "http://localhost:3000/api/v1/auth/otp";
const VERIFY_URL = "http://localhost:3000/api/v1/auth/verify";
const LOGOUT_URL = "http://localhost:3000/api/v1/auth/logout";

let info: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
  await resetTestDb(testDb.db);
  vi.stubEnv("SESSION_SECRET", "s".repeat(48));
  vi.stubEnv("MSG91_AUTH_KEY", "");
  vi.stubEnv("MSG91_OTP_TEMPLATE_ID", "");
  vi.resetModules();
  info = vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setDb(testDb.db);
});

const routes = async () => ({
  otp: (await import("@/app/api/v1/auth/otp/route")).POST,
  verify: (await import("@/app/api/v1/auth/verify/route")).POST,
  logout: (await import("@/app/api/v1/auth/logout/route")).POST,
});
/** The code the dev provider printed last. */
const lastCode = () => String(info.mock.calls.at(-1)?.[0]).match(/→ (\d{6})$/)![1];
const expectEnvelopeError = async (res: Response, status: number, code: string) => {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toContain("no-store");
  const body = await res.json();
  expect(body).toMatchObject({ apiVersion: "v1", kind: "error", error: { code } });
  return body;
};

describe("POST /api/v1/auth/otp", () => {
  it("sends a code and answers with the masked number, never revealing whether it has an account", async () => {
    const { otp } = await routes();
    const res = await otp(postJson(OTP_URL, { body: { phone: "+91 98765 43210" } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({
      apiVersion: "v1",
      kind: "otp",
      data: { sent: true, phone: "******3210", expiresInSeconds: 300, resendInSeconds: 30 },
      links: { self: "/api/v1/auth/otp", verify: "/api/v1/auth/verify" },
    });
    expect(body.label).toBe("A 6-digit sign-in code was sent to ******3210. It works for 5 minutes.");
    expect(JSON.stringify(body)).not.toContain(PHONE);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/^\[dev OTP\] \*{6}3210 → \d{6}$/));
    expect(await testDb.db.select().from(otpChallenges)).toHaveLength(1);
  });

  it("rejects a bad number (400 invalid_phone), another website (403), big (413), non-JSON (415) and broken bodies (400)", async () => {
    const { otp } = await routes();
    const bad = await expectEnvelopeError(await otp(postJson(OTP_URL, { body: { phone: "12345" } })), 400, "invalid_phone");
    expect(bad.error.message).toBe("Enter a valid 10-digit mobile number");
    await expectEnvelopeError(await otp(postJson(OTP_URL, { body: {} })), 400, "invalid_phone");
    await expectEnvelopeError(await otp(postJson(OTP_URL, { body: { phone: "9".repeat(30) } })), 400, "invalid_phone");
    await expectEnvelopeError(await otp(postJson(OTP_URL, { body: { phone: PHONE }, origin: "https://evil.example" })), 403, "forbidden");
    await expectEnvelopeError(await otp(postJson(OTP_URL, { body: { phone: PHONE, pad: "x".repeat(20_000) } })), 413, "payload_too_large");
    await expectEnvelopeError(await otp(postJson(OTP_URL, { raw: `{"phone":"${PHONE}"}`, headers: { "content-type": "text/plain" } })), 415, "unsupported_media_type");
    await expectEnvelopeError(await otp(postJson(OTP_URL, { raw: "{nope" })), 400, "invalid_request");
  });

  it("allows one code per number every 30 seconds (429 with the wait) and 15 per IP an hour", async () => {
    const { otp } = await routes();
    expect((await otp(postJson(OTP_URL, { body: { phone: PHONE } }))).status).toBe(200);
    const res = await otp(postJson(OTP_URL, { body: { phone: PHONE } }));
    const body = await expectEnvelopeError(res, 429, "rate_limited");
    expect(body.error.details.retryAfterSeconds).toBeGreaterThan(0);
    expect(body.error.details.retryAfterSeconds).toBeLessThanOrEqual(30);
    expect(res.headers.get("retry-after")).toBe(String(body.error.details.retryAfterSeconds));

    const ip = { "x-forwarded-for": "198.51.100.9" };
    const statuses = [];
    for (let i = 0; i < 16; i++) statuses.push((await otp(postJson(OTP_URL, { body: { phone: `90000000${String(i).padStart(2, "0")}` }, headers: ip }))).status);
    expect(statuses.slice(0, 15).every((s) => s === 200)).toBe(true);
    expect(statuses[15]).toBe(429);
  });

  it("answers 503 otp_unavailable without an SMS provider or a secret in production, or when the SMS fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    let { otp } = await routes();
    await expectEnvelopeError(await otp(postJson(OTP_URL, { body: { phone: PHONE } })), 503, "otp_unavailable");

    vi.stubEnv("MSG91_AUTH_KEY", "key");
    vi.stubEnv("MSG91_OTP_TEMPLATE_ID", "tmpl");
    vi.stubEnv("SESSION_SECRET", "");
    vi.resetModules();
    ({ otp } = await routes());
    await expectEnvelopeError(await otp(postJson(OTP_URL, { body: { phone: PHONE } })), 503, "otp_unavailable");

    vi.stubEnv("SESSION_SECRET", "s".repeat(48));
    vi.resetModules();
    ({ otp } = await routes());
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ type: "error", message: `bad ${PHONE}` }), { status: 400 }));
    await expectEnvelopeError(await otp(postJson(OTP_URL, { body: { phone: PHONE } })), 503, "otp_unavailable");
    expect(await testDb.db.select().from(otpChallenges)).toHaveLength(0); // the unsent code is forgotten
    expect(JSON.stringify(error.mock.calls)).not.toContain(PHONE);
  });

  it("answers 503 database_unavailable when production has no database", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MSG91_AUTH_KEY", "key");
    vi.stubEnv("MSG91_OTP_TEMPLATE_ID", "tmpl");
    vi.stubEnv("DATABASE_URL", "");
    setDb(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { otp } = await routes();
    await expectEnvelopeError(await otp(postJson(OTP_URL, { body: { phone: PHONE } })), 503, "database_unavailable");
  });
});

describe("POST /api/v1/auth/verify", () => {
  it("signs the app in: the bearer token in the body, no cookie", async () => {
    const { otp, verify } = await routes();
    await otp(postJson(OTP_URL, { body: { phone: PHONE } }));
    const res = await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: lastCode(), client: "app" } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("set-cookie")).toBeNull();
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "session", data: { user: { phone: PHONE, name: null }, token: expect.stringMatching(/^[\w-]{43}$/) } });
    expect(body.label).toMatch(/^Signed in with \*{6}3210/);
    expect(new Date(body.data.expiresAt).getTime() - Date.now()).toBeGreaterThan(89 * 86_400_000);

    // the token works
    const me = (await import("@/app/api/v1/me/route")).GET;
    const meRes = await me(new NextRequest("http://localhost:3000/api/v1/me", { headers: { authorization: `Bearer ${body.data.token}` } }));
    expect((await meRes.json()).data.id).toBe(body.data.user.id);
  });

  it("signs the website in with the httpOnly session cookie and the readable hint, and no token in the body", async () => {
    const { otp, verify } = await routes();
    await otp(postJson(OTP_URL, { body: { phone: PHONE } }));
    const res = await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: ` ${lastCode()} `, client: "web" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.token).toBeUndefined();
    const cookies = res.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith("ps_session="))).toMatch(/HttpOnly/i);
    expect(cookies.find((c) => c.startsWith("ps_signed_in=1"))).toBeDefined();
    expect(await testDb.db.select().from(sessions)).toMatchObject([{ client: "web" }]);
  });

  it("401 invalid_code with the tries left, then 410 code_expired once they are used up", async () => {
    const { otp, verify } = await routes();
    await otp(postJson(OTP_URL, { body: { phone: PHONE } }));
    const wrong = lastCode() === "000000" ? "111111" : "000000";
    const first = await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: wrong, client: "app" } })), 401, "invalid_code");
    expect(first.error).toMatchObject({ message: "That code is not right. 4 tries left.", details: { attemptsLeft: 4 } });
    for (let i = 0; i < 2; i++) await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: wrong, client: "app" } }));
    const one = await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: wrong, client: "app" } })), 401, "invalid_code");
    expect(one.error.message).toBe("That code is not right. 1 try left.");
    const last = await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: wrong, client: "app" } })), 401, "invalid_code");
    expect(last.error).toMatchObject({ details: { attemptsLeft: 0 }, message: expect.stringMatching(/Ask for a new code/) });
    await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: wrong, client: "app" } })), 410, "code_expired");
  });

  it("400 invalid_request names each bad field; 403, 413 and 415 as for sending", async () => {
    const { verify } = await routes();
    const bad = await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { phone: "1", code: "12", client: "tv" } })), 400, "invalid_request");
    expect(bad.error.details).toEqual({ phone: "Enter a valid 10-digit mobile number", code: "Enter the 6-digit code from the SMS", client: 'client must be "web" or "app"' });
    await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: "123456", client: "web" }, origin: "https://evil.example" })), 403, "forbidden");
    await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { pad: "x".repeat(20_000) } })), 413, "payload_too_large");
    await expectEnvelopeError(await verify(postJson(VERIFY_URL, { raw: "phone=1", headers: { "content-type": "application/x-www-form-urlencoded" } })), 415, "unsupported_media_type");
    await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: "123456", client: "app" } })), 410, "code_expired");
  });

  it("limits tries per IP (429)", async () => {
    const { verify } = await routes();
    const headers = { "x-forwarded-for": "198.51.100.44" };
    const statuses = [];
    for (let i = 0; i < 31; i++) statuses.push((await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: "123456", client: "app" }, headers }))).status);
    expect(statuses.slice(0, 30).every((s) => s === 410)).toBe(true);
    expect(statuses[30]).toBe(429);
  });

  it("answers 500 internal_error (logged by type only) when the database fails", async () => {
    const { verify } = await routes();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(testDb.db, "select").mockImplementation(() => {
      throw Object.assign(new Error(`connection to server failed for ${PHONE}`), { code: "ECONNREFUSED" });
    });
    await expectEnvelopeError(await verify(postJson(VERIFY_URL, { body: { phone: PHONE, code: "123456", client: "app" } })), 500, "internal_error");
    expect(error).toHaveBeenCalledWith("Signing in failed:", "Error (ECONNREFUSED)");
    expect(JSON.stringify(error.mock.calls)).not.toContain(PHONE);
  });
});

describe("POST /api/v1/auth/logout", () => {
  const signIn = async (client: "web" | "app") => {
    const { signInUser } = await import("@/lib/auth/users");
    const { createUserSession } = await import("@/lib/auth/user-session");
    return createUserSession((await signInUser(PHONE)).id, client);
  };

  it("ends the bearer session and clears both cookies", async () => {
    const { logout } = await routes();
    const { token } = await signIn("app");
    const res = await logout(postJson(LOGOUT_URL, { headers: { authorization: `Bearer ${token}` } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.json()).toMatchObject({ kind: "session", data: { signedOut: true } });
    expect(res.headers.getSetCookie().filter((c) => /Max-Age=0/.test(c))).toHaveLength(2);
    expect(await testDb.db.select().from(sessions)).toHaveLength(0);
  });

  it("ends the website's cookie session from this site, refuses it from another (403), and is safe to repeat", async () => {
    const { logout } = await routes();
    const { token } = await signIn("web");
    await expectEnvelopeError(await logout(postJson(LOGOUT_URL, { cookie: `ps_session=${token}`, origin: "https://evil.example" })), 403, "forbidden");
    expect(await testDb.db.select().from(sessions)).toHaveLength(1);
    expect((await logout(postJson(LOGOUT_URL, { cookie: `ps_session=${token}` }))).status).toBe(200);
    expect(await testDb.db.select().from(sessions)).toHaveLength(0);
    expect((await logout(postJson(LOGOUT_URL))).status).toBe(200);
  });

  it("answers 503 database_unavailable when production has no database", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    setDb(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { logout } = await routes();
    await expectEnvelopeError(await logout(postJson(LOGOUT_URL, { headers: { authorization: `Bearer ${"t".repeat(43)}` } })), 503, "database_unavailable");
  });
});
