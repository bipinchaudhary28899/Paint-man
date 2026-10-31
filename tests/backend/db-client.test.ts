import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

// How the server picks its database: postgres.js for DATABASE_URL, PGlite in data/dev-db for local
// development, a clear error in production without a URL, and never the dev database in tests.

const postgresCalls: { url: string; opts: Record<string, unknown> }[] = [];
vi.mock("postgres", () => ({
  default: (url: string, opts: Record<string, unknown>) => {
    postgresCalls.push({ url, opts });
    // just enough of a postgres.js client for drizzle to wrap it (no query is ever sent)
    return { options: { parsers: {}, serializers: {} } };
  },
}));

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  const { setDb } = await import("@/lib/db/client");
  setDb(null);
  postgresCalls.length = 0;
});

describe("getDb", () => {
  it("refuses to open the development database from a test that did not ask for one", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await import("@/lib/db/client");
    await expect(getDb()).rejects.toThrow(/useTestDb/);
  });

  it("fails closed in production without DATABASE_URL, naming the setting, and retries on the next call", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const { getDb, DatabaseNotConfiguredError } = await import("@/lib/db/client");
    const err = await getDb().catch((e) => e);
    expect(err).toBeInstanceOf(DatabaseNotConfiguredError);
    expect(err.message).toMatch(/DATABASE_URL/);
    // the failure is not cached: once the URL is set, the next call connects
    vi.stubEnv("DATABASE_URL", "postgres://user:pw@db.example.com:6543/postgres");
    await expect(getDb()).resolves.toBeDefined();
  });

  it("connects to DATABASE_URL with postgres.js, without prepared statements (Supabase's transaction pooler)", async () => {
    vi.stubEnv("DATABASE_URL", "  postgres://user:pw@pooler.example.com:6543/postgres  ");
    const { getDb } = await import("@/lib/db/client");
    const db = await getDb();
    expect(await getDb()).toBe(db); // one connection, reused
    expect(postgresCalls).toHaveLength(1);
    expect(postgresCalls[0].url).toBe("postgres://user:pw@pooler.example.com:6543/postgres");
    expect(postgresCalls[0].opts).toMatchObject({ prepare: false });
  });

  it("uses PGlite in data/dev-db for local development, with the migrations applied", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "ps-devdb-"));
    try {
      vi.stubEnv("DATABASE_URL", "");
      vi.stubEnv("VITEST", "");
      vi.stubEnv("NODE_ENV", "development");
      const { getDb } = await import("@/lib/db/client");
      vi.spyOn(process, "cwd").mockReturnValue(dir);
      const db = await getDb();
      const tables = (await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`)) as unknown as { rows: { table_name: string }[] };
      expect(tables.rows.map((r) => r.table_name)).toEqual(
        expect.arrayContaining(["inspections", "leads", "otp_challenges", "project_events", "projects", "quotation_lines", "quotations", "sessions", "users"]),
      );
      expect(await readdir(path.join(dir, "data", "dev-db"))).toContain("PG_VERSION");
      await (db as unknown as { $client: { close(): Promise<void> } }).$client.close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
