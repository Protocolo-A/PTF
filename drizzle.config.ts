import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Use the same .env / .env.local precedence as Next.js, including development.
// Container-provided environment variables always take priority.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL. Ejecuta node scripts/setup-local.mjs para preparar el desarrollo local, o configura tu conexión PostgreSQL en .env junto a package.json.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
});
