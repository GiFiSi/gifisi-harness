#!/usr/bin/env node
// Append one row to the auditable decision trail, or check the trail's shape.
// Usage:
//   node scripts/log-decision.mjs [--log FILE] <phase> <decision> <why> <evidence> <result>
//   node scripts/log-decision.mjs --check [--log FILE]
// Default log: <project root>/.gifisi/decisions.tsv, where the project root is the nearest
// ancestor of the current directory holding .gifisi/ or .git.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findProjectRoot, isMain, resolveUserPath } from "./lib/paths.mjs";

export const COLUMNS = ["ts", "phase", "decision", "why", "evidence", "result"];
export const HEADER = COLUMNS.join("\t");
export const TS_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const USAGE = [
  "Usage: node scripts/log-decision.mjs [--log FILE] <phase> <decision> <why> <evidence> <result>",
  "       node scripts/log-decision.mjs --check [--log FILE]",
].join("\n");

export function defaultLog(cwd = process.cwd()) {
  return path.join(findProjectRoot(cwd), ".gifisi", "decisions.tsv");
}

export function formatTimestamp(now = new Date()) {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Tabs and line breaks would split the row, so they become spaces.
// A leading = + - @ would run as a formula in a spreadsheet, so it gets a quote prefix.
export function sanitizeCell(value) {
  const flat = String(value ?? "").replace(/[\t\r\n]/g, " ");
  return /^[=+\-@]/.test(flat) ? `'${flat}` : flat;
}

export function appendDecision({ log = defaultLog(), phase, decision, why, evidence, result, now = new Date() }) {
  const file = path.resolve(log);
  mkdirSync(path.dirname(file), { recursive: true });
  const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
  const cells = [formatTimestamp(now), ...[phase, decision, why, evidence, result].map(sanitizeCell)];
  const row = cells.join("\t");
  // A missing or whitespace-only log holds no rows yet, so it starts with the header.
  if (!existing.trim()) writeFileSync(file, `${HEADER}\n${row}\n`);
  else appendFileSync(file, `${existing.endsWith("\n") ? "" : "\n"}${row}\n`);
  return { file, row };
}

// Returns { ok, rows, problems }. Rows are data lines after the header.
export function checkLog(file) {
  const problems = [];
  if (!existsSync(file)) return { ok: false, rows: 0, problems: [`${file} does not exist`] };
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, ""); // a BOM from a Windows re-save
  const lines = text.replace(/\r?\n$/, "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() !== "");
  if (start === -1) return { ok: false, rows: 0, problems: ["log is empty; the header is missing"] };
  if (lines[start] !== HEADER) problems.push(`line ${start + 1}: header must be "${COLUMNS.join("<TAB>")}"`);
  let rows = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") { problems.push(`line ${i + 1}: blank line inside the log`); continue; }
    rows++;
    const cells = line.split("\t");
    if (cells.length !== COLUMNS.length) {
      problems.push(`line ${i + 1}: ${cells.length} cells (want ${COLUMNS.length})`);
      continue;
    }
    if (!TS_PATTERN.test(cells[0])) problems.push(`line ${i + 1}: ts "${cells[0]}" is not UTC YYYY-MM-DDTHH:MM:SSZ`);
  }
  return { ok: problems.length === 0, rows, problems };
}

export function parseArgs(argv) {
  const options = { check: false, log: null, values: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") options.check = true;
    else if (arg === "--log") {
      if (i + 1 >= argv.length) throw new Error("--log needs a file path");
      options.log = argv[++i];
    } else if (arg === "-h" || arg === "--help") options.help = true;
    else options.values.push(arg);
  }
  return options;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`log-decision: ${error.message}\n${USAGE}`);
    process.exit(2);
  }
  if (options.help) { console.log(USAGE); return; }
  const log = options.log ? resolveUserPath(options.log) : defaultLog();
  if (options.check) {
    const report = checkLog(log);
    for (const problem of report.problems) console.error(`  - ${problem}`);
    console.log(`log-decision: ${report.ok ? "OK" : "FAIL"} ${log} rows=${report.rows}`);
    process.exit(report.ok ? 0 : 1);
  }
  if (options.values.length !== 5) {
    console.error(`log-decision: expected 5 values (phase decision why evidence result), got ${options.values.length}\n${USAGE}`);
    process.exit(2);
  }
  const [phase, decision, why, evidence, result] = options.values;
  const written = appendDecision({ log, phase, decision, why, evidence, result });
  console.log(`log-decision: appended to ${written.file}`);
  console.log(written.row);
}

if (isMain(import.meta.url)) main();
