import { getTableConfig } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";
import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { failure, fieldErrors, personalError, personalOk, readJsonBody } from "@/lib/api-personal";
import { checkLimits, rateLimited } from "@/lib/auth/limits";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { inspections, leads, projectEvents, projects, quotationLines, quotations, sessions } from "@/lib/db/schema";
import { createMemoryLimiter, type RateLimiter } from "@/lib/rate-limit";

// Small building blocks of the account API: the no-store envelope helpers, bounded JSON bodies,
// combined rate limits, and the schema's foreign keys.

afterEach(() => vi.restoreAllMocks());

describe("personal envelope helpers", () => {
  it("never caches success or error answers, and keeps a 201", async () => {
    const ok = personalOk({ kind: "booking", label: "Received", data: { received: true }, status: 201, headers: { "X-Extra": "1" } });
    expect(ok.status).toBe(201);
    expect(ok.headers.get("cache-control")).toContain("no-store");
    expect(ok.headers.get("x-extra")).toBe("1");
    const err = personalError(404, "not_found", "No such project.");
    expect(err.headers.get("cache-control")).toContain("no-store");
    expect(await err.json()).toMatchObject({ kind: "error", label: "No such project.", error: { code: "not_found", message: "No such project." } });
  });

  it("reads bounded JSON bodies: 415 without a JSON content type, 400 for broken JSON", async () => {
    const make = (body: string, headers: Record<string, string>) => new NextRequest("http://localhost:3000/api/v1/x", { method: "POST", headers, body });
    expect(await readJsonBody(make('{"a":1}', { "content-type": "application/json; charset=utf-8" }))).toEqual({ ok: true, body: { a: 1 } });
    const noType = await readJsonBody(new NextRequest("http://localhost:3000/api/v1/x", { method: "POST", body: new Uint8Array([123, 125]) }));
    expect(!noType.ok && noType.response.status).toBe(415);
    const broken = await readJsonBody(make("{", { "content-type": "application/json" }));
    expect(!broken.ok && broken.response.status).toBe(400);
  });

  it("maps each field to its first message, and a body-level problem to `body`", () => {
    const schema = z.object({ a: z.string().min(2, "too short").max(1, "never") });
    const result = schema.safeParse({ a: "x" });
    expect(fieldErrors(result.error!)).toEqual({ a: "too short" });
    expect(fieldErrors(z.string().safeParse(1).error!)).toEqual({ body: expect.any(String) });
  });

  it("answers 503 for a missing database and 500 otherwise, logging only the error's type", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(failure(new DatabaseNotConfiguredError(), "Test").status).toBe(503);
    expect((await failure("weird", "Test").json()).error.code).toBe("internal_error");
    expect(log).toHaveBeenCalledWith("Test failed:", "unknown");
    expect(log).toHaveBeenCalledWith("Test failed:", "DatabaseNotConfiguredError");
  });
});

describe("checkLimits", () => {
  it("records a hit on every limiter while all have room", async () => {
    const a = createMemoryLimiter({ limit: 2, windowMs: 1000 });
    const b = createMemoryLimiter({ limit: 1, windowMs: 30_000 });
    expect(await checkLimits([[a, "ip"], [b, "phone"]], 0)).toBe(0);
    // b is used up: nothing is counted on a, and the wait is b's
    expect(await checkLimits([[a, "ip"], [b, "phone"]], 1000 - 1)).toBe(30);
    expect(await a.isBlocked("ip", 999)).toBe(false);
  });

  it("reports the wait when a limiter fills up between the check and the hit (a parallel request)", async () => {
    const racing: RateLimiter = { isBlocked: async () => false, hit: async () => false, reset: async () => {}, retryAfterMs: async () => 0 };
    expect(await checkLimits([[racing, "k"]])).toBe(1); // at least a second
  });

  it("answers 429 with the wait in details and Retry-After", async () => {
    const res = rateLimited(12);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("12");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect((await res.json()).error).toEqual({ code: "rate_limited", message: "Too many requests. Try again in 12 seconds.", details: { retryAfterSeconds: 12 } });
  });
});

describe("schema foreign keys", () => {
  const fks = (table: Parameters<typeof getTableConfig>[0]) =>
    getTableConfig(table).foreignKeys.map((fk) => {
      const ref = fk.reference();
      return `${ref.columns.map((c) => c.name).join()} → ${getTableConfig(ref.foreignTable).name}.${ref.foreignColumns.map((c) => c.name).join()} (${fk.onDelete})`;
    });

  it("deletes a customer's sessions with the account but keeps their leads and projects, unlinked", () => {
    expect(fks(sessions)).toEqual(["user_id → users.id (cascade)"]);
    expect(fks(leads)).toEqual(["user_id → users.id (set null)"]);
    expect(fks(projects).sort()).toEqual(["lead_id → leads.id (set null)", "user_id → users.id (set null)"]);
  });

  it("removes a project's timeline, inspection and quotations with it, and a quotation's lines with it", () => {
    expect(fks(projectEvents)).toEqual(["project_id → projects.id (cascade)"]);
    expect(fks(inspections)).toEqual(["project_id → projects.id (cascade)"]);
    expect(fks(quotations)).toEqual(["project_id → projects.id (cascade)"]);
    expect(fks(quotationLines)).toEqual(["quotation_id → quotations.id (cascade)"]);
  });
});
