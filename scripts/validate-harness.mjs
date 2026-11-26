#!/usr/bin/env node
// Validate the poteto-harness repository: canonical sets, file shapes, references,
// router size and drift, harness-agnostic content, scripts, templates, and the decision log.
// Usage: node scripts/validate-harness.mjs [--skip-tests]
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { numberedItems, parseFrontmatter, sections } from "./lib/frontmatter.mjs";
import { HARNESS_ROOT as ROOT } from "./lib/paths.mjs";
import { contentChecks, linkChecks } from "./lib/content-checks.mjs";

const errors = [];
const stats = {};
const fail = (file, message) => errors.push(`${file}: ${message}`);
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");
const read = (relPath) => {
  const abs = path.join(ROOT, relPath);
  if (!existsSync(abs)) { fail(relPath, "required file is missing"); return ""; }
  return readFileSync(abs, "utf8");
};
const json = (relPath) => JSON.parse(read(relPath));

const manifest = json("core/harness/manifest.json");
const routes = json("core/harness/routes.json");
const names = (list) => list.map((entry) => entry.name);
const playbookNames = new Set(names(manifest.playbooks));
const principleNames = new Set(names(manifest.principles));
const skillNames = new Set(names(manifest.skills));
const reachedSkills = new Set(routes.routes.flatMap((route) => route.skills));

function exactSet(label, dir, actual, expected) {
  const missing = [...expected].filter((name) => !actual.includes(name));
  const extra = actual.filter((name) => !expected.has(name));
  if (missing.length) fail(dir, `${label} missing: ${missing.join(", ")}`);
  if (extra.length) fail(dir, `${label} not in core/harness/manifest.json: ${extra.join(", ")}`);
}

function requireSections(file, body, required, minChars) {
  const found = sections(body);
  for (const heading of required) {
    if (!found.has(heading)) fail(file, `missing section "## ${heading}"`);
    else if (!found.get(heading)) fail(file, `empty section "## ${heading}"`);
  }
  if (body.replace(/\s+/g, " ").length < minChars) fail(file, `body shorter than ${minChars} characters`);
  return found;
}

function checkRefs(file, label, list, allowed) {
  if (!Array.isArray(list)) return fail(file, `frontmatter "${label}" must be an inline list`);
  for (const name of list) if (!allowed.has(name)) fail(file, `${label} references unknown "${name}"`);
}

function checkPlaybooks() {
  const dir = path.join(ROOT, "core", "playbooks");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
  exactSet("playbooks", "core/playbooks/", files.map((f) => f.slice(0, -3)), playbookNames);
  for (const f of files) {
    const file = `core/playbooks/${f}`;
    const { data, body } = parseFrontmatter(read(file));
    if (!data) { fail(file, "missing frontmatter"); continue; }
    const expected = manifest.playbooks.find((p) => p.name === f.slice(0, -3));
    if (data.name !== f.slice(0, -3)) fail(file, `name "${data.name}" must equal file name`);
    if (expected && data.title !== expected.title) fail(file, `title must be "${expected.title}"`);
    if (!data.summary) fail(file, "frontmatter summary is required");
    checkRefs(file, "skills", data.skills, skillNames);
    for (const skill of data.skills ?? []) reachedSkills.add(skill);
    checkRefs(file, "principles", data.principles, principleNames);
    const found = requireSections(file, body, ["When to use", "Done Predicate", "Steps", "Step notes", "Reply", "Source"], 1200);
    const steps = numberedItems(found.get("Steps") ?? "");
    if (steps.length < 3 || steps.length > 12) fail(file, `Steps needs 3-12 numbered items, found ${steps.length}`);
    steps.forEach((step, i) => step.length > 320 && fail(file, `step ${i + 1} is ${step.length} chars (max 320)`));
  }
  stats.playbooks = files.length;
}

function checkPrinciples() {
  const dir = path.join(ROOT, "core", "principles");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
  exactSet("principles", "core/principles/", files.map((f) => f.slice(0, -3)), principleNames);
  for (const f of files) {
    const file = `core/principles/${f}`;
    const { data, body } = parseFrontmatter(read(file));
    if (!data) { fail(file, "missing frontmatter"); continue; }
    const expected = manifest.principles.find((p) => p.name === f.slice(0, -3));
    if (data.name !== f.slice(0, -3)) fail(file, `name "${data.name}" must equal file name`);
    if (expected && data.title !== expected.title) fail(file, `title must be "${expected.title}"`);
    if (expected && data.group !== expected.group) fail(file, `group must be "${expected.group}"`);
    if (expected && data.applies_when !== expected.applies_when) fail(file, "applies_when must equal its line in core/harness/manifest.json");
    requireSections(file, body, ["Rule", "When it applies", "How to apply", "Smells", "Check", "Source"], 700);
  }
  stats.principles = files.length;
}

function checkSkills() {
  const dir = path.join(ROOT, "core", "skills");
  const dirs = existsSync(dir) ? readdirSync(dir).filter((d) => statSync(path.join(dir, d)).isDirectory()) : [];
  exactSet("skills", "core/skills/", dirs, skillNames);
  for (const d of dirs) {
    const file = `core/skills/${d}/SKILL.md`;
    if (!existsSync(path.join(ROOT, file))) { fail(file, "missing SKILL.md"); continue; }
    const { data, body } = parseFrontmatter(read(file));
    if (!data) { fail(file, "missing frontmatter"); continue; }
    const expected = manifest.skills.find((s) => s.name === d);
    if (data.name !== d) fail(file, `name "${data.name}" must equal folder name`);
    if (!data.description || data.description.length > 400) fail(file, "description must be 1-400 characters");
    if (expected && data.origin !== expected.origin) fail(file, `origin must be "${expected.origin}"`);
    const found = requireSections(file, body, ["When to use", "Procedure", "Output", "Source"], 600);
    if (numberedItems(found.get("Procedure") ?? "").length < 3) fail(file, "Procedure needs at least 3 numbered steps");
  }
  stats.skills = dirs.length;
}

function checkRoutes() {
  const ids = new Set();
  const reached = new Set();
  for (const route of routes.routes) {
    if (ids.has(route.id)) fail("core/harness/routes.json", `duplicate route id ${route.id}`);
    ids.add(route.id);
    if (!playbookNames.has(route.playbook)) fail("core/harness/routes.json", `route ${route.id} uses unknown playbook ${route.playbook}`);
    reached.add(route.playbook);
    for (const skill of route.skills) if (!skillNames.has(skill)) fail("core/harness/routes.json", `route ${route.id} uses unknown skill ${skill}`);
    if (!route.taskType || !route.signals?.length) fail("core/harness/routes.json", `route ${route.id} needs taskType and signals`);
  }
  if (!ids.has(routes.fallback)) fail("core/harness/routes.json", `fallback ${routes.fallback} is not a route id`);
  for (const name of playbookNames) if (!reached.has(name)) fail("core/harness/routes.json", `playbook ${name} is unreachable from any route`);
  stats.routes = routes.routes.length;
}

function checkPrompts() {
  for (const name of manifest.prompts) {
    const file = `core/prompts/${name}`;
    if (!existsSync(path.join(ROOT, file))) { fail(file, "missing prompt"); continue; }
    const found = requireSections(file, read(file), ["When to use", "Prompt", "Expected result"], 500);
    if (!/```/.test(found.get("Prompt") ?? "")) fail(file, "## Prompt must hold a fenced block");
  }
  if (!existsSync(path.join(ROOT, "core/prompts/README.md"))) fail("core/prompts/README.md", "missing prompt catalog");
  stats.prompts = manifest.prompts.length;
}

function checkFilesExist() {
  const required = [
    ...manifest.templates.map((t) => `core/templates/${t}`),
    ...manifest.scripts.map((s) => `scripts/${s}`),
    ...manifest.docs.map((d) => `docs/${d}`),
    "README.md", "docs/PRODUCT.md", "LICENSE", "docs/THIRD_PARTY_NOTICES.md", "docs/CONTRIBUTING.md", "install.sh",
    "AGENTS.md", "CLAUDE.md", ".cursor/rules/poteto-harness.mdc", "package.json",
  ];
  for (const file of required) {
    const abs = path.join(ROOT, file);
    if (!existsSync(abs)) fail(file, "required file is missing");
    else if (!file.endsWith(".tsv") && statSync(abs).size < 40) fail(file, "file is too small to be complete");
  }
  stats.templates = manifest.templates.length;
  stats.docs = manifest.docs.length;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: ROOT, encoding: "utf8", ...options });
}

function checkRouter() {
  const sync = run(process.execPath, ["scripts/sync-harnesses.mjs", "--repo", "--check"]);
  if (sync.status !== 0) fail("AGENTS.md / CLAUDE.md / .mdc", `out of sync with core/harness/: ${(sync.stdout + sync.stderr).trim()}`);
  for (const target of ["repo", "project", "global"]) {
    const result = run(process.execPath, ["scripts/sync-harnesses.mjs", "--print-router", target]);
    if (result.status !== 0) { fail("core/harness/router.md", `render for ${target} failed: ${result.stderr.trim()}`); continue; }
    const lines = result.stdout.replace(/\n$/, "").split("\n").length;
    if (lines > manifest.routerMaxLines) fail("core/harness/router.md", `${target} router is ${lines} lines (max ${manifest.routerMaxLines})`);
    if (/\{\{[A-Z_]+\}\}/.test(result.stdout)) fail("core/harness/router.md", `${target} router has unrendered tokens`);
    stats[`router:${target}`] = lines;
  }
  const claude = read("CLAUDE.md");
  if (!/^@AGENTS\.md\s*$/m.test(claude)) fail("CLAUDE.md", "must import the router with @AGENTS.md");
  if (claude.split("\n").length > 20) fail("CLAUDE.md", "must stay an import bridge, not a second router");
  if (!/^alwaysApply: true$/m.test(read(".cursor/rules/poteto-harness.mdc"))) fail(".cursor/rules/poteto-harness.mdc", "needs alwaysApply: true");
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function checkSyntax(files) {
  let checked = 0;
  for (const abs of files) {
    const file = rel(abs);
    if (/\.(mjs|cjs|js)$/.test(file)) {
      const result = run(process.execPath, ["--check", abs]);
      if (result.status !== 0) fail(file, `syntax error: ${result.stderr.trim().split("\n").slice(0, 4).join(" ")}`);
      checked++;
    } else if (file.endsWith(".json")) {
      try { JSON.parse(readFileSync(abs, "utf8")); checked++; } catch (error) { fail(file, `invalid JSON: ${error.message}`); }
    } else if (file.endsWith(".sh")) {
      if (readFileSync(abs, "utf8").includes("\r")) fail(file, "shell script must use LF line endings");
      const result = run("bash", ["-n", abs]);
      if (result.error) continue;
      if (result.status !== 0) fail(file, `bash -n failed: ${result.stderr.trim()}`);
      checked++;
    }
  }
  stats.syntaxChecked = checked;
}

function checkDecisionLog() {
  const file = ".poteto/decisions.tsv";
  if (!existsSync(path.join(ROOT, file))) return fail(file, "the repo keeps its own decision trail");
  const lines = read(file).replace(/\n$/, "").split("\n");
  if (lines[0] !== manifest.decisionColumns.join("\t")) fail(file, "header must be the six decision columns");
  lines.slice(1).forEach((line, i) => {
    const cells = line.split("\t");
    if (cells.length !== 6) fail(file, `row ${i + 2} has ${cells.length} cells (want 6)`);
    else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(cells[0])) fail(file, `row ${i + 2} ts is not ISO8601 UTC`);
  });
  stats.decisionRows = lines.length - 1;
}

function checkTests() {
  if (process.argv.includes("--skip-tests")) return;
  const dir = path.join(ROOT, "scripts", "tests");
  if (!existsSync(dir)) return fail("scripts/tests/", "unit tests are missing");
  const files = readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).map((f) => path.join(dir, f));
  const result = run(process.execPath, ["--test", ...files], { timeout: 300_000 });
  if (result.status !== 0) fail("scripts/tests/", `unit tests failed:\n${(result.stdout + result.stderr).split("\n").filter((l) => /not ok|Error|expected|actual/.test(l)).slice(0, 20).join("\n")}`);
  stats.testFiles = files.length;
}

const allFiles = walk(ROOT);
checkPlaybooks();
checkPrinciples();
checkSkills();
checkRoutes();
for (const skill of skillNames) if (!reachedSkills.has(skill)) fail(`core/skills/${skill}/`, "skill is not reachable from any route or playbook frontmatter");
checkPrompts();
checkFilesExist();
checkRouter();
checkSyntax(allFiles);
checkDecisionLog();
for (const problem of contentChecks({ root: ROOT, files: allFiles, manifest })) fail(problem.file, problem.message);
const linkResult = linkChecks({ root: ROOT, files: allFiles });
for (const problem of linkResult.problems) fail(problem.file, problem.message);
stats.linksChecked = linkResult.checked;
checkTests();

const summary = Object.entries(stats).map(([key, value]) => `${key}=${value}`).join(" ");
if (errors.length) {
  console.error(`validate-harness: ${errors.length} problem(s)\n`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error(`\n${summary}`);
  process.exit(1);
}
console.log(`validate-harness: OK  ${summary}`);
