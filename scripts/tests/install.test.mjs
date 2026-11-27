// Integration tests for project and global installs (scripts/sync-harnesses.mjs).
// Every test works in a fresh directory under os.tmpdir() and never touches the real home.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { countMarkers } from "../lib/managed-blocks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SYNC = path.join(ROOT, "scripts", "sync-harnesses.mjs");
const manifest = JSON.parse(readFileSync(path.join(ROOT, "core", "harness", "manifest.json"), "utf8"));

function sync(args) {
  const result = spawnSync(process.execPath, [SYNC, ...args], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, `sync ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`);
  return result.stdout;
}

function tempDir(t, prefix) {
  const dir = mkdtempSync(path.join(os.tmpdir(), `gifisi-${prefix}-`));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function put(root, rel, content) {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

const read = (root, rel) => readFileSync(path.join(root, rel), "utf8");

function snapshot(root) {
  const hashes = new Map();
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(abs);
      else hashes.set(path.relative(root, abs), createHash("sha256").update(readFileSync(abs)).digest("hex"));
    }
  };
  visit(root);
  return hashes;
}

test("project install into an empty dir is complete and the second run writes nothing", (t) => {
  const target = path.join(tempDir(t, "proj"), "new-app");
  const first = sync(["--project", target]);
  assert.match(first, /writes=[1-9]\d*/);
  for (const p of manifest.playbooks) assert.ok(existsSync(path.join(target, ".gifisi", "core", "playbooks", `${p.name}.md`)), p.name);
  for (const s of manifest.projectScripts) assert.ok(existsSync(path.join(target, ".gifisi", "scripts", s)), s);
  for (const doc of manifest.docs) assert.ok(existsSync(path.join(target, "docs", doc)), doc);
  assert.ok(existsSync(path.join(target, "PRODUCT.md")));
  assert.equal(read(target, ".gifisi/decisions.tsv"), `${manifest.decisionColumns.join("\t")}\n`);
  assert.deepEqual(countMarkers(read(target, "AGENTS.md")), { begin: 1, end: 1 });
  assert.match(read(target, "CLAUDE.md"), /^@AGENTS\.md$/m);
  assert.match(read(target, ".cursor/rules/gifisi-harness.mdc"), /^alwaysApply: true$/m);
  assert.doesNotMatch(read(target, "AGENTS.md"), /\{\{[A-Z_]+\}\}/);
  const project = JSON.parse(read(target, ".gifisi/project.json"));
  assert.equal(project.packageManager, "none");
  assert.equal(project.name, "new-app");

  const before = snapshot(target);
  const second = sync(["--project", target]);
  assert.match(second, /writes=0\b/);
  assert.deepEqual(snapshot(target), before);
});

test("brownfield project keeps CRLF AGENTS.md, user files and stack files byte-for-byte", (t) => {
  const target = tempDir(t, "brown");
  const agents = "# Shop API\r\n\r\nTeam rule: keep handlers small.\r\n";
  const pkg = { name: "shop-api", scripts: { test: "node --test", lint: "eslint ." }, devDependencies: { eslint: "9.0.0" } };
  const files = {
    "AGENTS.md": agents,
    "CLAUDE.md": "# Claude notes\n\n@AGENTS.md\n",
    "package.json": `${JSON.stringify(pkg, null, 2)}\n`,
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "eslint.config.mjs": "export default [{ rules: { \"max-lines\": [\"error\", 350] } }];\n",
    "test/app.test.mjs": "import { test } from \"node:test\";\ntest(\"ok\", () => {});\n",
    "docs/architecture.md": "# Architecture\n\nOur own notes.\n",
    "PRODUCT.md": "# Shop\n\nExisting product doc.\n",
  };
  for (const [rel, content] of Object.entries(files)) put(target, rel, content);

  const first = sync(["--project", target]);
  assert.match(first, /unchanged +CLAUDE\.md/);
  assert.match(first, /skip +PRODUCT\.md \(exists, preserved\)/);
  const spliced = read(target, "AGENTS.md");
  assert.ok(spliced.startsWith(agents), "user text before the block must be unchanged");
  assert.doesNotMatch(spliced.replace(/\r\n/g, ""), /\n/, "AGENTS.md must stay CRLF");
  assert.deepEqual(countMarkers(spliced), { begin: 1, end: 1 });
  for (const rel of ["CLAUDE.md", "package.json", "pnpm-lock.yaml", "eslint.config.mjs", "test/app.test.mjs", "docs/architecture.md", "PRODUCT.md"]) {
    assert.equal(read(target, rel), files[rel], `${rel} must be untouched`);
  }
  const project = JSON.parse(read(target, ".gifisi/project.json"));
  assert.equal(project.packageManager, "pnpm");
  assert.deepEqual(project.commands, { test: "pnpm test", lint: "pnpm lint", build: null, dev: null });
  assert.deepEqual(project.eslint, { config: "eslint.config.mjs", maxLinesRule: true });
  assert.ok(project.frameworks.includes("eslint"));

  const before = snapshot(target);
  assert.match(sync(["--project", target]), /writes=0\b/);
  assert.deepEqual(snapshot(target), before);
});

test("CLAUDE.md without the import gets a managed import block; unmanaged .mdc is skipped", (t) => {
  const target = tempDir(t, "claude");
  put(target, "CLAUDE.md", "Always answer in English.\n");
  const mdc = "---\nalwaysApply: true\n---\nTeam-owned rule.\n";
  put(target, ".cursor/rules/gifisi-harness.mdc", mdc);
  const out = sync(["--project", target]);
  assert.match(out, /skip +\.cursor\/rules\/gifisi-harness\.mdc \(not managed\)/);
  assert.equal(read(target, ".cursor/rules/gifisi-harness.mdc"), mdc);
  const claude = read(target, "CLAUDE.md");
  assert.ok(claude.startsWith("Always answer in English.\n\n<!-- gifisi-harness:begin"));
  assert.match(claude, /^@AGENTS\.md$/m);
  assert.match(sync(["--project", target]), /writes=0\b/);
});

test("files dropped from the harness are pruned; files never installed are kept", (t) => {
  const target = tempDir(t, "prune");
  sync(["--project", target]);
  const listFile = path.join(target, ".gifisi", ".installed.json");
  const list = JSON.parse(readFileSync(listFile, "utf8"));
  list.files.push("core/playbooks/retired-playbook.md");
  writeFileSync(listFile, `${JSON.stringify(list, null, 2)}\n`);
  put(target, ".gifisi/core/playbooks/retired-playbook.md", "old\n");
  put(target, ".gifisi/notes/mine.md", "user notes\n");
  const out = sync(["--project", target]);
  assert.match(out, /remove +\.gifisi\/core\/playbooks\/retired-playbook\.md/);
  assert.ok(!existsSync(path.join(target, ".gifisi", "core", "playbooks", "retired-playbook.md")));
  assert.equal(read(target, ".gifisi/notes/mine.md"), "user notes\n");
  assert.ok(!JSON.parse(readFileSync(listFile, "utf8")).files.includes("core/playbooks/retired-playbook.md"));
  assert.match(sync(["--project", target]), /writes=0\b/);
});

test("dry-run reports actions and writes nothing", (t) => {
  const target = path.join(tempDir(t, "dry"), "app");
  const out = sync(["--project", target, "--dry-run"]);
  assert.match(out, /create +AGENTS\.md/);
  assert.match(out, /dry-run, nothing written/);
  assert.ok(!existsSync(target));
});

test("global install into a fake home preserves the user's CLAUDE.md and is idempotent", (t) => {
  const home = tempDir(t, "home");
  const userRules = "# My rules\r\n\r\nPrefer small diffs.\r\n";
  put(home, ".claude/CLAUDE.md", userRules);
  put(home, ".claude/settings.json", "{\"theme\":\"dark\"}\n");
  const out = sync(["--global", "--home", home]);
  assert.match(out, /writes=[1-9]\d*/);
  const claude = read(home, ".claude/CLAUDE.md");
  assert.ok(claude.startsWith(userRules));
  assert.deepEqual(countMarkers(claude), { begin: 1, end: 1 });
  const harnessHome = `${home.split(path.sep).join("/")}/.gifisi-harness/`;
  assert.ok(claude.includes(`\`${harnessHome}core/playbooks/bug-fix.md\``), "router must point at the global harness home");
  assert.deepEqual(countMarkers(read(home, ".codex/AGENTS.md")), { begin: 1, end: 1 });
  assert.match(read(home, ".cursor/rules/gifisi-harness.mdc"), /^alwaysApply: true$/m);
  assert.equal(read(home, ".claude/settings.json"), "{\"theme\":\"dark\"}\n");
  assert.ok(existsSync(path.join(home, ".gifisi-harness", "scripts", "sync-harnesses.mjs")));
  assert.ok(existsSync(path.join(home, ".gifisi-harness", "core", "harness", "routes.json")));
  assert.ok(!existsSync(path.join(home, ".gifisi-harness", "scripts", "tests")));

  const before = snapshot(home);
  assert.match(sync(["--global", "--home", home]), /writes=0\b/);
  assert.deepEqual(snapshot(home), before);
});

// ---- regressions from the review ----------------------------------------------------------

const runRaw = (args, opts = {}) => spawnSync(process.execPath, [SYNC, ...args], { cwd: ROOT, encoding: "utf8", ...opts });

// A junction (Windows) or directory symlink (POSIX) to the repo, created straight under os.tmpdir().
// Only the link itself is removed afterwards: never a recursive rm through it.
function linkRepo(t) {
  const link = path.join(os.tmpdir(), `gifisi-link-${process.pid}-${Date.now()}`);
  symlinkSync(ROOT, link, process.platform === "win32" ? "junction" : "dir");
  assert.ok(lstatSync(link).isSymbolicLink(), "the link must be a link, not a copy");
  t.after(() => unlinkSync(link));
  return link;
}

test("sync-harnesses run through a junction or symlink really installs", (t) => {
  const link = linkRepo(t);
  const target = path.join(tempDir(t, "linked"), "app");
  const result = spawnSync(process.execPath, [path.join(link, "scripts", "sync-harnesses.mjs"), "--project", target], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /writes=[1-9]\d*/, "main() must run when invoked through the link");
  assert.ok(existsSync(path.join(target, "AGENTS.md")));
  assert.ok(existsSync(path.join(target, ".gifisi", "core", "harness", "routes.json")));
});

test("package.json with a UTF-8 BOM installs and stays byte-identical", (t) => {
  const target = tempDir(t, "bom-pkg");
  const pkg = `\uFEFF${JSON.stringify({ name: "bom-app", scripts: { test: "node --test" } }, null, 2)}\n`;
  put(target, "package.json", pkg);
  sync(["--project", target]);
  const project = JSON.parse(read(target, ".gifisi/project.json"));
  assert.equal(project.name, "bom-app");
  assert.equal(project.commands.test, "npm test");
  assert.equal(read(target, "package.json"), pkg);
});

test("a refused splice or unreadable package.json writes nothing", (t) => {
  const broken = tempDir(t, "broken-markers");
  put(broken, "AGENTS.md", "<!-- gifisi-harness:begin x -->\n<!-- gifisi-harness:begin y -->\n<!-- gifisi-harness:end -->\n");
  const first = runRaw(["--project", broken]);
  assert.equal(first.status, 1);
  assert.match(first.stderr, /one managed block/);
  assert.ok(!existsSync(path.join(broken, ".gifisi")), "no partial install");
  const badJson = tempDir(t, "bad-json");
  put(badJson, "package.json", "{ not json");
  assert.equal(runRaw(["--project", badJson]).status, 1);
  assert.deepEqual(readdirSync(badJson), ["package.json"]);
});

test("a managed AGENTS.md that gained a BOM re-installs with writes=0 and keeps the BOM", (t) => {
  const target = tempDir(t, "bom-agents");
  put(target, "AGENTS.md", ""); // an empty file gets the block at offset 0, like ~/.codex/AGENTS.md
  sync(["--project", target]);
  const agents = path.join(target, "AGENTS.md");
  writeFileSync(agents, `\uFEFF${readFileSync(agents, "utf8")}`);
  const mdc = path.join(target, ".cursor", "rules", "gifisi-harness.mdc");
  writeFileSync(mdc, readFileSync(mdc, "utf8").replace("<!-- gifisi-harness:end -->", "<!-- gifisi-harness:end --> \t"));
  sync(["--project", target]);
  assert.match(sync(["--project", target]), /writes=0\b/);
  assert.ok(readFileSync(agents, "utf8").startsWith("\uFEFF<!-- gifisi-harness:begin"));
  const check = spawnSync(process.execPath, [path.join(target, ".gifisi", "scripts", "validate-project.mjs"), "--root", target], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stdout + check.stderr);
});

test("global install honours CODEX_HOME when --home is absent, and ignores it with --home", (t) => {
  const home = tempDir(t, "codex-home");
  const codex = tempDir(t, "codex-dir");
  const env = { ...process.env, HOME: home, USERPROFILE: home, CODEX_HOME: codex };
  const dry = runRaw(["--global", "--dry-run"], { env });
  assert.equal(dry.status, 0, dry.stderr);
  const summary = dry.stdout.trim().split(/\r?\n/).at(-1);
  assert.ok(summary.includes(home.split(path.sep).join("/")), `the run must target the temp home, got: ${summary}`);
  const out = runRaw(["--global"], { env });
  assert.equal(out.status, 0, out.stderr);
  const codexLine = out.stdout.split(/\r?\n/).find((l) => l.startsWith("create") && l.endsWith("/AGENTS.md"));
  assert.equal(codexLine, `create    ${codex.split(path.sep).join("/")}/AGENTS.md`, "the action line names the resolved CODEX_HOME path");
  assert.deepEqual(countMarkers(readFileSync(path.join(codex, "AGENTS.md"), "utf8")), { begin: 1, end: 1 });
  assert.ok(!existsSync(path.join(home, ".codex")), "the default ~/.codex must not be written when CODEX_HOME is set");

  const other = tempDir(t, "codex-explicit");
  assert.equal(runRaw(["--global", "--home", other], { env }).status, 0);
  assert.ok(existsSync(path.join(other, ".codex", "AGENTS.md")), "--home keeps Codex under <home>/.codex");
});

test("global copy holds runtime scripts only and prunes repo-only tooling from an older install", (t) => {
  const home = tempDir(t, "global-subset");
  sync(["--global", "--home", home]);
  const scripts = path.join(home, ".gifisi-harness", "scripts");
  for (const s of ["sync-harnesses.mjs", "classify-task.mjs", "log-decision.mjs", "lib/managed-blocks.mjs"]) assert.ok(existsSync(path.join(scripts, s)), s);
  const repoOnly = ["check-install.mjs", "validate-harness.mjs", "run-autonomous-smoke-test.mjs", "run-tests.mjs", "smoke/steps.mjs"];
  for (const s of repoOnly) assert.ok(!existsSync(path.join(scripts, s)), `${s} must not be copied`);
  const listFile = path.join(home, ".gifisi-harness", ".installed.json");
  const list = JSON.parse(readFileSync(listFile, "utf8"));
  for (const s of repoOnly) {
    list.files.push(`scripts/${s}`);
    put(scripts, s, "// left by an older install\n");
  }
  writeFileSync(listFile, JSON.stringify(list));
  const out = sync(["--global", "--home", home]);
  for (const s of repoOnly) {
    assert.ok(out.split(/\r?\n/).includes(`remove    .gifisi-harness/scripts/${s}`), `${s} must be pruned`);
    assert.ok(!existsSync(path.join(scripts, s)));
  }
  assert.match(sync(["--global", "--home", home]), /writes=0\b/);
});
