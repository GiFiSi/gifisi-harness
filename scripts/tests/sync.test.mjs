// Unit tests for router rendering and managed-block splicing (scripts/sync-harnesses.mjs).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AGENTS_IMPORT, BEGIN, END, countMarkers, homeFor, renderBlock, renderOwnedMdc, spliceBlock, wrapBlock,
} from "../lib/managed-blocks.mjs";
import { Installer, collectFiles } from "../lib/install-tree.mjs";
import { REPO_AGENTS_TOP, parseArgs, repoOutputs } from "../sync-harnesses.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SYNC = path.join(ROOT, "scripts", "sync-harnesses.mjs");
const run = (args) => spawnSync(process.execPath, [SYNC, ...args], { cwd: ROOT, encoding: "utf8" });

test("rendered router stays within 149 lines for every target", () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "poteto-sync-home-"));
  try {
    for (const target of ["repo", "project", "global"]) {
      const result = run(["--print-router", target, "--home", home]);
      assert.equal(result.status, 0, result.stderr);
      const lines = result.stdout.replace(/\n$/, "").split("\n");
      assert.ok(lines.length <= 149, `${target} router is ${lines.length} lines`);
      assert.equal(lines[0], BEGIN);
      assert.equal(lines.at(-1), END);
      assert.doesNotMatch(result.stdout, /\{\{[A-Z_]+\}\}/, `${target} has unrendered tokens`);
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("HOME prefix differs per target and global uses forward slashes", () => {
  assert.equal(homeFor("repo"), "");
  assert.equal(homeFor("project"), ".poteto/");
  const global = homeFor("global", path.join(os.tmpdir(), "fake-home"));
  assert.ok(global.endsWith("/fake-home/.poteto-harness/"), global);
  assert.ok(!global.includes("\\"), global);
  assert.match(renderBlock(".poteto/"), /`\.poteto\/core\/playbooks\/bug-fix\.md`/);
  assert.match(renderBlock(""), /\| Bug fix \| [^|]+ \| Bug fix — `core\/playbooks\/bug-fix\.md` \|/);
});

test("splice appends once, then replaces in place", () => {
  const block = wrapBlock("first");
  const once = spliceBlock("# Mine\n\nUser text.\n", block);
  assert.equal(once, `# Mine\n\nUser text.\n\n${block}\n`);
  assert.equal(spliceBlock(once, block), once);
  const replaced = spliceBlock(`${once}Tail line.\n`, wrapBlock("second"));
  assert.equal(replaced, `# Mine\n\nUser text.\n\n${wrapBlock("second")}\nTail line.\n`);
  assert.deepEqual(countMarkers(replaced), { begin: 1, end: 1 });
});

test("splice keeps CRLF files CRLF and bytes outside the markers intact", () => {
  const original = "# Team rules\r\n\r\nKeep the API stable.\r\n";
  const spliced = spliceBlock(original, renderBlock(".poteto/"));
  assert.ok(spliced.startsWith(original));
  assert.doesNotMatch(spliced.replace(/\r\n/g, ""), /\n/, "every newline must be CRLF");
  assert.equal(spliceBlock(spliced, renderBlock(".poteto/")), spliced);
  const withTail = `${spliced}After block.\r\n`;
  const updated = spliceBlock(withTail, wrapBlock("changed"));
  assert.ok(updated.startsWith(`${original}\r\n${BEGIN}\r\nchanged\r\n${END}`));
  assert.ok(updated.endsWith(`${END}\r\nAfter block.\r\n`));
});

test("splice refuses files with broken or duplicate markers", () => {
  assert.throws(() => spliceBlock(`${BEGIN}\nno end\n`, wrapBlock("x")), /one managed block/);
  const two = `${wrapBlock("a")}\n${wrapBlock("b")}\n`;
  assert.throws(() => spliceBlock(two, wrapBlock("x")), /one managed block/);
  assert.throws(() => spliceBlock(`${END}\n${BEGIN}\n`, wrapBlock("x")), /before the begin/);
});

test("owned .mdc has frontmatter with alwaysApply and one block", () => {
  const text = renderOwnedMdc(renderBlock(".poteto/"));
  assert.match(text, /^---\ndescription: poteto-harness always-on router\nalwaysApply: true\n---\n<!-- poteto-harness:begin/);
  assert.deepEqual(countMarkers(text), { begin: 1, end: 1 });
});

test("repo outputs: CLAUDE.md is a short import bridge, AGENTS.md has one block", () => {
  const outputs = Object.fromEntries(repoOutputs());
  assert.match(outputs["CLAUDE.md"], /^@AGENTS\.md$/m);
  assert.ok(outputs["CLAUDE.md"].split("\n").length <= 20);
  assert.ok(outputs["CLAUDE.md"].length >= 40);
  assert.deepEqual(countMarkers(outputs["AGENTS.md"]), { begin: 1, end: 1 });
  assert.ok(outputs["AGENTS.md"].startsWith(REPO_AGENTS_TOP), "AGENTS.md top section must match REPO_AGENTS_TOP");
});

test("--repo --check passes on the committed files", () => {
  const result = run(["--repo", "--check"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /drifted=0/);
});

test("argument parsing rejects ambiguous or incomplete input", () => {
  assert.throws(() => parseArgs([]), /no mode/);
  assert.throws(() => parseArgs(["--repo", "--global"]), /choose one mode/);
  assert.throws(() => parseArgs(["--project"]), /needs a value/);
  assert.throws(() => parseArgs(["--global", "--check"]), /only applies to --repo/);
  assert.throws(() => parseArgs(["--bogus"]), /unknown argument/);
  assert.deepEqual(parseArgs(["--global", "--home", "x", "--dry-run"]),
    { mode: "global", check: false, dryRun: true, home: "x", target: null });
  const bad = run(["--print-router", "nowhere"]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /unknown target/);
});

// ---- regressions from the review ----------------------------------------------------------

test("the generated note names a command that exists where the block lands", () => {
  assert.match(renderBlock(""), /Regenerate with node scripts\/sync-harnesses\.mjs --repo\./);
  const project = renderBlock(".poteto/");
  const global = renderBlock(homeFor("global", path.join(os.tmpdir(), "h")));
  for (const block of [project, global]) assert.doesNotMatch(block, /node scripts\/sync-harnesses/);
  assert.match(project, /re-running install\.sh --project <this project> from the poteto-harness checkout/);
  assert.match(global, /re-running install\.sh --global from the poteto-harness checkout/);
});

test("a global home with a space renders every script command with a quoted path", () => {
  const home = homeFor("global", path.join(os.tmpdir(), "home with space"));
  const block = renderBlock(home);
  const uses = block.split(`${home}scripts/`).length - 1;
  assert.ok(uses >= 3, `expected script commands in the router, found ${uses}`);
  assert.equal(block.split(`"${home}scripts/`).length - 1, uses, "every scripts/ path must open with a double quote");
  assert.match(block, new RegExp(`node "${home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}scripts/classify-task\\.mjs" "<prompt>"`));
});

test("splice keeps a leading BOM and accepts a trailing-space end marker", () => {
  const block = wrapBlock("body");
  const bom = `\uFEFF${spliceBlock("", block)}user\n`;
  assert.deepEqual(countMarkers(bom), { begin: 1, end: 1 });
  assert.equal(spliceBlock(bom, block), bom);
  assert.equal(spliceBlock(bom, wrapBlock("new")), `\uFEFF${wrapBlock("new")}\nuser\n`);
  const trailing = `top\n\n${BEGIN}\nold\n${END} \t\nafter\n`;
  assert.equal(spliceBlock(trailing, block), `top\n\n${block}\nafter\n`);
  assert.match("\uFEFF@AGENTS.md\r\n", AGENTS_IMPORT);
});

test("a case-only rename in the source leaves the new file installed and the next run idempotent", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "poteto-case-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const src = path.join(dir, "src");
  const dest = path.join(dir, "dest");
  mkdirSync(src);
  writeFileSync(path.join(src, "Guide.md"), "old\n");
  const quiet = () => {};
  new Installer({ root: dest, out: quiet }).copyTree(collectFiles(src, ["."]).map((e) => ({ ...e, rel: path.basename(e.rel) })), dest);
  renameSync(path.join(src, "Guide.md"), path.join(src, "guide.md"));
  writeFileSync(path.join(src, "guide.md"), "new\n");
  const entries = () => collectFiles(src, ["."]).map((e) => ({ ...e, rel: path.basename(e.rel) }));
  new Installer({ root: dest, out: quiet }).copyTree(entries(), dest);
  assert.deepEqual(readdirSync(dest).sort(), [".installed.json", "guide.md"]);
  assert.equal(readFileSync(path.join(dest, "guide.md"), "utf8"), "new\n");
  const again = new Installer({ root: dest, out: quiet });
  again.copyTree(entries(), dest);
  assert.equal(again.writes, 0);
});
