#!/usr/bin/env node
// Run the unit tests under scripts/tests with an explicit file list.
// Usage: node scripts/run-tests.mjs
// `node --test scripts/tests/*.test.mjs` depends on the shell expanding the glob: cmd.exe and
// PowerShell do not, and Node expands --test globs itself only from 21 on. Listing the files
// here works on Node 18+ in every shell. The exit code is node --test's own.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { HARNESS_ROOT, isMain } from "./lib/paths.mjs";

export function testFiles(dir = path.join(HARNESS_ROOT, "scripts", "tests")) {
  return readdirSync(dir).filter((name) => name.endsWith(".test.mjs")).sort().map((name) => path.join(dir, name));
}

function main() {
  const files = testFiles();
  if (files.length === 0) {
    console.error("run-tests: no *.test.mjs files under scripts/tests");
    return 1;
  }
  const result = spawnSync(process.execPath, ["--test", ...files], { cwd: HARNESS_ROOT, stdio: "inherit" });
  if (result.error) {
    console.error(`run-tests: could not start node --test: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

if (isMain(import.meta.url)) process.exitCode = main();
