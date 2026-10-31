import { sql } from "drizzle-orm";
import { afterAll, beforeAll } from "vitest";
import { openPglite, setDb, type Db } from "@/lib/db/client";

// A fresh in-memory Postgres (PGlite) for one test file, with every migration in drizzle/ applied,
// installed as the app's database (getDb) for the file's tests. Never a network database.
//
//   const testDb = useTestDb();
//   beforeEach(() => resetTestDb(testDb.db));   // optional: empty tables between tests

export function useTestDb(): { db: Db } {
  const handle = {} as { db: Db; close: () => Promise<void> };
  beforeAll(async () => {
    const opened = await openPglite();
    handle.db = opened.db;
    handle.close = opened.close;
    setDb(opened.db);
  }, 60_000);
  afterAll(async () => {
    setDb(null);
    await handle.close?.();
  });
  return handle;
}

/** Empties every table (keeps the schema). */
export async function resetTestDb(db: Db) {
  await db.execute(sql`TRUNCATE users, otp_challenges, sessions, leads, projects, project_events, inspections, quotations, quotation_lines CASCADE`);
}
