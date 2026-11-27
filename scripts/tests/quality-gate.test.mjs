// Unit tests for scripts/quality-gate.mjs: ESLint-style line counting and the gate result.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { countCodeLines, runQualityGate, scanSource, summaryLine } from "../quality-gate.mjs";

const GATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "quality-gate.mjs");

function withTree(files, fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "gifisi-gate-"));
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), text);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("blank lines and comment-only lines are not counted", () => {
  const source = ["// header", "", "/* block", "   still block */", "const a = 1;", "   ", "/** doc */ const b = 2; // tail", ""].join("\n");
  assert.equal(countCodeLines(source), 2);
});

test("comment markers inside strings, templates and regexes stay code", () => {
  const source = [
    'const url = "http://example.com"; ',
    "const t = `line one",
    "// inside template",
    "${url} /* still template */`;",
    "const re = /\/\/[a-z/]+/g;",
    "const ratio = 4 / 2; // division then comment",
  ].join("\n");
  assert.equal(countCodeLines(source), 6);
});

test("CRLF input counts the same as LF input", () => {
  const lf = "const a = 1;\n\n// c\nconst b = 2;\n";
  assert.equal(countCodeLines(lf.replace(/\n/g, "\r\n")), countCodeLines(lf));
});

test("debugger statements are found outside strings and comments only", () => {
  const source = ["function f() {", "  debugger;", '  const s = "debugger";', "  // debugger", "}"].join("\n");
  assert.deepEqual(scanSource(source).debuggerLines, [2]);
});

test("an apostrophe in JSX text does not swallow later comments or debugger lines", () => {
  const comments = Array.from({ length: 6 }, (_, i) => `// note ${i}`);
  const source = ["export function A() {", "  return (", "    <p>Don't panic</p>", "  );", "}", ...comments, "export const z = 3;"].join("\n");
  assert.equal(countCodeLines(source), 6);
  const debug = ["const a = <b>can't</b>;", "function f() {", "  debugger;", "}"].join("\n");
  assert.deepEqual(scanSource(debug).debuggerLines, [3]);
});

test("a JSX closing tag read as a regex ends at the line break", () => {
  const source = ["const el = <div>", "  text", "</div>;", "// c1", "// c2", "const z = 3;"].join("\n");
  assert.equal(countCodeLines(source), 4);
});

test("a slash after postfix ++ or -- is division, not a regex", () => {
  const source = ["let i = 0;", "const y = i++ / 2;", "// c1", "// c2", "// c3", "const z = 3;"].join("\n");
  assert.equal(countCodeLines(source), 3);
  assert.equal(countCodeLines("let j = 4;\nconst w = j-- / 2; // c / d\n// tail\n"), 2);
});

test("a backslash line continuation keeps a string open across the newline", () => {
  const source = ['const s = "first \\', "// not a comment, still the string\";", "// real comment"].join("\n");
  assert.equal(countCodeLines(source), 2);
});

test("the gate flags oversized files and debugger statements and skips vendored dirs", () => {
  const big = Array.from({ length: 12 }, (_, i) => `export const v${i} = ${i};`).join("\n");
  withTree({
    "src/big.mjs": big,
    "src/small.ts": "export const ok = true;\n",
    "src/debug.js": "export function f() {\n  debugger;\n}\n",
    "node_modules/pkg/huge.js": big,
    ".gifisi/scripts/huge.mjs": big,
    "README.md": big,
  }, (root) => {
    const result = runQualityGate({ root, maxLines: 10 });
    assert.equal(result.files, 3);
    assert.deepEqual(result.largest, { file: "src/big.mjs", lines: 12 });
    assert.deepEqual(result.violations.map((v) => `${v.kind}:${v.file}`).sort(), ["debugger:src/debug.js", "max-lines:src/big.mjs"]);
    assert.equal(summaryLine(result), "files=3 violations=2 largest=src/big.mjs:12");
  });
});

test("the CLI exits 1 on violations and 0 when clean", () => {
  withTree({ "a.mjs": "export const a = 1;\nexport const b = 2;\n" }, (root) => {
    const failing = spawnSync(process.execPath, [GATE, "--root", root, "--max-lines", "1"], { encoding: "utf8" });
    assert.equal(failing.status, 1, failing.stderr);
    assert.match(failing.stdout, /a\.mjs: 2 lines \(max 1\)/);
    const passing = spawnSync(process.execPath, [GATE, "--root", root, "--json"], { encoding: "utf8" });
    assert.equal(passing.status, 0, passing.stderr);
    assert.equal(JSON.parse(passing.stdout).violations.length, 0);
  });
});

test("the CLI still runs when invoked through a symlinked or junctioned path", () => {
  withTree({ "src/a.mjs": "export const a = 1;\nexport const b = 2;\n" }, (root) => {
    const link = path.join(root, "linked-scripts");
    symlinkSync(path.dirname(GATE), link, process.platform === "win32" ? "junction" : "dir");
    try {
      const result = spawnSync(process.execPath, [path.join(link, "quality-gate.mjs"), "--root", path.join(root, "src"), "--max-lines", "1"], { encoding: "utf8" });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stdout, /a\.mjs: 2 lines \(max 1\)/);
    } finally {
      unlinkSync(link);
    }
  });
});
