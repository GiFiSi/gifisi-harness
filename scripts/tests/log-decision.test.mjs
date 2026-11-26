// Unit tests for scripts/log-decision.mjs. Every test writes to a fresh temp dir, never the repo trail.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { HEADER, appendDecision, checkLog, sanitizeCell } from "../log-decision.mjs";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "log-decision.mjs");
const NOW = new Date(Date.UTC(2026, 10, 26, 9, 5, 7, 123));

function withTemp(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "poteto-log-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const row = (overrides = {}) => ({ phase: "fix", decision: "parse at boundary", why: "root cause", evidence: "test red", result: "green", now: NOW, ...overrides });

test("creates missing dirs and the header, then appends rows", () => withTemp((dir) => {
  const log = path.join(dir, "nested", ".poteto", "decisions.tsv");
  appendDecision({ log, ...row() });
  appendDecision({ log, ...row({ phase: "verify" }) });
  const lines = readFileSync(log, "utf8").split("\n");
  assert.equal(lines[0], HEADER);
  assert.equal(HEADER, "ts\tphase\tdecision\twhy\tevidence\tresult");
  assert.equal(lines[1], "2026-11-26T09:05:07Z\tfix\tparse at boundary\troot cause\ttest red\tgreen");
  assert.equal(lines[2].split("\t")[1], "verify");
  assert.equal(lines[3], "");
  assert.deepEqual(checkLog(log), { ok: true, rows: 2, problems: [] });
}));

test("an empty existing file gets the header; a file without a final newline is not glued", () => withTemp((dir) => {
  const empty = path.join(dir, "empty.tsv");
  writeFileSync(empty, "");
  appendDecision({ log: empty, ...row() });
  assert.equal(readFileSync(empty, "utf8").split("\n")[0], HEADER);

  const unterminated = path.join(dir, "open.tsv");
  writeFileSync(unterminated, `${HEADER}\n2026-01-01T00:00:00Z\ta\tb\tc\td\te`);
  appendDecision({ log: unterminated, ...row() });
  assert.equal(checkLog(unterminated).rows, 2);
  assert.ok(checkLog(unterminated).ok);
}));

test("formula guard prefixes cells starting with = + - @", () => {
  assert.equal(sanitizeCell("=SUM(A1:A9)"), "'=SUM(A1:A9)");
  assert.equal(sanitizeCell("+1"), "'+1");
  assert.equal(sanitizeCell("-rf"), "'-rf");
  assert.equal(sanitizeCell("@cmd"), "'@cmd");
  assert.equal(sanitizeCell("a = b"), "a = b");
  assert.equal(sanitizeCell(42), "42");
});

test("tabs, CR and LF become spaces so a row stays one line of six cells", () => withTemp((dir) => {
  const log = path.join(dir, "d.tsv");
  appendDecision({ log, ...row({ why: "line one\r\nline two\tcol", evidence: "\n=cmd" }) });
  const lines = readFileSync(log, "utf8").replace(/\n$/, "").split("\n");
  assert.equal(lines.length, 2);
  const cells = lines[1].split("\t");
  assert.equal(cells.length, 6);
  assert.equal(cells[3], "line one  line two col");
  assert.equal(cells[4], " =cmd", "the guard looks at the first character after stripping");
}));

test("checkLog reports malformed rows, bad timestamps and a wrong header", () => withTemp((dir) => {
  const bad = path.join(dir, "bad.tsv");
  writeFileSync(bad, `${HEADER}\n2026-11-26T09:05:07Z\tonly\tthree\nyesterday\ta\tb\tc\td\te\n`);
  const report = checkLog(bad);
  assert.equal(report.ok, false);
  assert.equal(report.rows, 2);
  assert.match(report.problems.join("\n"), /3 cells \(want 6\)/);
  assert.match(report.problems.join("\n"), /ts "yesterday"/);

  const header = path.join(dir, "header.tsv");
  writeFileSync(header, "when\twhat\n");
  assert.match(checkLog(header).problems[0], /header must be/);
  assert.equal(checkLog(path.join(dir, "absent.tsv")).ok, false);
}));

test("CLI appends with --log and --check fails on a malformed row", () => withTemp((dir) => {
  const log = path.join(dir, "cli", "decisions.tsv");
  const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
  const appended = run(["--log", log, "signal", "bug-fix", "matched broken", "classify-task", "ok"]);
  assert.equal(appended.status, 0, appended.stderr);
  const good = run(["--check", "--log", log]);
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /rows=1/);

  writeFileSync(log, `${readFileSync(log, "utf8")}broken row without tabs\n`);
  const failed = run(["--check", "--log", log]);
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /rows=2/);
  assert.match(failed.stderr, /1 cells \(want 6\)/);

  const short = run(["--log", log, "only", "two"]);
  assert.equal(short.status, 2);
}));

test("CLI run through a junction or symlink to the scripts folder really appends", () => withTemp((dir) => {
  const link = path.join(os.tmpdir(), `poteto-loglink-${process.pid}-${Date.now()}`);
  symlinkSync(path.dirname(SCRIPT), link, process.platform === "win32" ? "junction" : "dir");
  try {
    assert.ok(lstatSync(link).isSymbolicLink());
    const log = path.join(dir, "decisions.tsv");
    const result = spawnSync(process.execPath, [path.join(link, "log-decision.mjs"), "--log", log, "fix", "d", "w", "e", "r"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(checkLog(log).rows, 1, "main() must run when invoked through the link");
  } finally {
    unlinkSync(link); // only the link; never a recursive rm through it
  }
}));

test("checkLog accepts a log re-saved with a UTF-8 BOM", () => withTemp((dir) => {
  const log = path.join(dir, "decisions.tsv");
  appendDecision({ log, ...row() });
  writeFileSync(log, `\uFEFF${readFileSync(log, "utf8")}`);
  assert.deepEqual(checkLog(log), { ok: true, rows: 1, problems: [] });
}));
