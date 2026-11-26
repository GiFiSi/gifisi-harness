import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { getMigrationDatabaseUrl } from "./src/lib/env-schema";

// Load .env files the same way Next.js does, so drizzle-kit sees the same values.
loadEnvConfig(process.cwd());
const url = getMigrationDatabaseUrl();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  // Generating SQL needs no connection; migrate and push need a configured URL.
  ...(url ? { dbCredentials: { url } } : {}),
});
