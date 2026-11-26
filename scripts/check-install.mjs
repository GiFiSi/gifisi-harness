#!/usr/bin/env node
// Prove the installer is clean on the first run and idempotent on the second.
// Usage: node scripts/check-install.mjs [--keep]
// Fixtures live under the OS temp dir (Git Bash /tmp on Windows, /tmp elsewhere):
//   test-harness-target            empty target, created by the install
//   test-harness-target-brownfield existing CRLF AGENTS.md, CLAUDE.md, package.json, tests, eslint, docs, pnpm lock
//   test-harness-home              fake home with a user ~/.claude/CLAUDE.md for --global
//   test-harness home-space        --global into a home whose path has a space; runs a rendered command
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { HARNESS_ROOT, isMain, tmpRoot, toPosix } from "./lib/paths.mjs";
import { BEGIN, END, countMarkers } from "./lib/managed-blocks.mjs";
import { linkChecks } from "./lib/content-checks.mjs";

const KEEP = process.argv.includes("--keep");
const INSTALL_SH = path.join(HARNESS_ROOT, "install.sh");
const SYNC = path.join(HARNESS_ROOT, "scripts", "sync-harnesses.mjs");
const results = [];
const record = (fixture, check, pass, detail = "") => results.push({ fixture, check, pass: Boolean(pass), detail });

const BROWNFIELD = {
  "AGENTS.md": "# Billing service\r\n\r\nTeam rule: every handler validates input with the shared schema.\r\nRun the contract tests before merging.\r\n",
  "CLAUDE.md": "# Claude notes\n\nAnswer in short sentences. Ask before touching migrations.\n",
  "package.json": `${JSON.stringify({ name: "billing-service", private: true, type: "module", scripts: { test: "node --test test/", lint: "eslint ." }, devDependencies: { eslint: "9.0.0" } }, null, 2)}\n`,
  "test/app.test.mjs": "import assert from \"node:assert/strict\";\nimport { test } from \"node:test\";\n\ntest(\"adds\", () => assert.equal(1 + 1, 2));\n",
  "eslint.config.mjs": "export default [{ rules: { \"max-lines\": [\"error\", { max: 350, skipBlankLines: true, skipComments: true }] } }];\n",
  "docs/architecture.md": "# Architecture\n\nInvoices flow from the API to the ledger through one queue.\n",
  "pnpm-lock.yaml": "lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n",
};
const HOME_FILES = {
  ".claude/CLAUDE.md": "# My global rules\r\n\r\nPrefer small diffs and explain trade-offs.\r\n",
  ".claude/settings.json": "{\n  \"theme\": \"dark\"\n}\n",
};

// ---- bash discovery: Git Bash on Windows, never the WSL launcher ------------

function findBash() {
  const candidates = [];
  if (process.platform === "win32") {
    for (const base of [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs")]) {
      if (base) candidates.push(path.join(base, "Git", "bin", "bash.exe"), path.join(base, "Git", "usr", "bin", "bash.exe"));
    }
  }
  candidates.push("bash");
  for (const bash of candidates) {
    if (bash !== "bash" && !existsSync(bash)) continue;
    const probe = spawnSync(bash, ["-c", "uname -s; command -v cygpath >/dev/null && cygpath -m /tmp || echo /tmp"], { encoding: "utf8" });
    if (probe.error || probe.status !== 0) continue;
    const [uname, tmp] = probe.stdout.trim().split(/\r?\n/);
    if (process.platform === "win32" && !/MINGW|MSYS|CYGWIN/i.test(uname)) continue;
    return { bash, uname, tmp };
  }
  return null;
}

// ---- helpers ------------------------------------------------------------------

function snapshot(root) {
  const hash = createHash("sha256");
  let files = 0;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(abs);
      else {
        hash.update(toPosix(path.relative(root, abs))).update("\0").update(readFileSync(abs)).update("\0");
        files++;
      }
    }
  };
  visit(root);
  return { digest: hash.digest("hex"), files };
}

function put(root, rel, content) {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

const read = (root, rel) => (existsSync(path.join(root, rel)) ? readFileSync(path.join(root, rel), "utf8") : null);

// Original bytes stay a prefix; after them comes only a blank line, the block, and one EOL.
function preservedOutside(original, actual) {
  if (actual === null) return [false, "file is missing"];
  if (!actual.startsWith(original)) return [false, "user text before the block changed"];
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const rest = actual.slice(original.length);
  if (!rest.startsWith(`${eol}${BEGIN}${eol}`) || !rest.endsWith(`${END}${eol}`)) return [false, "unexpected bytes around the block"];
  if (eol === "\r\n" && /(^|[^\r])\n/.test(actual)) return [false, "CRLF file gained bare LF lines"];
  return [true, eol === "\r\n" ? "prefix identical, CRLF kept" : "prefix identical"];
}

function checkMarkers(fixture, root, rels) {
  for (const rel of rels) {
    const text = read(root, rel);
    const counts = text === null ? null : countMarkers(text);
    const ok = counts && counts.begin === 1 && counts.end === 1;
    record(fixture, `one managed block in ${rel}`, ok, counts ? `begin=${counts.begin} end=${counts.end}` : "missing");
  }
}

// ---- install runs -------------------------------------------------------------

function makeRunner() {
  const found = findBash();
  if (!found) {
    console.log("bash not found: running node scripts/sync-harnesses.mjs directly instead of install.sh.");
    return (args) => spawnSync(process.execPath, [SYNC, ...args], { cwd: HARNESS_ROOT, encoding: "utf8" });
  }
  const tmpMatches = path.resolve(found.tmp) === path.resolve(tmpRoot());
  console.log(`bash: ${found.bash} (${found.uname}); bash /tmp -> ${found.tmp}${tmpMatches ? "" : " (differs from the Node temp dir; passing native paths)"}`);
  return (args) => {
    const mapped = args.map((a) => (!tmpMatches && a.startsWith("/tmp/") ? toPosix(path.join(tmpRoot(), a.slice(5))) : a));
    return spawnSync(found.bash, [toPosix(INSTALL_SH), ...mapped], { cwd: HARNESS_ROOT, encoding: "utf8" });
  };
}

function twoRuns(fixture, root, args, install) {
  const first = install(args);
  record(fixture, "run 1 exits 0", first.status === 0, first.status === 0 ? lastLine(first.stdout) : (first.stderr || first.stdout).trim().split("\n")[0]);
  if (first.status !== 0) return false;
  const before = snapshot(root);
  const second = install(args);
  record(fixture, "run 2 exits 0 with writes=0", second.status === 0 && /\bwrites=0\b/.test(second.stdout), lastLine(second.stdout || second.stderr));
  const after = snapshot(root);
  record(fixture, "run 2 leaves every byte unchanged", before.digest === after.digest, `${after.files} files, sha256 ${after.digest.slice(0, 12)}`);
  return true;
}

function lastLine(text) {
  return text.trim().split(/\r?\n/).at(-1) ?? "";
}

function validateProject(fixture, root) {
  const script = path.join(root, ".poteto", "scripts", "validate-project.mjs");
  if (!existsSync(script)) return record(fixture, "validate-project exits 0", false, "installed validate-project.mjs is missing");
  const result = spawnSync(process.execPath, [script, "--root", root], { cwd: root, encoding: "utf8" });
  const failures = (result.stdout + result.stderr).split("\n").filter((l) => /FAIL/.test(l)).slice(0, 3).join("; ");
  record(fixture, "validate-project exits 0", result.status === 0, result.status === 0 ? lastLine(result.stdout) : failures || lastLine(result.stderr));
}

// Every link and backticked harness path inside an installed harness tree resolves in that tree,
// so a subset copy (global) never ships references to files it left out.
function checkInstalledLinks(fixture, harnessRoot) {
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(abs);
      else files.push(abs);
    }
  };
  visit(harnessRoot);
  const { problems, checked } = linkChecks({ root: harnessRoot, files });
  const detail = problems.length ? problems.slice(0, 3).map((p) => `${p.file}: ${p.message}`).join("; ") : `checked=${checked}`;
  record(fixture, "installed harness links resolve", problems.length === 0, detail);
}

// ---- fixtures -----------------------------------------------------------------

function checkEmptyTarget(install) {
  const name = "test-harness-target";
  const root = path.join(tmpRoot(), name);
  rmSync(root, { recursive: true, force: true });
  if (!twoRuns(name, root, ["--project", `/tmp/${name}`], install)) return;
  checkMarkers(name, root, ["AGENTS.md", ".cursor/rules/poteto-harness.mdc"]);
  record(name, "CLAUDE.md imports @AGENTS.md", /^@AGENTS\.md\r?$/m.test(read(root, "CLAUDE.md") ?? ""));
  record(name, "CLAUDE.md has exactly one @AGENTS.md line", (read(root, "CLAUDE.md") ?? "").split(/\r?\n/).filter((l) => l.replace(/^﻿/, "") === "@AGENTS.md").length === 1);
  checkInstalledLinks(name, path.join(root, ".poteto"));
  validateProject(name, root);
}

function checkBrownfield(install) {
  const name = "test-harness-target-brownfield";
  const root = path.join(tmpRoot(), name);
  rmSync(root, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(BROWNFIELD)) put(root, rel, content);
  if (!twoRuns(name, root, ["--project", `/tmp/${name}`], install)) return;
  checkMarkers(name, root, ["AGENTS.md", "CLAUDE.md", ".cursor/rules/poteto-harness.mdc"]);
  for (const rel of ["AGENTS.md", "CLAUDE.md"]) {
    const [ok, detail] = preservedOutside(BROWNFIELD[rel], read(root, rel));
    record(name, `${rel} bytes outside markers preserved`, ok, detail);
  }
  for (const rel of ["package.json", "test/app.test.mjs", "eslint.config.mjs", "docs/architecture.md", "pnpm-lock.yaml"]) {
    record(name, `${rel} byte-identical`, read(root, rel) === BROWNFIELD[rel]);
  }
  let project = null;
  try {
    project = JSON.parse(read(root, ".poteto/project.json") ?? "null");
  } catch {
    project = null;
  }
  record(name, "project.json detects pnpm", project?.packageManager === "pnpm", `packageManager=${project?.packageManager}`);
  record(name, "project.json sees the max-lines rule", project?.eslint?.maxLinesRule === true, `eslint=${JSON.stringify(project?.eslint)}`);
  validateProject(name, root);
}

function checkGlobal(install) {
  const name = "test-harness-home";
  const root = path.join(tmpRoot(), name);
  rmSync(root, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(HOME_FILES)) put(root, rel, content);
  if (!twoRuns(name, root, ["--global", "--home", `/tmp/${name}`], install)) return;
  checkMarkers(name, root, [".claude/CLAUDE.md", ".codex/AGENTS.md", ".cursor/rules/poteto-harness.mdc"]);
  const [ok, detail] = preservedOutside(HOME_FILES[".claude/CLAUDE.md"], read(root, ".claude/CLAUDE.md"));
  record(name, ".claude/CLAUDE.md bytes outside markers preserved", ok, detail);
  record(name, ".claude/settings.json byte-identical", read(root, ".claude/settings.json") === HOME_FILES[".claude/settings.json"]);
  const home = `${toPosix(root)}/.poteto-harness/`;
  record(name, "router points at the global harness home", (read(root, ".codex/AGENTS.md") ?? "").includes(`\`${home}core/playbooks/`), home);
  record(name, "harness copied", existsSync(path.join(root, ".poteto-harness", "core", "harness", "routes.json")));
  checkInstalledLinks(name, path.join(root, ".poteto-harness"));
}

// A global home with a space (C:/Users/John Smith): the router's commands must survive a shell.
// The rendered classify-task line is run as written, through bash or the platform shell.
function checkSpaceHome(install) {
  const name = "test-harness home-space";
  const root = path.join(tmpRoot(), name);
  rmSync(root, { recursive: true, force: true });
  if (!twoRuns(name, root, ["--global", "--home", `/tmp/${name}`], install)) return;
  const router = read(root, ".claude/CLAUDE.md") ?? "";
  const pattern = /`(node "[^`]*scripts\/classify-task\.mjs" "<prompt>")`/;
  const line = router.split(/\r?\n/).map((l) => pattern.exec(l)?.[1]).find(Boolean);
  record(name, "rendered classify-task command quotes the path", Boolean(line), line ?? "no quoted classify-task command in .claude/CLAUDE.md");
  if (!line) return;
  const command = line.replace("<prompt>", "fix the crash in the login form");
  const bash = findBash();
  const result = bash
    ? spawnSync(bash.bash, ["-c", command], { cwd: root, encoding: "utf8" })
    : spawnSync(command, { cwd: root, encoding: "utf8", shell: true });
  const ok = result.status === 0 && /\[POTETO-HARNESS\] Task Type:/.test(result.stdout);
  const shell = bash ? "bash -c" : "platform shell";
  const detail = ok ? result.stdout.split(/\r?\n/)[0] : (result.stderr || result.stdout).trim().split(/\r?\n/)[0];
  record(name, `rendered command runs (${shell})`, ok, detail);
}

// ---- main -----------------------------------------------------------------------

function printTable() {
  const rows = [["fixture", "check", "result", "detail"], ...results.map((r) => [r.fixture, r.check, r.pass ? "PASS" : "FAIL", r.detail])];
  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((r) => r[i].length)));
  for (const row of rows) console.log(row.map((c, i) => (i < 3 ? c.padEnd(widths[i]) : c)).join(" | "));
}

const fixtures = ["test-harness-target", "test-harness-target-brownfield", "test-harness-home", "test-harness home-space"];

function main() {
  let exitCode = 1;
  try {
    const install = makeRunner();
    checkEmptyTarget(install);
    checkBrownfield(install);
    checkGlobal(install);
    checkSpaceHome(install);
    printTable();
    const failed = results.filter((r) => !r.pass).length;
    console.log(`check-install: checks=${results.length} passed=${results.length - failed} failed=${failed}`);
    exitCode = failed || results.length === 0 ? 1 : 0;
  } catch (error) {
    printTable();
    console.error(`check-install: error: ${error.message}`);
  } finally {
    if (KEEP) console.log(`Fixtures kept under ${toPosix(tmpRoot())}: ${fixtures.join(", ")}`);
    else for (const name of fixtures) rmSync(path.join(tmpRoot(), name), { recursive: true, force: true });
  }
  return exitCode;
}

if (isMain(import.meta.url)) process.exitCode = main();
