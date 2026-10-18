import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/auth/password";
import { verifySessionToken } from "@/lib/auth/session";
import { postJson } from "../support/request";

const LOGIN = "http://localhost:3000/api/admin/login";
const PASSWORD = "a-very-long-test-password";
const SECRET = "s".repeat(48);
let hash: string;

beforeAll(async () => {
  hash = await hashPassword(PASSWORD, { N: 2 ** 14, r: 8, p: 1 });
});

beforeEach(() => {
  vi.stubEnv("ADMIN_USERNAME", "owner");
  vi.stubEnv("ADMIN_PASSWORD_HASH", hash);
  vi.stubEnv("SESSION_SECRET", SECRET);
});

afterAll(() => vi.unstubAllEnvs());

async function loadLogin() {
  vi.resetModules();
  return import("@/app/api/admin/login/route");
}

const login = (body: unknown, ip = "203.0.113.50", origin?: string | null) =>
  postJson(LOGIN, { body, headers: { "x-forwarded-for": ip }, origin: origin === undefined ? "http://localhost:3000" : origin });

describe("POST /api/admin/login", () => {
  it("signs in with the right credentials and sets a locked-down session cookie", async () => {
    const { POST } = await loadLogin();
    const res = await POST(login({ username: "owner", password: PASSWORD }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^pm_admin=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=28800/);

    const token = cookie.split(";")[0].split("=")[1];
    expect((await verifySessionToken(token, SECRET))?.sub).toBe("owner");
  });

  it("rejects a wrong password with a generic message and no cookie", async () => {
    const { POST } = await loadLogin();
    const res = await POST(login({ username: "owner", password: "wrong-password-here" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Incorrect username or password.");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("gives the same answer for an unknown username (no user enumeration)", async () => {
    const { POST } = await loadLogin();
    const res = await POST(login({ username: "someone", password: PASSWORD }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Incorrect username or password.");
  });

  it("locks out an IP after 5 failed attempts, even with the right password", async () => {
    const { POST } = await loadLogin();
    const ip = "203.0.113.99";
    for (let i = 0; i < 5; i++) {
      expect((await POST(login({ username: "owner", password: "nope-nope-nope" }, ip))).status).toBe(401);
    }
    expect((await POST(login({ username: "owner", password: PASSWORD }, ip))).status).toBe(429);
    // A different IP can still sign in.
    expect((await POST(login({ username: "owner", password: PASSWORD }, "203.0.113.100"))).status).toBe(200);
  });

  it("rejects cross-site login attempts", async () => {
    const { POST } = await loadLogin();
    expect((await POST(login({ username: "owner", password: PASSWORD }, undefined, "https://evil.example"))).status).toBe(403);
  });

  it("rejects malformed bodies", async () => {
    const { POST } = await loadLogin();
    expect((await POST(login({ username: "owner" }))).status).toBe(400);
    expect((await POST(postJson(LOGIN, { raw: "nope" }))).status).toBe(400);
    expect((await POST(login({ username: "owner", password: "x".repeat(201) }))).status).toBe(400);
  });

  it("is disabled when admin settings are missing or weak", async () => {
    vi.stubEnv("SESSION_SECRET", "short");
    const { POST } = await loadLogin();
    const res = await POST(login({ username: "owner", password: PASSWORD }));
    expect(res.status).toBe(503);
  });

  it("never echoes the password back", async () => {
    const { POST } = await loadLogin();
    const res = await POST(login({ username: "owner", password: "wrong-password-xyz" }, "203.0.113.7"));
    expect(await res.text()).not.toContain("wrong-password-xyz");
  });
});

describe("POST /api/admin/logout", () => {
  it("clears the session cookie and redirects to the login page", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/admin/logout/route");
    const res = await POST(postJson("http://localhost:3000/api/admin/logout"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login");
    expect(res.headers.get("set-cookie")).toMatch(/pm_admin=;.*Max-Age=0/i);
  });

  it("rejects cross-site logout", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/admin/logout/route");
    const res = await POST(postJson("http://localhost:3000/api/admin/logout", { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
});

describe("proxy (first gate for /admin)", () => {
  const get = (path: string, cookie?: string) =>
    new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });

  it("redirects /admin to the login page when there is no session cookie", async () => {
    const { proxy } = await import("@/proxy");
    const res = proxy(get("/admin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login");
  });

  it("lets the login page through", async () => {
    const { proxy } = await import("@/proxy");
    expect(proxy(get("/admin/login")).headers.get("location")).toBeNull();
  });

  it("passes requests with a cookie on to the server-side check", async () => {
    const { proxy } = await import("@/proxy");
    const res = proxy(get("/admin", "pm_admin=something"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});

describe("getAdminSession (server-side check on every admin page)", () => {
  async function withCookie(value: string | undefined) {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      cookies: async () => ({ get: (name: string) => (name === "pm_admin" && value ? { value } : undefined) }),
    }));
    vi.doMock("next/navigation", () => ({
      redirect: (to: string) => {
        throw new Error(`REDIRECT:${to}`);
      },
    }));
    return import("@/lib/auth/server");
  }

  it("accepts a valid signed session", async () => {
    const { createSessionToken } = await import("@/lib/auth/session");
    const token = await createSessionToken("owner", SECRET);
    const { getAdminSession, requireAdmin } = await withCookie(token);
    expect((await getAdminSession())?.sub).toBe("owner");
    await expect(requireAdmin()).resolves.toMatchObject({ sub: "owner" });
  });

  it("rejects a forged cookie and redirects to login", async () => {
    const { getAdminSession, requireAdmin } = await withCookie("forged.token");
    expect(await getAdminSession()).toBeNull();
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("rejects a valid token for a different username", async () => {
    const { createSessionToken } = await import("@/lib/auth/session");
    const token = await createSessionToken("old-admin", SECRET);
    const { getAdminSession } = await withCookie(token);
    expect(await getAdminSession()).toBeNull();
  });

  it("rejects everything when no cookie is present", async () => {
    const { requireAdmin } = await withCookie(undefined);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
  });
});
