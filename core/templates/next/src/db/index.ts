// Single server entry point for the database: one bounded pool, created
// lazily on first use, reused across hot reloads. Presentation code never
// imports this module; it calls feature modules that do.
import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseUrl } from "@/lib/env-schema";
import { logger } from "@/lib/logger";
import * as schema from "./schema";

const globals = globalThis as typeof globalThis & { __appPostgresPool?: Pool };
let cached: { client: Pool; db: NodePgDatabase<typeof schema> } | undefined;

export function getDb() {
  let client = globals.__appPostgresPool;
  if (!client) {
    client = new Pool({
      connectionString: getDatabaseUrl(),
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    client.on("error", (error) => {
      // Log the error code only: messages can carry connection details.
      logger.error({ code: (error as NodeJS.ErrnoException).code }, "Idle database connection failed");
    });
    globals.__appPostgresPool = client;
  }
  // Keep the pool across hot reloads, but rebuild the ORM when the schema module reloads.
  if (!cached || cached.client !== client) cached = { client, db: drizzle({ client, schema }) };
  return cached.db;
}

// For owned shutdown and tests only; never call it after each request.
export async function closeDatabase() {
  const client = globals.__appPostgresPool;
  delete globals.__appPostgresPool;
  cached = undefined;
  await client?.end();
}
