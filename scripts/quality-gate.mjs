#!/usr/bin/env node
// File-size and debugger gate. Counts lines the way ESLint `max-lines` does with
// skipBlankLines and skipComments: a line counts when it holds at least one character
// of code or string outside a comment.
// Usage: node scripts/quality-gate.mjs [--root DIR] [--max-lines 350] [--json]
// Exit 0 when clean, 1 on violations, 2 on usage errors.
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { findProjectRoot, isMain, resolveUserPath, toPosix } from "./lib/paths.mjs";

export const SOURCE_EXTENSIONS = [".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts"];
export const SKIPPED_DIRS = ["node_modules", ".git", "dist", "build", ".next", "coverage", "out", ".poteto", ".turbo"];
export const DEFAULT_MAX_LINES = 350;

const REGEX_AFTER = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);
const REGEX_KEYWORD = /\b(return|typeof|instanceof|case|do|else|in|of|new|delete|void|throw|yield|await)\s*$/;

// A `/` starts a regular expression when it cannot be a division operator.
// This is a heuristic: it reads the previous significant character and keyword.
// A postfix `++`/`--` ends an operand, so a `/` after it divides (`i++ / 2`).
function regexAllowed(prev, tail) {
  if (/(\+\+|--) *$/.test(tail)) return false;
  return REGEX_AFTER.has(prev) || REGEX_KEYWORD.test(tail);
}

// JavaScript forbids raw newlines in '...' and "..." strings and in regex literals, so a newline
// that is not a backslash line continuation closes them. This bounds a misread (an apostrophe in
// JSX text, `</div>` read as a regex) to one line instead of the rest of the file.
const SINGLE_LINE_STATES = new Set(["'", '"', "regex", "class"]);

// Scan JavaScript or TypeScript text once.
// Returns the counted line total and the 1-based lines holding a `debugger` statement.
export function scanSource(source) {
  let state = "code";
  const templateBraces = [];
  let hasCode = false;
  let codeText = "";
  let tail = "";
  let prev = "";
  let lineNo = 1;
  let counted = 0;
  let continued = false;
  const debuggerLines = [];

  const endLine = () => {
    if (hasCode) counted++;
    if (/\bdebugger\b/.test(codeText)) debuggerLines.push(lineNo);
    hasCode = false;
    codeText = "";
    lineNo++;
  };
  const emit = (ch) => {
    codeText += ch;
    tail = (tail + ch).slice(-24);
  };

  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (c === "\n") {
      if (state === "line" || (SINGLE_LINE_STATES.has(state) && !continued)) state = "code";
      continued = false;
      endLine();
      continue;
    }
    if (c === "\r") continue;
    const escapes = c === "\\" && next !== "\n" && next !== "\r";
    if (c === "\\" && !escapes) continued = true;

    if (state === "line") continue;
    if (state === "block") {
      if (c === "*" && next === "/") {
        state = "code";
        i++;
      }
      continue;
    }
    if (state === "'" || state === '"') {
      hasCode = true;
      if (escapes) i++;
      else if (c === state) state = "code";
      continue;
    }
    if (state === "`") {
      hasCode = true;
      if (escapes) i++;
      else if (c === "`") state = "code";
      else if (c === "$" && next === "{") {
        templateBraces.push(0);
        state = "code";
        prev = "{";
        i++;
      }
      continue;
    }
    if (state === "regex" || state === "class") {
      hasCode = true;
      if (escapes) i++;
      else if (state === "regex" && c === "[") state = "class";
      else if (state === "class" && c === "]") state = "regex";
      else if (state === "regex" && c === "/") {
        state = "code";
        prev = ")";
      }
      continue;
    }

    // state === "code"
    if (c === "/" && next === "/") {
      state = "line";
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      state = "block";
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\f" || c === "\v") {
      emit(" ");
      continue;
    }
    hasCode = true;
    if (c === "'" || c === '"' || c === "`") {
      state = c;
      prev = c;
      emit(" ");
      continue;
    }
    if (c === "/" && regexAllowed(prev, tail)) {
      state = "regex";
      emit(" ");
      continue;
    }
    if (templateBraces.length > 0) {
      const top = templateBraces.length - 1;
      if (c === "{") templateBraces[top]++;
      else if (c === "}") {
        if (templateBraces[top] === 0) {
          templateBraces.pop();
          state = "`";
          continue;
        }
        templateBraces[top]--;
      }
    }
    emit(c);
    prev = /[\w$]/.test(c) ? "w" : c;
  }
  if (hasCode || codeText) endLine();
  return { lines: counted, debuggerLines };
}

export function countCodeLines(source) {
  return scanSource(source).lines;
}

export function listSourceFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const abs = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.includes(entry.name)) walk(abs);
      } else if (entry.isFile() && SOURCE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        if (!entry.name.endsWith(".d.ts")) out.push(abs);
      }
    }
  };
  walk(root);
  return out;
}

// Returns { root, maxLines, files, violations, largest, perFile }.
// `files` is the number of scanned files. Each violation is
// { file, kind: "max-lines", lines, max } or { file, kind: "debugger", line }.
export function runQualityGate({ root, maxLines = DEFAULT_MAX_LINES } = {}) {
  const base = path.resolve(root ?? findProjectRoot());
  if (!existsSync(base) || !lstatSync(base).isDirectory()) throw new Error(`root is not a directory: ${base}`);
  const violations = [];
  const perFile = [];
  let largest = null;
  for (const abs of listSourceFiles(base)) {
    const file = toPosix(path.relative(base, abs));
    const { lines, debuggerLines } = scanSource(readFileSync(abs, "utf8"));
    perFile.push({ file, lines });
    if (!largest || lines > largest.lines) largest = { file, lines };
    if (lines > maxLines) violations.push({ file, kind: "max-lines", lines, max: maxLines });
    for (const line of debuggerLines) violations.push({ file, kind: "debugger", line });
  }
  return { root: base, maxLines, files: perFile.length, violations, largest, perFile };
}

export function formatViolation(v) {
  return v.kind === "max-lines" ? `${v.file}: ${v.lines} lines (max ${v.max})` : `${v.file}:${v.line}: debugger statement`;
}

export function summaryLine(result) {
  const largest = result.largest ? `${result.largest.file}:${result.largest.lines}` : "none:0";
  return `files=${result.files} violations=${result.violations.length} largest=${largest}`;
}

export function parseArgs(argv) {
  const opts = { root: null, maxLines: DEFAULT_MAX_LINES, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root") opts.root = resolveUserPath(argv[++i]);
    else if (arg === "--max-lines") {
      opts.maxLines = Number(argv[++i]);
      if (!Number.isInteger(opts.maxLines) || opts.maxLines < 1) throw new Error("--max-lines needs a positive integer");
    } else if (arg === "--json") opts.json = true;
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return opts;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`quality-gate: ${error.message}`);
    process.exit(2);
  }
  if (opts.help) {
    console.log("Usage: node scripts/quality-gate.mjs [--root DIR] [--max-lines 350] [--json]");
    return;
  }
  let result;
  try {
    result = runQualityGate({ root: opts.root ?? undefined, maxLines: opts.maxLines });
  } catch (error) {
    console.error(`quality-gate: ${error.message}`);
    process.exit(2);
  }
  if (opts.json) {
    const { perFile, ...rest } = result;
    console.log(JSON.stringify({ ...rest, root: toPosix(rest.root) }, null, 2));
  } else {
    for (const v of result.violations) console.log(formatViolation(v));
    console.log(summaryLine(result));
  }
  process.exitCode = result.violations.length > 0 ? 1 : 0;
}

if (isMain(import.meta.url)) main();
