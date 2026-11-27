#!/usr/bin/env node
// PostToolUse hook (file edits): refresh the project's code-only Graphify
// graph in the background so structural queries see the new code.
//
// Runs only when the graphify executable is on PATH AND the project already
// has a graphify-out/ directory, so it never creates a graph nobody asked
// for. The refresh is a code-only extraction with no model call. It is
// spawned detached, so the hook returns at once, and it is throttled to one
// run per THROTTLE_MS. Silent (exit 0) when anything is missing or fails.
// Opt out with GIFISI_GRAPHIFY_REFRESH=0.
import { spawn } from "node:child_process";
import { closeSync, openSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findExecutable, isDirectory, projectDir, runHook } from "./hook-io.mjs";

const THROTTLE_MS = 60_000;
const CODE_FILE = /\.(js|mjs|cjs|jsx|ts|tsx|mts|cts|py|go|rs|java|kt|rb|php|cs|swift|c|h|cpp|hpp)$/i;
const SKIP_DIR = /(^|[\\/])(node_modules|\.git|dist|build|\.next|coverage|graphify-out|\.gifisi)([\\/]|$)/;

function editedFiles(event) {
  const input = event.tool_input ?? {};
  const files = [input.file_path, input.path, input.notebook_path];
  if (Array.isArray(input.edits)) for (const edit of input.edits) files.push(edit?.file_path);
  return files.filter((file) => typeof file === "string" && file);
}

function recentlyRefreshed(stamp) {
  try {
    return Date.now() - statSync(stamp).mtimeMs < THROTTLE_MS;
  } catch {
    return false;
  }
}

await runHook(async (event) => {
  if (process.env.GIFISI_GRAPHIFY_REFRESH === "0") return;
  const files = editedFiles(event);
  if (!files.some((file) => CODE_FILE.test(file) && !SKIP_DIR.test(file))) return;

  const root = projectDir(event);
  const outDir = path.join(root, "graphify-out");
  if (!isDirectory(outDir)) return;
  const graphify = findExecutable("graphify");
  if (!graphify) return;

  const stamp = path.join(outDir, ".gifisi-refresh");
  if (recentlyRefreshed(stamp)) return;
  writeFileSync(stamp, `${new Date().toISOString()}\n`);

  const log = openSync(path.join(outDir, ".gifisi-refresh.log"), "a");
  const child = spawn(graphify, ["extract", ".", "--code-only", "--no-cluster"], {
    cwd: root,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, GRAPHIFY_NO_AUTO_REFRESH: "1" },
  });
  child.on("error", () => {});
  child.unref();
  closeSync(log);
});
