import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const fileStorage = process.env.DEVFOLIO_STORAGE === "file";
const databaseUrl = process.env.DATABASE_URL;

if (!fileStorage && !databaseUrl) {
  throw new Error(
    "Falta DATABASE_URL: configura PostgreSQL en .env.local. " +
    "Ejecuta node scripts/setup-local.mjs para verificar la conexión a tu base PostgreSQL existente.",
  );
}

type Database = NodePgDatabase<typeof schema>;
const globalForDb = globalThis as typeof globalThis & { __devfolioPostgresqlPool?: Pool };

export const pool: Pool | null = fileStorage
  ? null
  : (globalForDb.__devfolioPostgresqlPool ?? new Pool({ connectionString: databaseUrl }));

if (!fileStorage && process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__devfolioPostgresqlPool = pool;
}

// The null branch is used only by the file-backed repository; callers must
// go through src/lib/data-store.ts, which selects the correct storage engine.
export const db: Database | null = fileStorage ? null : drizzle(pool!, { schema });
