import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/lib/auth/session";
import { createUserSession } from "@/lib/auth/user-session";
import { signInUser } from "@/lib/auth/users";
import { setDb } from "@/lib/db/client";
import { pushTokens } from "@/lib/db/schema";
import { saveLead } from "@/lib/leads/store";
import { scheduleInspection, setProjectStage } from "@/lib/projects/repo";
import { notifyProjectUpdate, projectUpdateMessage, pushProjectUpdate } from "@/lib/push/notify";
import { EXPO_PUSH_URL, sendPush } from "@/lib/push/send";
import { dropTokens, MAX_TOKENS_PER_USER, removePushToken, savePushToken, tokensFor } from "@/lib/push/tokens";
import { resetTestDb, useTestDb } from "../support/db";

// Push notifications of project updates: the phones' tokens, sending through Expo's push service
// (faked here), the message for a project's newest event, the admin actions that send it, and the
// app's endpoint for registering a phone. Against an in-memory Postgres.

const testDb = useTestDb();
const BASE = "http://localhost:3000";
const PHONE = "9876543210";
const token = (n: number | string) => `ExponentPushToken[device-${n}-abcdefgh]`;
const booking = { type: "booking" as const, name: "Asha", phone: PHONE, locality: "Kamla Nagar", city: "agra" };

beforeEach(async () => {
  await resetTestDb(testDb.db);
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setDb(testDb.db);
});

/** Expo's push service: answers each message with a ticket (`gone` tokens are reported unregistered). */
function expo(gone: string[] = [], status = 200) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const messages = JSON.parse(String(init?.body)) as { to: string }[];
    const data = messages.map((m) => (gone.includes(m.to) ? { status: "error", details: { error: "DeviceNotRegistered" } } : { status: "ok", id: "x" }));
    return new Response(JSON.stringify({ data }), { status });
  });
}
const sentTo = (fetchMock: ReturnType<typeof expo>) => fetchMock.mock.calls.flatMap(([, init]) => JSON.parse(String(init?.body)) as { to: string; title: string; body: string; data: { url: string } }[]);

describe("push tokens", () => {
  it("saves a phone once, moves it to whoever signs in on it, and keeps each account's newest few", async () => {
    const asha = await signInUser(PHONE);
    const ravi = await signInUser("9123456789");
    await savePushToken(asha.id, token(1), "android");
    await savePushToken(asha.id, token(1), "android");
    expect(await tokensFor(asha.id)).toEqual([token(1)]);
    await savePushToken(ravi.id, token(1), "ios");
    expect(await tokensFor(asha.id)).toEqual([]);
    expect(await tokensFor(ravi.id)).toEqual([token(1)]);
    for (let i = 0; i < MAX_TOKENS_PER_USER + 2; i++) await savePushToken(asha.id, token(`a${i}`), "ios", new Date(Date.UTC(2026, 10, 1, 0, i)));
    const kept = await tokensFor(asha.id);
    expect(kept).toHaveLength(MAX_TOKENS_PER_USER);
    expect(kept).not.toContain(token("a0"));
    expect(await removePushToken(asha.id, token("a11"))).toBe(true);
    expect(await removePushToken(asha.id, token("a11"))).toBe(false);
    await dropTokens([token("a10"), token("a9")]);
    await dropTokens([]);
    expect(await tokensFor(asha.id)).toHaveLength(MAX_TOKENS_PER_USER - 3);
  });
});

describe("sendPush", () => {
  it("sends to every phone of the account through Expo, and forgets the phones that are gone", async () => {
    const user = await signInUser(PHONE);
    await savePushToken(user.id, token(1), "android");
    await savePushToken(user.id, token(2), "ios");
    const fetchMock = expo([token(2)]);
    await expect(sendPush(user.id, { title: "Quotation shared", body: "Ready to review.", url: "/account/projects/p" }, fetchMock as typeof fetch)).resolves.toEqual({ sent: 1, dropped: 1 });
    expect(fetchMock).toHaveBeenCalledWith(EXPO_PUSH_URL, expect.objectContaining({ method: "POST" }));
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("authorization")).toBeNull();
    expect(sentTo(fetchMock)).toEqual(
      expect.arrayContaining([expect.objectContaining({ to: token(1), title: "Quotation shared", body: "Ready to review.", data: { url: "/account/projects/p" } })]),
    );
    expect(await tokensFor(user.id)).toEqual([token(1)]);
  });

  it("asks nothing of Expo for an account without phones, signs requests once a token is set, and fails loudly on an error", async () => {
    const user = await signInUser(PHONE);
    const fetchMock = expo();
    await expect(sendPush(user.id, { title: "t", body: "b", url: "/" }, fetchMock as typeof fetch)).resolves.toEqual({ sent: 0, dropped: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    await savePushToken(user.id, token(1), "ios");
    vi.stubEnv("EXPO_ACCESS_TOKEN", "expo-secret");
    await sendPush(user.id, { title: "t", body: "b", url: "/" }, fetchMock as typeof fetch);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("authorization")).toBe("Bearer expo-secret");
    await expect(sendPush(user.id, { title: "t", body: "b", url: "/" }, expo([], 503) as typeof fetch)).rejects.toThrow("Expo push answered 503");
  });
});

describe("the project update message", () => {
  it("names the newest stage since the action, with the team's note or the stage's own explanation", async () => {
    const user = await signInUser(PHONE);
    const { projectId } = await saveLead(booking, { userId: user.id });
    const since = new Date();
    await setProjectStage(projectId!, "call_confirmed", { note: "Spoke to Asha: visit on Tuesday." });
    expect(await projectUpdateMessage(projectId!, since)).toEqual({ userId: user.id, title: "Visit being arranged", body: "Spoke to Asha: visit on Tuesday.", url: `/account/projects/${projectId}` });
    const later = new Date();
    await scheduleInspection(projectId!, { scheduledAt: new Date("2099-01-05T05:30:00.000Z"), inspectorName: "Ravi" });
    const scheduled = await projectUpdateMessage(projectId!, later);
    expect(scheduled).toMatchObject({ title: "Inspection scheduled" });
    expect(scheduled!.body).toMatch(/5 Jan|Jan 5|05/);
    // nothing new since then
    expect(await projectUpdateMessage(projectId!, new Date(Date.now() + 60_000))).toBeNull();
  });

  it("sends nothing for a booking that is not in an account", async () => {
    const { projectId } = await saveLead(booking);
    const since = new Date();
    await setProjectStage(projectId!, "call_confirmed");
    expect(await projectUpdateMessage(projectId!, since)).toBeNull();
  });

  it("logs a failed send by its type only, and runs at once outside a request", async () => {
    const user = await signInUser(PHONE);
    const { projectId } = await saveLead(booking, { userId: user.id });
    await savePushToken(user.id, token(1), "android");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const since = new Date();
    await setProjectStage(projectId!, "call_confirmed");
    await pushProjectUpdate(projectId!, since, expo([], 500) as typeof fetch);
    expect(error).toHaveBeenCalledWith("Project update push failed:", "Error");
    const fetchMock = expo();
    vi.stubGlobal("fetch", fetchMock);
    notifyProjectUpdate(projectId!, since);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    vi.unstubAllGlobals();
  });
});

describe("the admin actions that move a project", () => {
  it("tell the customer's phones about the new stage", async () => {
    const SECRET = "s".repeat(48);
    vi.stubEnv("ADMIN_USERNAME", "owner");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "scrypt:16384:8:1:c2FsdA:aGFzaA");
    vi.stubEnv("SESSION_SECRET", SECRET);
    const user = await signInUser(PHONE);
    const { projectId } = await saveLead(booking, { userId: user.id });
    await savePushToken(user.id, token(1), "android");
    const fetchMock = expo();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/admin/projects/[id]/stage/route");
    const body = JSON.stringify({ stage: "call_confirmed", note: "We call you today." });
    const res = await POST(
      new NextRequest(`${BASE}/api/admin/projects/${projectId}/stage`, {
        method: "POST",
        headers: { host: "localhost:3000", origin: BASE, cookie: `pm_admin=${await createSessionToken("owner", SECRET)}`, "content-type": "application/json", "content-length": String(body.length) },
        body,
      }),
      { params: Promise.resolve({ id: projectId! }) },
    );
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(sentTo(fetchMock)).toEqual([expect.objectContaining({ to: token(1), title: "Visit being arranged", body: "We call you today." })]));
    vi.unstubAllGlobals();
  });
});

describe("POST and DELETE /api/v1/me/push-tokens", () => {
  const route = async () => import("@/app/api/v1/me/push-tokens/route");
  async function signedIn(client: "web" | "app" = "app") {
    const user = await signInUser(PHONE);
    const { token: session } = await createUserSession(user.id, client);
    return { user, bearer: { authorization: `Bearer ${session}` }, cookie: `ps_session=${session}` };
  }
  const call = (method: "POST" | "DELETE", body: unknown, headers: Record<string, string> = {}, raw?: string) => {
    const payload = raw ?? JSON.stringify(body);
    return new NextRequest(`${BASE}/api/v1/me/push-tokens`, { method, headers: { host: "localhost:3000", "content-type": "application/json", "content-length": String(payload.length), ...headers }, body: payload });
  };
  const expectError = async (res: Response, status: number, code: string) => {
    expect(res.status).toBe(status);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "error", error: { code } });
    return body;
  };

  it("registers this phone, then forgets it", async () => {
    const { POST, DELETE } = await route();
    const { user, bearer } = await signedIn();
    const res = await POST(call("POST", { token: token(1), platform: "android" }, bearer));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.json()).toMatchObject({ apiVersion: "v1", kind: "push-token", data: { registered: true }, links: { self: "/api/v1/me/push-tokens" } });
    expect(await testDb.db.select().from(pushTokens)).toEqual([expect.objectContaining({ token: token(1), userId: user.id, platform: "android" })]);
    const gone = await DELETE(call("DELETE", { token: token(1) }, bearer));
    expect(await gone.json()).toMatchObject({ kind: "push-token", data: { removed: true } });
    expect(await (await DELETE(call("DELETE", { token: token(1) }, bearer))).json()).toMatchObject({ data: { removed: false } });
  });

  it("400 for a token that is not Expo's, a platform it does not know, or a body that is not an object", async () => {
    const { POST, DELETE } = await route();
    const { bearer } = await signedIn();
    const bad = await expectError(await POST(call("POST", { token: "abc", platform: "windows" }, bearer)), 400, "invalid_request");
    expect(Object.keys(bad.error.details).sort()).toEqual(["platform", "token"]);
    await expectError(await POST(call("POST", [token(1)], bearer)), 400, "invalid_request");
    await expectError(await POST(call("POST", null, bearer, "{bad")), 400, "invalid_request");
    await expectError(await DELETE(call("DELETE", {}, bearer)), 400, "invalid_request");
  });

  it("is for the app's session only: 401 without it or with the website's cookie", async () => {
    const { POST, DELETE } = await route();
    const { cookie } = await signedIn("web");
    await expectError(await POST(call("POST", { token: token(1), platform: "ios" })), 401, "unauthenticated");
    await expectError(await POST(call("POST", { token: token(1), platform: "ios" }, { cookie, origin: BASE })), 401, "unauthenticated");
    await expectError(await DELETE(call("DELETE", { token: token(1) })), 401, "unauthenticated");
  });

  it("429 after 20 changes in 10 minutes, and 500 (logged by type) when saving fails", async () => {
    const { POST, DELETE } = await route();
    const { bearer } = await signedIn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(testDb.db, "transaction").mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "XX000" }));
    await expectError(await POST(call("POST", { token: token(1), platform: "ios" }, bearer)), 500, "internal_error");
    expect(error).toHaveBeenCalledWith("Registering a phone for updates failed:", "Error (XX000)");
    vi.spyOn(testDb.db, "delete").mockImplementationOnce(() => {
      throw Object.assign(new Error("boom"), { code: "XX001" });
    });
    await expectError(await DELETE(call("DELETE", { token: token(1) }, bearer)), 500, "internal_error");
    for (let i = 0; i < 20; i++) await POST(call("POST", { token: token(i), platform: "ios" }, bearer));
    await expectError(await POST(call("POST", { token: token(1), platform: "ios" }, bearer)), 429, "rate_limited");
    await expectError(await DELETE(call("DELETE", { token: token(1) }, bearer)), 429, "rate_limited");
  });
});
