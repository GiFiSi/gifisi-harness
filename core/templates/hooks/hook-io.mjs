// Shared helpers for poteto-harness hook scripts.
//
// Contract: a hook reads one JSON event on stdin and answers with its exit
// code, optionally with text or JSON on stdout. These hooks only add
// convenience, so they fail open: any parse error, missing tool or runtime
// error ends in exit 0 with no output, and the agent's action proceeds.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export function readStdinRaw() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// JSON.parse("null") returns null without throwing, and "42" or "true" parse
// too. Only a plain object counts as an event.
export function parseHookEvent(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed;
}

export function readHookEvent() {
  return parseHookEvent(readStdinRaw());
}

// The project the agent works in: the event's cwd, then the client's
// project variable, then the process cwd.
export function projectDir(event) {
  const candidates = [event?.cwd, process.env.CLAUDE_PROJECT_DIR, process.cwd()];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate && isDirectory(candidate)) return candidate;
  }
  return process.cwd();
}

export function isDirectory(dir) {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

// Find a real executable on PATH without spawning a shell. On Windows only
// .exe and .com are accepted: .cmd and .bat shims need a shell to run, and
// passing agent-written text through a shell is not safe. A shim-only
// install therefore counts as absent and the hook stays silent.
export function findExecutable(name) {
  const dirs = String(process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const windows = process.platform === "win32";
  const suffixes = windows ? [".exe", ".com"] : [""];
  for (const dir of dirs) {
    for (const suffix of suffixes) {
      const candidate = path.join(dir, name + suffix);
      try {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
      } catch {
        // Unreadable PATH entries are skipped.
      }
    }
  }
  return null;
}

export function emitJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

// Run a hook body with the fail-open policy: whatever happens, exit 0.
export async function runHook(body) {
  try {
    const event = readHookEvent();
    if (event !== null) await body(event);
  } catch {
    // Fail open: a convenience hook never blocks the agent.
  }
  process.exit(0);
}
