import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leads, otpChallenges, projects, sessions, users } from "@/lib/db/schema";
import { saveLead } from "@/lib/leads/store";
import { resetTestDb, useTestDb } from "../support/db";

// Customer sign-in, against a real Postgres (in-memory PGlite): SMS codes, accounts linked to
// bookings by phone, and sessions by bearer token or cookie.

const next = vi.hoisted(() => ({ cookie: undefined as string | undefined }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "ps_session" && next.cookie ? { value: next.cookie } : undefined) }) }));

const testDb = useTestDb();
const SECRET = "s".repeat(48);
const PHONE = "9876543210";

beforeEach(async () => {
  await resetTestDb(testDb.db);
  vi.stubEnv("SESSION_SECRET", SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  next.cookie = undefined;
});

const booking = { type: "booking" as const, name: "Asha", phone: PHONE, address: "12 Rose Villa, Nehru Road", locality: "Kamla Nagar", pincode: "282005", city: "agra" };

describe("sign-in codes", () => {
  it("creates a 6-digit code, stores only its hash, and accepts it once", async () => {
    const { createOtpChallenge, verifyOtpChallenge, hashCode, OTP_TTL_SECONDS } = await import("@/lib/auth/otp");
    const now = new Date("2026-10-31T06:00:00Z");
    const { code, expiresAt } = await createOtpChallenge(PHONE, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(expiresAt.getTime() - now.getTime()).toBe(OTP_TTL_SECONDS * 1000);

    const [row] = await testDb.db.select().from(otpChallenges);
    expect(row.codeHash).toBe(hashCode(PHONE, code, SECRET));
    expect(row.codeHash).not.toContain(code);

    expect(await verifyOtpChallenge(PHONE, code, new Date(now.getTime() + 60_000))).toEqual({ ok: true });
    // single use
    expect(await verifyOtpChallenge(PHONE, code, new Date(now.getTime() + 61_000))).toEqual({ ok: false, reason: "expired" });
  });

  it("counts wrong codes: 5 tries, then the code is dead", async () => {
    const { createOtpChallenge, verifyOtpChallenge } = await import("@/lib/auth/otp");
    const { code } = await createOtpChallenge(PHONE);
    const wrong = code === "000000" ? "111111" : "000000";
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await verifyOtpChallenge(PHONE, wrong));
    expect(results.map((r) => (r.ok ? "ok" : r.reason === "invalid_code" ? r.attemptsLeft : r.reason))).toEqual([4, 3, 2, 1, 0]);
    // even the right code no longer works
    expect(await verifyOtpChallenge(PHONE, code)).toEqual({ ok: false, reason: "expired" });
  });

  it("treats a challenge whose tries ran out in parallel as expired", async () => {
    const { createOtpChallenge, verifyOtpChallenge } = await import("@/lib/auth/otp");
    const { code } = await createOtpChallenge(PHONE);
    await testDb.db.update(otpChallenges).set({ attempts: 5 });
    expect(await verifyOtpChallenge(PHONE, code)).toEqual({ ok: false, reason: "expired" });
  });

  it("expires after 5 minutes, and a new code cancels the old one", async () => {
    const { createOtpChallenge, verifyOtpChallenge } = await import("@/lib/auth/otp");
    const now = new Date("2026-10-31T06:00:00Z");
    const first = await createOtpChallenge(PHONE, now);
    expect(await verifyOtpChallenge(PHONE, first.code, new Date(now.getTime() + 5 * 60_000))).toEqual({ ok: false, reason: "expired" });

    const second = await createOtpChallenge(PHONE, now);
    const third = await createOtpChallenge(PHONE, now);
    if (second.code !== third.code) expect(await verifyOtpChallenge(PHONE, second.code, now)).toMatchObject({ ok: false, reason: "invalid_code" });
    expect(await verifyOtpChallenge(PHONE, third.code, now)).toEqual({ ok: true });
    expect(await testDb.db.select().from(otpChallenges)).toHaveLength(1);
  });

  it("answers expired for a phone that never asked for a code, and forgets cancelled codes", async () => {
    const { cancelOtpChallenges, createOtpChallenge, verifyOtpChallenge } = await import("@/lib/auth/otp");
    expect(await verifyOtpChallenge("9000000009", "123456")).toEqual({ ok: false, reason: "expired" });
    const { code } = await createOtpChallenge(PHONE);
    await cancelOtpChallenges(PHONE);
    expect(await verifyOtpChallenge(PHONE, code)).toEqual({ ok: false, reason: "expired" });
  });

  it("keys the hash with SESSION_SECRET; development falls back to a per-process key, production refuses", async () => {
    const { otpSecret, hashCode, OtpUnavailableError, maskPhone, generateCode, phoneKey } = await import("@/lib/auth/otp");
    expect(otpSecret()).toBe(SECRET);
    expect(hashCode(PHONE, "123456", "a".repeat(32))).not.toBe(hashCode(PHONE, "123456", "b".repeat(32)));
    expect(hashCode(PHONE, "123456", SECRET)).not.toBe(hashCode("9123456789", "123456", SECRET));
    vi.stubEnv("SESSION_SECRET", "");
    expect(otpSecret()).toMatch(/^[\w-]{43}$/);
    expect(otpSecret()).toBe(otpSecret());
    vi.stubEnv("NODE_ENV", "production");
    expect(() => otpSecret()).toThrow(OtpUnavailableError);
    expect(maskPhone(PHONE)).toBe("******3210");
    expect(phoneKey(PHONE, SECRET)).toMatch(/^[\w-]{32}$/);
    expect(phoneKey(PHONE, SECRET)).not.toContain(PHONE);
    expect(new Set(Array.from({ length: 50 }, generateCode)).size).toBeGreaterThan(40);
  });
});

describe("OTP providers", () => {
  it("uses MSG91's flow API when its key and template are set", async () => {
    const { getOtpProvider, MSG91_FLOW_URL } = await import("@/lib/auth/otp-provider");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ type: "success", message: "req-1" })));
    const provider = getOtpProvider({ MSG91_AUTH_KEY: " key-1 ", MSG91_OTP_TEMPLATE_ID: "tmpl-1", NODE_ENV: "production" })!;
    expect(provider.name).toBe("msg91");
    await provider.send(PHONE, "123456");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(MSG91_FLOW_URL);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authkey")).toBe("key-1");
    expect(JSON.parse(String(init?.body))).toEqual({ template_id: "tmpl-1", short_url: "0", recipients: [{ mobiles: "919876543210", otp: "123456" }] });
  });

  it("throws a status-only error when MSG91 refuses (its body is never repeated)", async () => {
    const { getOtpProvider, OtpSendError } = await import("@/lib/auth/otp-provider");
    const provider = getOtpProvider({ MSG91_AUTH_KEY: "k", MSG91_OTP_TEMPLATE_ID: "t" })!;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ type: "error", message: "bad number 919876543210" })));
    const err = await provider.send(PHONE, "123456").catch((e) => e);
    expect(err).toBeInstanceOf(OtpSendError);
    expect(err.message).not.toContain("9876543210");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("not json", { status: 401 }));
    await expect(provider.send(PHONE, "123456")).rejects.toMatchObject({ status: 401 });
  });

  it("prints the code with a masked phone in development, and has no provider in production", async () => {
    const { getOtpProvider } = await import("@/lib/auth/otp-provider");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const dev = getOtpProvider({ NODE_ENV: "development" })!;
    expect(dev.name).toBe("dev");
    await dev.send(PHONE, "123456");
    expect(info).toHaveBeenCalledWith("[dev OTP] ******3210 → 123456");
    expect(getOtpProvider({ NODE_ENV: "production", MSG91_AUTH_KEY: "k" })).toBeNull();
    expect(getOtpProvider({ NODE_ENV: "development" })?.name).toBe("dev");
  });
});

describe("accounts", () => {
  it("creates the account on first sign-in and links earlier bookings with that phone", async () => {
    const { signInUser } = await import("@/lib/auth/users");
    const earlier = await saveLead(booking);
    const other = await saveLead({ ...booking, phone: "9123456789" });
    const now = new Date("2026-10-31T06:00:00Z");
    const user = await signInUser(PHONE, now);
    expect(user).toEqual({ id: expect.any(String), phone: PHONE, name: null, createdAt: expect.any(String) });

    const [project] = await testDb.db.select().from(projects).where(eq(projects.id, earlier.projectId!));
    expect(project.userId).toBe(user.id);
    expect((await testDb.db.select().from(leads).where(eq(leads.id, earlier.id)))[0].userId).toBe(user.id);
    expect((await testDb.db.select().from(projects).where(eq(projects.id, other.projectId!)))[0].userId).toBeNull();

    // signing in again finds the same account and records the time
    const later = new Date("2026-11-01T06:00:00Z");
    expect((await signInUser(PHONE, later)).id).toBe(user.id);
    expect((await testDb.db.select().from(users))[0].lastLoginAt?.toISOString()).toBe(later.toISOString());
  });

  it("renames, reads and deletes; deleting keeps the bookings, unlinked, and ends every session", async () => {
    const { deleteUser, getUser, renameUser, signInUser } = await import("@/lib/auth/users");
    const { createUserSession } = await import("@/lib/auth/user-session");
    const user = await signInUser(PHONE);
    const saved = await saveLead(booking, { userId: user.id });
    await createUserSession(user.id, "app");
    expect((await renameUser(user.id, "Asha Verma"))?.name).toBe("Asha Verma");
    expect((await getUser(user.id))?.name).toBe("Asha Verma");

    expect(await deleteUser(user.id)).toBe(true);
    expect(await getUser(user.id)).toBeNull();
    expect(await testDb.db.select().from(sessions)).toHaveLength(0);
    const [project] = await testDb.db.select().from(projects).where(eq(projects.id, saved.projectId!));
    expect(project).toMatchObject({ userId: null, phone: PHONE });
    expect(await deleteUser(user.id)).toBe(false);
    expect(await renameUser(user.id, "Nobody")).toBeNull();
  });
});

describe("sessions", () => {
  const req = (headers: Record<string, string> = {}) => new NextRequest("http://localhost:3000/api/v1/me", { headers: { host: "localhost:3000", ...headers } });

  it("stores only the token's hash and finds the session by bearer token, then by cookie", async () => {
    const { signInUser } = await import("@/lib/auth/users");
    const { createUserSession, readUserSession, hashToken, SESSION_TTL_DAYS } = await import("@/lib/auth/user-session");
    const user = await signInUser(PHONE);
    const now = new Date("2026-10-31T06:00:00Z");
    const app = await createUserSession(user.id, "app", now);
    const web = await createUserSession(user.id, "web", now);
    expect(app.token).toMatch(/^[\w-]{43}$/);
    expect(app.expiresAt.getTime() - now.getTime()).toBe(SESSION_TTL_DAYS.app * 86_400_000);
    expect(web.expiresAt.getTime() - now.getTime()).toBe(30 * 86_400_000);
    const stored = await testDb.db.select().from(sessions);
    expect(stored.map((s) => s.tokenHash).sort()).toEqual([hashToken(app.token), hashToken(web.token)].sort());

    const soon = new Date(now.getTime() + 1000);
    expect(await readUserSession(req({ authorization: `Bearer ${app.token}` }), soon)).toMatchObject({ via: "bearer", client: "app", user: { id: user.id, phone: PHONE } });
    expect(await readUserSession(req({ cookie: `ps_session=${web.token}` }), soon)).toMatchObject({ via: "cookie", client: "web" });
    // the bearer header wins over a cookie, even when it is wrong
    expect(await readUserSession(req({ authorization: "Bearer nope", cookie: `ps_session=${web.token}` }), soon)).toBeNull();
    expect(await readUserSession(req(), soon)).toBeNull();
  });

  it("rejects expired, unknown and malformed tokens, and refreshes last use at most hourly", async () => {
    const { signInUser } = await import("@/lib/auth/users");
    const { createUserSession, findSession, deleteUserSession } = await import("@/lib/auth/user-session");
    const user = await signInUser(PHONE);
    const now = new Date("2026-10-31T06:00:00Z");
    const { token, expiresAt } = await createUserSession(user.id, "web", now);
    expect(await findSession(token, expiresAt)).toBeNull();
    expect(await findSession("x".repeat(43), now)).toBeNull();
    expect(await findSession("short", now)).toBeNull();

    await findSession(token, new Date(now.getTime() + 10 * 60_000));
    expect((await testDb.db.select().from(sessions))[0].lastUsedAt.toISOString()).toBe(now.toISOString());
    const later = new Date(now.getTime() + 2 * 3_600_000);
    const found = await findSession(token, later);
    expect((await testDb.db.select().from(sessions))[0].lastUsedAt.toISOString()).toBe(later.toISOString());

    await deleteUserSession(found!.sessionId);
    expect(await findSession(token, later)).toBeNull();
  });

  it("requireUser: 401 without a session, 401 for a cookie where only a bearer is accepted, 403 for a cross-site cookie change", async () => {
    const { signInUser } = await import("@/lib/auth/users");
    const { createUserSession, requireUser } = await import("@/lib/auth/user-session");
    const user = await signInUser(PHONE);
    const { token } = await createUserSession(user.id, "web");

    const none = await requireUser(req());
    expect(!none.ok && none.response.status).toBe(401);
    const cookieOnly = await requireUser(req({ cookie: `ps_session=${token}` }), { bearerOnly: true });
    expect(!cookieOnly.ok && cookieOnly.response.status).toBe(401);
    const crossSite = await requireUser(req({ cookie: `ps_session=${token}`, origin: "https://evil.example" }), { mutating: true });
    expect(!crossSite.ok && crossSite.response.status).toBe(403);
    expect(!crossSite.ok && (await crossSite.response.json()).error.code).toBe("forbidden");
    // a bearer token is not a browser cookie: no cross-site concern
    const bearer = await requireUser(req({ authorization: `Bearer ${token}`, origin: "https://elsewhere.example" }), { mutating: true, bearerOnly: true });
    expect(bearer.ok).toBe(true);
  });

  it("sets and clears the session cookie and the readable signed-in hint", async () => {
    const { setSessionCookies, clearSessionCookies } = await import("@/lib/auth/user-session");
    const now = new Date("2026-10-31T06:00:00Z");
    const res = NextResponse.json({});
    setSessionCookies(res, "tok", new Date(now.getTime() + 30 * 86_400_000), now);
    const set = res.headers.getSetCookie();
    expect(set.find((c) => c.startsWith("ps_session=tok"))).toMatch(/HttpOnly.*|.*HttpOnly/i);
    expect(set.find((c) => c.startsWith("ps_session="))).toMatch(/Max-Age=2592000/);
    expect(set.find((c) => c.startsWith("ps_session="))).toMatch(/SameSite=lax/i);
    expect(set.find((c) => c.startsWith("ps_session="))).not.toMatch(/Secure/i); // Secure in production only
    expect(set.find((c) => c.startsWith("ps_signed_in=1"))).not.toMatch(/HttpOnly/i);

    vi.stubEnv("NODE_ENV", "production");
    const cleared = NextResponse.json({});
    clearSessionCookies(cleared);
    const gone = cleared.headers.getSetCookie();
    expect(gone.find((c) => c.startsWith("ps_session=;"))).toMatch(/Max-Age=0.*Secure|Secure.*Max-Age=0/i);
    expect(gone.find((c) => c.startsWith("ps_signed_in=;"))).toMatch(/Max-Age=0/);
  });

  it("getSignedInUser reads the cookie for server components", async () => {
    const { signInUser } = await import("@/lib/auth/users");
    const { createUserSession, getSignedInUser } = await import("@/lib/auth/user-session");
    expect(await getSignedInUser()).toBeNull();
    const user = await signInUser(PHONE);
    next.cookie = (await createUserSession(user.id, "web")).token;
    expect(await getSignedInUser()).toMatchObject({ id: user.id, phone: PHONE });
    next.cookie = "y".repeat(43);
    expect(await getSignedInUser()).toBeNull();
  });
});
