// Real runs used by scripts/run-autonomous-smoke-test.mjs. Every function here spawns the
// installed copy of a harness script (under <app>/.gifisi/scripts/) or a real Node process
// and returns what it observed. Nothing is simulated.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { toPosix } from "../lib/paths.mjs";
import { CHARACTERIZATION_INPUTS, CHARACTERIZE_SCRIPT } from "./edits.mjs";

export function runNode(cwd, args, { env = {}, timeout = 120000 } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout,
    windowsHide: true,
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error };
}

export const installedScript = (app, name) => path.join(app, ".gifisi", "scripts", name);
export const decisionsFile = (app) => path.join(app, ".gifisi", "decisions.tsv");

function runInstalled(app, name, args, options) {
  const script = installedScript(app, name);
  if (!existsSync(script)) return { status: null, stdout: "", stderr: `installed script missing: ${toPosix(script)}` };
  return runNode(app, [script, ...args], options);
}

function parseJson(run, label) {
  try {
    return JSON.parse(run.stdout);
  } catch {
    const tail = (run.stderr || run.stdout).trim().split("\n").slice(-3).join(" | ");
    throw new Error(`${label} did not print JSON (exit ${run.status}): ${tail}`);
  }
}

export function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

// Install the harness into the app. Prefers `bash install.sh --project /tmp/<name>` so the
// literal /tmp path and the cygpath conversion are exercised; falls back to the Node script
// when bash is missing or installs somewhere else (for example a WSL bash on Windows).
export function installHarness(app, harnessRoot, literalTarget) {
  const marker = path.join(app, ".gifisi", "core", "harness", "routes.json");
  const bash = spawnSync("bash", [toPosix(path.join(harnessRoot, "install.sh")), "--project", literalTarget], {
    cwd: harnessRoot,
    encoding: "utf8",
    timeout: 180000,
    windowsHide: true,
  });
  if (!bash.error && bash.status === 0 && existsSync(marker)) {
    return { method: `bash install.sh --project ${literalTarget}`, status: 0, output: bash.stdout };
  }
  const why = bash.error ? `bash unavailable (${bash.error.code ?? bash.error.message})` : `bash install exited ${bash.status}`;
  const node = runNode(harnessRoot, [path.join(harnessRoot, "scripts", "sync-harnesses.mjs"), "--project", app], { timeout: 180000 });
  return {
    method: `node scripts/sync-harnesses.mjs --project ${toPosix(app)} (fallback: ${why})`,
    status: node.status === 0 && existsSync(marker) ? 0 : node.status ?? 1,
    output: node.stdout + node.stderr + (bash.stderr ?? ""),
  };
}

export function featureMap(app) {
  const run = runInstalled(app, "verify-feature-map.mjs", ["--root", app, "--json"]);
  return { ...parseJson(run, "verify-feature-map"), status: run.status };
}

export function qualityGate(app) {
  const run = runInstalled(app, "quality-gate.mjs", ["--root", app, "--json"]);
  return { ...parseJson(run, "quality-gate"), status: run.status };
}

export function testFiles(app) {
  const dir = path.join(app, "test");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).sort().map((f) => `test/${f}`);
}

// Runs node --test with an explicit file list (portable across Node 18 to 22+ and shells)
// and reads the pass and fail counts from the TAP or spec summary.
export function runTests(app, files = testFiles(app)) {
  const run = runNode(app, ["--test", ...files]);
  const count = (label) => Number(new RegExp(`^(?:#|\\u2139)\\s*${label} (\\d+)`, "m").exec(run.stdout)?.[1] ?? NaN);
  return { files, pass: count("pass"), fail: count("fail"), status: run.status, output: run.stdout + run.stderr };
}

export function classify(app, prompt) {
  const run = runInstalled(app, "classify-task.mjs", [prompt, "--json"]);
  const data = parseJson(run, "classify-task");
  if (!Array.isArray(data.ranked) || data.ranked.length === 0) throw new Error("classify-task returned no ranking");
  return { top: data.ranked[0], runnerUp: data.ranked[1] ?? null, header: data.header, status: run.status };
}

// Extract the numbered `## Steps` list from the installed playbook.
export function playbookSteps(app, playbook) {
  const file = path.join(app, ".gifisi", "core", "playbooks", `${playbook}.md`);
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const section = /^## Steps\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
  if (!section) throw new Error(`${playbook}.md has no ## Steps section`);
  return section[1].split("\n").filter((line) => /^\d+\.\s/.test(line)).map((line) => line.replace(/^\d+\.\s+/, ""));
}

export function logDecision(app, phase, decision, why, evidence, result) {
  const run = runInstalled(app, "log-decision.mjs", ["--log", decisionsFile(app), phase, decision, why, evidence, result]);
  if (run.status !== 0) throw new Error(`log-decision ${phase} failed (exit ${run.status}): ${run.stderr.trim()}`);
}

export function checkDecisions(app) {
  const run = runInstalled(app, "log-decision.mjs", ["--check", "--log", decisionsFile(app)]);
  const rows = Number(/rows=(\d+)/.exec(run.stdout + run.stderr)?.[1] ?? NaN);
  return { status: run.status, rows, output: (run.stdout + run.stderr).trim() };
}

export function validateProject(app) {
  const run = runInstalled(app, "validate-project.mjs", ["--root", app]);
  return { status: run.status, output: (run.stdout + run.stderr).trim() };
}

// Print every export of a module applied to fixed inputs, from a fresh Node process.
export function characterize(app, file) {
  const run = runNode(app, ["--input-type=module", "-e", CHARACTERIZE_SCRIPT], {
    env: { GIFISI_CHAR_FILE: path.join(app, file), GIFISI_CHAR_INPUTS: JSON.stringify(CHARACTERIZATION_INPUTS) },
  });
  if (run.status !== 0) throw new Error(`characterization of ${file} failed: ${run.stderr.trim()}`);
  return run.stdout.trim();
}

// One BEFORE or AFTER measurement: every number comes from a real run.
export function snapshot(app) {
  const map = featureMap(app);
  const gate = qualityGate(app);
  const tests = runTests(app);
  const log = checkDecisions(app);
  return { map, gate, tests, log };
}

export function checkResults(map, feature) {
  return map.results.filter((r) => r.feature === feature);
}
