import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bodyTooLarge, clientIp, isSameOrigin, MAX_BODY_BYTES } from "@/lib/http";
import { createMemoryLimiter, createRateLimiter, createRedisLimiter, redisConfig } from "@/lib/rate-limit";

describe("memory rate limiter", () => {
  it("allows up to the limit then blocks", async () => {
    const rl = createMemoryLimiter({ limit: 3, windowMs: 1000 });
    expect([await rl.hit("a", 0), await rl.hit("a", 1), await rl.hit("a", 2), await rl.hit("a", 3)]).toEqual([true, true, true, false]);
  });

  it("tracks keys independently", async () => {
    const rl = createMemoryLimiter({ limit: 1, windowMs: 1000 });
    expect(await rl.hit("a", 0)).toBe(true);
    expect(await rl.hit("b", 0)).toBe(true);
    expect(await rl.hit("a", 1)).toBe(false);
  });

  it("allows again once the window has passed", async () => {
    const rl = createMemoryLimiter({ limit: 1, windowMs: 1000 });
    await rl.hit("a", 0);
    expect(await rl.hit("a", 999)).toBe(false);
    expect(await rl.hit("a", 1001)).toBe(true);
  });

  it("isBlocked checks without recording a hit", async () => {
    const rl = createMemoryLimiter({ limit: 2, windowMs: 1000 });
    await rl.hit("a", 0);
    expect(await rl.isBlocked("a", 1)).toBe(false);
    expect(await rl.isBlocked("a", 1)).toBe(false);
    await rl.hit("a", 2);
    expect(await rl.isBlocked("a", 3)).toBe(true);
  });

  it("reset clears a key", async () => {
    const rl = createMemoryLimiter({ limit: 1, windowMs: 1000 });
    await rl.hit("a", 0);
    await rl.reset("a");
    expect(await rl.hit("a", 1)).toBe(true);
  });
});

describe("Redis (Upstash) rate limiter for Vercel", () => {
  // A tiny fake of Upstash's REST /pipeline endpoint.
  function fakeUpstash() {
    const store = new Map<string, number>();
    const calls: unknown[] = [];
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      calls.push({ url, headers: init?.headers });
      const cmds = JSON.parse(String(init?.body)) as (string | number)[][];
      const out = cmds.map(([cmd, key]) => {
        const k = String(key);
        if (cmd === "INCR") {
          store.set(k, (store.get(k) ?? 0) + 1);
          return { result: store.get(k) };
        }
        if (cmd === "GET") return { result: store.has(k) ? String(store.get(k)) : null };
        if (cmd === "DEL") return { result: Number(store.delete(k)) };
        return { result: 1 };
      });
      return new Response(JSON.stringify(out));
    });
    return { store, calls, spy };
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("counts hits in Redis and blocks over the limit", async () => {
    const { store } = fakeUpstash();
    const rl = createRedisLimiter({ name: "t", limit: 2, windowMs: 60_000 }, { url: "https://r.upstash.io", token: "tok" });
    expect([await rl.hit("ip1", 0), await rl.hit("ip1", 1), await rl.hit("ip1", 2)]).toEqual([true, true, false]);
    expect(await rl.isBlocked("ip1", 3)).toBe(true);
    expect(await rl.isBlocked("ip2", 3)).toBe(false);
    expect([...store.keys()]).toContain("rl:t:ip1:0");
  });

  it("sends the token as a bearer header to the pipeline endpoint", async () => {
    const { calls } = fakeUpstash();
    const rl = createRedisLimiter({ name: "t", limit: 2, windowMs: 60_000 }, { url: "https://r.upstash.io", token: "tok" });
    await rl.hit("ip1");
    expect(calls[0]).toMatchObject({ url: "https://r.upstash.io/pipeline", headers: { Authorization: "Bearer tok" } });
  });

  it("starts a fresh count in the next window and supports reset", async () => {
    fakeUpstash();
    const rl = createRedisLimiter({ name: "t", limit: 1, windowMs: 1000 }, { url: "https://r.upstash.io", token: "tok" });
    await rl.hit("ip", 0);
    expect(await rl.hit("ip", 10)).toBe(false);
    expect(await rl.hit("ip", 1500)).toBe(true);
    await rl.reset("ip", 1500);
    expect(await rl.isBlocked("ip", 1500)).toBe(false);
  });

  it("is picked automatically when Vercel's KV env vars are set", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.upstash.io/");
    vi.stubEnv("KV_REST_API_TOKEN", "kvtok");
    expect(redisConfig()).toEqual({ url: "https://kv.upstash.io", token: "kvtok" });
    const { calls } = fakeUpstash();
    await createRateLimiter({ name: "t", limit: 1, windowMs: 1000 }).hit("ip");
    expect(calls).toHaveLength(1);
  });

  it("falls back to memory if Redis is down, so limits still apply", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://down.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rl = createRateLimiter({ name: "t", limit: 1, windowMs: 60_000 });
    expect(await rl.hit("ip")).toBe(true);
    expect(await rl.hit("ip")).toBe(false);
  });

  it("uses memory when Redis is not configured", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("KV_REST_API_URL", "");
    expect(redisConfig()).toBeNull();
  });
});

const req = (headers: Record<string, string>) => new NextRequest("http://localhost:3000/api/x", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("accepts a matching Origin", () => {
    expect(isSameOrigin(req({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(true);
  });

  it("uses x-forwarded-host behind a proxy", () => {
    expect(isSameOrigin(req({ host: "internal:8080", "x-forwarded-host": "paintman.in", origin: "https://paintman.in" }))).toBe(true);
  });

  it.each(["https://evil.example", "http://localhost:3001", "null", "not a url"])("rejects Origin %s", (origin) => {
    expect(isSameOrigin(req({ host: "localhost:3000", origin }))).toBe(false);
  });

  it("rejects a cross-site fetch with no Origin header", () => {
    expect(isSameOrigin(req({ host: "localhost:3000", "sec-fetch-site": "cross-site" }))).toBe(false);
  });

  it("allows non-browser same-site requests with no Origin header", () => {
    expect(isSameOrigin(req({ host: "localhost:3000" }))).toBe(true);
  });
});

describe("bodyTooLarge and clientIp", () => {
  it("flags bodies over the limit", () => {
    expect(bodyTooLarge(req({ "content-length": String(MAX_BODY_BYTES + 1) }))).toBe(true);
    expect(bodyTooLarge(req({ "content-length": "200" }))).toBe(false);
  });

  it("reads the first forwarded IP", () => {
    expect(clientIp(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
