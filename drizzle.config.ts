// drizzle-kit settings: `npm run db:generate` writes SQL migrations to drizzle/ from the schema,
// `npm run db:migrate` applies them.
//
// Migrations run over the DIRECT connection (DATABASE_URL_DIRECT, Supabase port 5432): the pooled
// one (DATABASE_URL, port 6543, transaction mode) is for the app at runtime. With neither set,
// db:migrate updates the local development database in data/dev-db (PGlite), which `npm run dev`
// also migrates by itself on start.
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  strict: true,
  ...(url ? { dbCredentials: { url } } : { driver: "pglite", dbCredentials: { url: "./data/dev-db" } }),
});
