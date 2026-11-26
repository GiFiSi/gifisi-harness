// Environment parsing shared by server code and tooling (drizzle.config.ts).
// No "server-only" import here: drizzle-kit loads this file outside Next.js.
// Server modules call getDatabaseUrl() and getLogLevel(); never read
// process.env directly elsewhere.
import { z } from "zod";

export const databaseUrlSchema = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
});

export const logLevelSchema = z
  .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
  .default("info");

export function parseEnv<T>(key: string, value: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(value);
  // Zod issues can echo the input value; report only the variable name.
  if (!result.success) throw new Error(`Invalid or missing environment variable: ${key}`);
  return result.data;
}

// Read lazily so a missing DATABASE_URL fails only the code that needs it.
export function getDatabaseUrl(): string {
  return parseEnv("DATABASE_URL", process.env.DATABASE_URL, databaseUrlSchema);
}

// Prefer the direct (unpooled) connection for migrations when the provider offers one.
export function getMigrationDatabaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  return value ? parseEnv("DATABASE_URL", value, databaseUrlSchema) : undefined;
}

export function getLogLevel() {
  return parseEnv("LOG_LEVEL", process.env.LOG_LEVEL, logLevelSchema);
}
