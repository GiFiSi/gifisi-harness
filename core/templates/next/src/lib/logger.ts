// Server logger (Pino). The one module allowed to write logs; the
// quality/no-direct-console rule points every other file here.
import "server-only";
import pino, { type DestinationStream } from "pino";
import { getLogLevel } from "./env-schema";

const REDACTED_PATHS = [
  "password", "token", "secret", "authorization", "cookie",
  "DATABASE_URL", "DATABASE_URL_UNPOOLED", "databaseUrl",
  "*.password", "*.token", "*.secret", "*.authorization", "*.cookie",
  "req.headers.authorization", "req.headers.cookie", 'req.headers["x-api-key"]',
];

export function createLogger(destination?: DestinationStream) {
  const options = {
    level: getLogLevel(),
    // Secrets are removed, not masked, so their length never leaks.
    redact: { paths: REDACTED_PATHS, remove: true },
  };
  return destination ? pino(options, destination) : pino(options);
}

export const logger = createLogger();
