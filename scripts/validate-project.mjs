#!/usr/bin/env node
// Check that a project has a complete, uncorrupted poteto-harness install.
// Usage: node scripts/validate-project.mjs [--root DIR]
// The manifest comes from the harness home this script runs from (HARNESS_ROOT/core/harness/manifest.json).
// Only lib/paths.mjs and log-decision.mjs are imported, because an installed copy ships only project scripts.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { checkLog } from "./log-decision.mjs";
import { CORE, HARNESS_ROOT, findProjectRoot, isMain, resolveUserPath } from "./lib/paths.mjs";

// Same tolerance as lib/managed-blocks.mjs (not shipped to projects): a UTF-8 BOM before a
// marker on line 1 and trailing spaces or tabs after the end marker.
const BEGIN_LINE = /^\uFEFF?<!-- poteto-harness:begin\b.*?\r?$/gm;
const END_LINE = /^<!-- poteto-harness:end -->[ \t]*\r?$/gm;
const AGENTS_IMPORT = /^\uFEFF?@AGENTS\.md[ \t]*\r?$/m;
const ALWAYS_APPLY = /^alwaysApply:[ \t]*true[ \t]*\r?$/m;
const USAGE = "Usage: node scripts/validate-project.mjs [--root DIR]";

const isFile = (file) => existsSync(file) && statSync(file).isFile();
const countMatches = (text, pattern) => [...text.matchAll(pattern)].length;

// Lines of the managed block, begin and end marker included. Null when the block is not well formed.
export function managedBlockLines(text) {
  const lines = text.split(/\r?\n/);
  const begin = lines.findIndex((line) => /^\uFEFF?<!-- poteto-harness:begin\b/.test(line));
  const end = lines.findIndex((line, i) => i > begin && /^<!-- poteto-harness:end -->[ \t]*$/.test(line));
  if (begin === -1 || end === -1) return null;
  return lines.slice(begin, end + 1);
}

function markerCheck(text) {
  const begins = countMatches(text, BEGIN_LINE);
  const ends = countMatches(text, END_LINE);
  if (begins !== 1 || ends !== 1) return `found ${begins} begin and ${ends} end markers (want exactly 1 each)`;
  if (!managedBlockLines(text)) return "end marker comes before the begin marker";
  return null;
}

function checkTree(dir, label, names, toPath) {
  if (!existsSync(dir)) return { pass: false, detail: `${label}: ${dir} is missing` };
  const missing = names.filter((name) => !isFile(path.join(dir, toPath(name))));
  if (missing.length) return { pass: false, detail: `${label}: missing ${missing.join(", ")}` };
  return { pass: true, detail: `${label}: ${names.length} present` };
}

export function validateProject({ root, manifest }) {
  const results = [];
  const add = (name, pass, detail) => results.push({ name, pass, detail });
  const at = (...parts) => path.join(root, ...parts);
  const home = at(".poteto");
  const read = (file) => readFileSync(file, "utf8").replace(/^\uFEFF/, "");

  const agents = at("AGENTS.md");
  if (!isFile(agents)) add("AGENTS.md managed block", false, "AGENTS.md is missing");
  else {
    const text = read(agents);
    const problem = markerCheck(text);
    add("AGENTS.md managed block", !problem, problem ?? "exactly one managed block");
    const block = problem ? null : managedBlockLines(text);
    if (block) {
      const ok = block.length <= manifest.routerMaxLines;
      add("router block size", ok, `${block.length} lines (max ${manifest.routerMaxLines})`);
    } else add("router block size", false, "no well-formed managed block to measure");
  }

  const claude = at("CLAUDE.md");
  if (!isFile(claude)) add("CLAUDE.md imports @AGENTS.md", false, "CLAUDE.md is missing");
  else {
    const text = read(claude);
    const imports = AGENTS_IMPORT.test(text);
    const begins = countMatches(text, BEGIN_LINE);
    const ok = imports && begins <= 1 && (begins === 0 || !markerCheck(text));
    add("CLAUDE.md imports @AGENTS.md", ok, ok ? "has an @AGENTS.md line" : imports ? markerCheck(text) : "no @AGENTS.md line");
  }

  const mdc = at(".cursor", "rules", "poteto-harness.mdc");
  if (!isFile(mdc)) add("Cursor rule", false, ".cursor/rules/poteto-harness.mdc is missing");
  else {
    const text = read(mdc);
    const apply = ALWAYS_APPLY.test(text);
    const problem = markerCheck(text);
    add("Cursor rule", apply && !problem, !apply ? "alwaysApply: true is missing" : problem ?? "alwaysApply true, one managed block");
  }

  const playbooks = manifest.playbooks.map((p) => p.name);
  const principles = manifest.principles.map((p) => p.name);
  const skills = manifest.skills.map((s) => s.name);
  const trees = [
    ["playbooks", checkTree(path.join(home, CORE, "playbooks"), "playbooks", playbooks, (n) => `${n}.md`)],
    ["principles", checkTree(path.join(home, CORE, "principles"), "principles", principles, (n) => `${n}.md`)],
    ["skills", checkTree(path.join(home, CORE, "skills"), "skills", skills, (n) => path.join(n, "SKILL.md"))],
  ];
  for (const [name, result] of trees) add(`.poteto/${CORE}/${name}`, result.pass, result.detail);

  const routes = path.join(home, CORE, "harness", "routes.json");
  try {
    const data = JSON.parse(read(routes));
    const ok = Array.isArray(data.routes) && data.routes.length > 0 && typeof data.fallback === "string";
    add(".poteto/core/harness/routes.json", ok, ok ? `${data.routes.length} routes` : "routes or fallback missing");
  } catch (error) {
    add(".poteto/core/harness/routes.json", false, isFile(routes) ? `invalid JSON: ${error.message}` : "missing");
  }

  const projectJson = path.join(home, "project.json");
  try {
    const data = JSON.parse(read(projectJson));
    const ok = typeof data.packageManager === "string" && data.packageManager.length > 0;
    add(".poteto/project.json", ok, ok ? `packageManager=${data.packageManager}` : "packageManager is missing");
  } catch (error) {
    add(".poteto/project.json", false, isFile(projectJson) ? `invalid JSON: ${error.message}` : "missing");
  }

  const log = checkLog(path.join(home, "decisions.tsv"));
  add(".poteto/decisions.tsv", log.ok, log.ok ? `rows=${log.rows}` : log.problems.slice(0, 3).join("; "));

  const corrections = path.join(home, "corrections.md");
  add(".poteto/corrections.md", isFile(corrections), isFile(corrections) ? "present" : "missing");

  add("PRODUCT.md", isFile(at("PRODUCT.md")), isFile(at("PRODUCT.md")) ? "present" : "missing");
  const docs = manifest.docs.filter((doc) => !isFile(at("docs", doc)));
  add("docs/", docs.length === 0, docs.length ? `missing ${docs.join(", ")}` : `${manifest.docs.length} docs present`);

  return { results, passed: results.filter((r) => r.pass).length, failed: results.filter((r) => !r.pass).length };
}

function parseArgs(argv) {
  const options = { root: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") {
      if (i + 1 >= argv.length) throw new Error("--root needs a directory");
      options.root = argv[++i];
    } else if (argv[i] === "-h" || argv[i] === "--help") options.help = true;
    else throw new Error(`unknown argument "${argv[i]}"`);
  }
  return options;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`validate-project: ${error.message}\n${USAGE}`);
    process.exit(2);
  }
  if (options.help) { console.log(USAGE); return; }
  const root = options.root ? resolveUserPath(options.root) : findProjectRoot();
  if (!existsSync(root)) { console.error(`validate-project: ${root} does not exist`); process.exit(1); }
  const manifest = JSON.parse(readFileSync(path.join(HARNESS_ROOT, CORE, "harness", "manifest.json"), "utf8"));
  const report = validateProject({ root, manifest });
  for (const result of report.results) console.log(`${result.pass ? "PASS" : "FAIL"}  ${result.name}: ${result.detail}`);
  console.log(`validate-project: ${report.failed ? "FAIL" : "OK"} passed=${report.passed} failed=${report.failed} root=${root}`);
  process.exit(report.failed ? 1 : 0);
}

if (isMain(import.meta.url)) main();
