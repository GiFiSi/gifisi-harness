import { existsSync, realpathSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The harness root is two levels above this file: <root>/scripts/lib/paths.mjs.
// The same holds for an installed copy: <home>/scripts/lib/paths.mjs.
export const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Harness content (harness/, playbooks/, principles/, prompts/, skills/, templates/) lives under
// <root>/core/ in the repository and in every installed copy; scripts/ stays beside it.
export const CORE = "core";

// POSIX `/tmp` and Git Bash `/tmp` on Windows both map to the OS temp directory there.
// Node on win32 would resolve a literal "/tmp/x" to "C:\\tmp\\x", so translate it.
export function tmpRoot() {
  return process.platform === "win32" ? os.tmpdir() : "/tmp";
}

export function resolveUserPath(input) {
  if (!input) throw new Error("A path is required");
  let value = input;
  if (value === "~" || value.startsWith("~/")) value = path.join(os.homedir(), value.slice(1));
  if (process.platform === "win32") {
    if (/^\/tmp(\/|$)/.test(value)) value = path.join(tmpRoot(), value.slice(4));
    const drive = /^\/([a-zA-Z])(\/.*)?$/.exec(value);
    if (drive) value = `${drive[1].toUpperCase()}:${drive[2] ?? "/"}`;
  }
  return path.resolve(value);
}

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

// Find the project root for a project-scoped artifact (.poteto/...).
// Walks up from `start` to the first directory holding `.poteto/` or `.git`; falls back to `start`.
export function findProjectRoot(start = process.cwd()) {
  let current = path.resolve(start);
  for (;;) {
    for (const marker of [".poteto", ".git"]) {
      const candidate = path.join(current, marker);
      if (existsSync(candidate) && statSync(candidate).isDirectory()) return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start);
    current = parent;
  }
}

// True when the module at `importMetaUrl` is the script Node was started with. Both sides go
// through realpath, because Node resolves the main module through symlinks and junctions
// (macOS /tmp -> /private/tmp, a junctioned checkout on Windows). Windows paths compare
// case-insensitively.
export function isMain(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    const self = realpathSync(fileURLToPath(importMetaUrl));
    const invoked = realpathSync(path.resolve(argv1));
    return process.platform === "win32" ? self.toLowerCase() === invoked.toLowerCase() : self === invoked;
  } catch {
    return false;
  }
}
