#!/usr/bin/env node
// Autonomous improvement cycle on a deliberately broken app.
// Builds <tmp>/poteto-smoke-app with a bug, a missing feature and an over-350-line module,
// installs the harness into it, then runs three routed tasks (bug fix, feature, refactor):
// signal header -> reproduce -> failing test -> fix -> verify live -> decision trail.
// Usage: node scripts/run-autonomous-smoke-test.mjs [--keep]
// Exit 0 only when every expected BEFORE failure was observed, every AFTER check passed and
// every task was routed to its expected playbook.
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { HARNESS_ROOT, isMain, tmpRoot, toPosix } from "./lib/paths.mjs";
import { FEATURE_MAP, brokenAppFiles, writeFiles } from "./smoke/fixture.mjs";
import {
  CART_COUPON, CART_FIXED, CART_TEST, COUPONS_MODULE, COUPON_TEST, SERVER_COUPON, SERVER_FIX, TASKS,
  currencyTableModule, replaceOnce, tableDrivenFormatUtils,
} from "./smoke/edits.mjs";
import {
  characterize, checkDecisions, checkResults, classify, featureMap, installHarness, logDecision,
  playbookSteps, qualityGate, runTests, sha256, snapshot, validateProject,
} from "./smoke/steps.mjs";

const APP_NAME = "poteto-smoke-app";
const NOTE = "Edits are scripted stand-ins for an agent's changes; every check, run, and log row around them is real.";
const expectations = [];

function expect(name, ok, detail = "") {
  expectations.push({ name, ok: Boolean(ok), detail });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? ` -- ${detail}` : ""}`);
}

const section = (title) => console.log(`\n=== ${title} ===`);
const allPass = (results) => results.length > 0 && results.every((r) => r.pass);
const allFail = (results) => results.length > 0 && results.every((r) => !r.pass);
const details = (results) => results.map((r) => `${r.check}: ${r.detail}`).join("; ");
const mapLine = (map) => `passed=${map.passed} failed=${map.failed} ready=${map.ready}`;

// Steps shared by every task: classify the prompt, print the signal header, load the playbook
// steps as the todo list, and log the signal row.
function signal(app, key) {
  const task = TASKS[key];
  const routed = classify(app, task.prompt);
  console.log(`Prompt: "${task.prompt}"\n`);
  console.log(routed.header.trimEnd());
  const playbook = routed.top.playbook;
  expect(`prompt routes to playbook ${task.expectedPlaybook}`, playbook === task.expectedPlaybook,
    `${routed.top.taskType} score ${routed.top.score}${routed.runnerUp ? `; runner-up ${routed.runnerUp.taskType} ${routed.runnerUp.score}` : ""}`);
  const steps = playbookSteps(app, playbook);
  console.log(`\nTodo list (verbatim from .poteto/core/playbooks/${playbook}.md ## Steps):`);
  steps.forEach((step, i) => console.log(`  [ ] ${i + 1}. ${step}`));
  expect(`playbook ${playbook} has 3 to 12 steps`, steps.length >= 3 && steps.length <= 12, `${steps.length} steps`);
  logDecision(app, "signal", `Task Type: ${routed.top.taskType} | Playbook: ${playbook}`, `classified: ${task.prompt}`,
    ".poteto/scripts/classify-task.mjs --json", `score ${routed.top.score}; ${steps.length} steps loaded`);
  console.log("");
}

function bugTask(app) {
  section("Task a: bug fix");
  signal(app, "bug");
  const repro = checkResults(featureMap(app), "cart-total");
  expect("reproduce: cart-total fails on the live HTTP surface", allFail(repro), details(repro));
  logDecision(app, "reproduce", "cart total is wrong on the live endpoint", "reproduce on the surface the user hits",
    "verify-feature-map.mjs cart-total", details(repro));
  logDecision(app, "root-cause", "src/cart.mjs:3 sums query-string prices without parsing them", "0 + \"10\" + \"5\" concatenates to \"0105\"",
    "src/cart.mjs:3", "parse prices at the boundary and reject non-numeric input");

  writeFiles(app, { "test/cart-total.test.mjs": CART_TEST });
  const red = runTests(app, ["test/cart-total.test.mjs"]);
  expect("regression test fails for the stated reason (actual \"0105\")", red.fail > 0 && red.output.includes("0105"), `pass=${red.pass} fail=${red.fail}`);
  logDecision(app, "failing-test", "added test/cart-total.test.mjs", "pin the bug before fixing it",
    "node --test test/cart-total.test.mjs", `pass=${red.pass} fail=${red.fail}`);

  writeFiles(app, { "src/cart.mjs": CART_FIXED });
  replaceOnce(app, "src/server.mjs", SERVER_FIX.before, SERVER_FIX.after);
  replaceOnce(app, "src/server.mjs", SERVER_FIX.beforeBody, SERVER_FIX.afterBody);
  logDecision(app, "fix", "parse prices in cart.mjs and map InvalidCartError to 400", "fix the first wrong state, not the symptom",
    "src/cart.mjs src/server.mjs", "edit applied");

  const green = runTests(app, ["test/cart-total.test.mjs"]);
  const live = checkResults(featureMap(app), "cart-total");
  expect("regression test passes after the fix", green.fail === 0 && green.pass > 0, `pass=${green.pass} fail=${green.fail}`);
  expect("cart-total passes on the live HTTP surface", allPass(live), details(live));
  logDecision(app, "verify", "bug fixed on the original surface", "same reproduction, now green",
    "node --test test/cart-total.test.mjs; verify-feature-map.mjs", `tests pass=${green.pass} fail=${green.fail}; live ${live.filter((r) => r.pass).length}/${live.length}`);
}

function featureTask(app) {
  section("Task b: feature");
  signal(app, "feature");
  const missing = checkResults(featureMap(app), "coupon");
  expect("coupon checks fail live before the feature exists", allFail(missing), details(missing));
  logDecision(app, "baseline", "coupon parameter is ignored today", "prove the gap on the live surface first",
    "verify-feature-map.mjs coupon", details(missing));

  writeFiles(app, { "test/coupons.test.mjs": COUPON_TEST });
  const red = runTests(app, ["test/coupons.test.mjs"]);
  expect("coupon test fails before the feature (actual 15, want 13.5)", red.fail > 0 && red.output.includes("13.5"), `pass=${red.pass} fail=${red.fail}`);
  logDecision(app, "failing-test", "added test/coupons.test.mjs", "behavior first, implementation second",
    "node --test test/coupons.test.mjs", `pass=${red.pass} fail=${red.fail}`);

  writeFiles(app, { "src/coupons.mjs": COUPONS_MODULE });
  replaceOnce(app, "src/cart.mjs", CART_COUPON.importBefore, CART_COUPON.importAfter);
  replaceOnce(app, "src/cart.mjs", CART_COUPON.before, CART_COUPON.after);
  replaceOnce(app, "src/server.mjs", SERVER_COUPON.before, SERVER_COUPON.after);
  logDecision(app, "implement", "coupon table in src/coupons.mjs, applied in cartTotal, read from ?coupon=",
    "a new code is one table row; unknown codes are a 400", "src/coupons.mjs src/cart.mjs src/server.mjs", "edit applied");

  const green = runTests(app, ["test/coupons.test.mjs", "test/cart-total.test.mjs"]);
  const live = featureMap(app);
  expect("coupon and cart tests pass", green.fail === 0 && green.pass > 0, `pass=${green.pass} fail=${green.fail}`);
  expect("coupon passes on the live HTTP surface", allPass(checkResults(live, "coupon")), details(checkResults(live, "coupon")));
  expect("no earlier feature regressed", live.failed === 0, mapLine(live));
  logDecision(app, "verify", "coupon feature live", "Feature Map is the done predicate",
    "verify-feature-map.mjs", mapLine(live));
}

function refactorTask(app) {
  section("Task c: refactoring");
  signal(app, "refactor");
  const gate = qualityGate(app);
  const oversized = gate.violations.find((v) => v.kind === "max-lines" && v.file === "src/format-utils.mjs");
  expect("quality gate flags src/format-utils.mjs", Boolean(oversized), oversized ? `${oversized.lines} lines` : JSON.stringify(gate.violations));
  logDecision(app, "baseline", "quality gate before the refactor", "record ground truth before moving code",
    "quality-gate.mjs --json", `violations=${gate.violations.length}; largest ${gate.largest?.file}:${gate.largest?.lines}`);
  const before = characterize(app, "src/format-utils.mjs");
  const exportsCount = Object.keys(JSON.parse(before)).length;
  logDecision(app, "pin", "captured every export of src/format-utils.mjs on fixed inputs",
    "behavior must not change during a refactor", "node --input-type=module (fresh process)", `${exportsCount} exports, ${before.length} bytes`);

  writeFiles(app, { "src/format/currencies.mjs": currencyTableModule(), "src/format-utils.mjs": tableDrivenFormatUtils() });
  logDecision(app, "refactor", "replaced copy-pasted formatters with a CURRENCIES table and one formatter",
    "same exported names, data instead of duplicated code", "src/format-utils.mjs src/format/currencies.mjs", "edit applied");

  const after = characterize(app, "src/format-utils.mjs");
  const gateAfter = qualityGate(app);
  const tests = runTests(app);
  const live = featureMap(app);
  expect("characterization output is identical", before === after, `${exportsCount} exports compared`);
  expect("quality gate passes", gateAfter.violations.length === 0, `largest ${gateAfter.largest?.file}:${gateAfter.largest?.lines}`);
  expect("all tests pass after the refactor", tests.fail === 0 && tests.pass > 0, `pass=${tests.pass} fail=${tests.fail}`);
  expect("Feature Map still passes", live.failed === 0 && live.ready, mapLine(live));
  logDecision(app, "verify", "refactor preserved behavior and cleared the gate", "characterization + gate + tests + live map",
    "characterize; quality-gate.mjs; node --test; verify-feature-map.mjs",
    `identical=${before === after}; violations=${gateAfter.violations.length}; tests fail=${tests.fail}; live failed=${live.failed}`);
}

function printSnapshot(label, snap) {
  console.log(`${label}: feature map ${mapLine(snap.map)}; tests pass=${snap.tests.pass} fail=${snap.tests.fail}; ` +
    `quality violations=${snap.gate.violations.length}; decision rows=${snap.log.rows}`);
}

function table(before, after) {
  const largest = (s) => (s.gate.largest ? `${s.gate.largest.file}:${s.gate.largest.lines}` : "none");
  const rows = [
    ["metric", "before", "after"],
    ["feature-map checks passed", before.map.passed, after.map.passed],
    ["feature-map checks failed", before.map.failed, after.map.failed],
    ["tests passed", before.tests.pass, after.tests.pass],
    ["tests failed", before.tests.fail, after.tests.fail],
    ["quality violations", before.gate.violations.length, after.gate.violations.length],
    ["largest file (counted lines)", largest(before), largest(after)],
    ["decision rows", before.log.rows, after.log.rows],
  ].map((row) => row.map(String));
  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((r) => r[i].length)));
  return rows.map((r) => `| ${r.map((cell, i) => cell.padEnd(widths[i])).join(" | ")} |`).join("\n");
}

function run(app) {
  const literalTarget = `/tmp/${APP_NAME}`;
  section("Setup");
  rmSync(app, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  writeFiles(app, brokenAppFiles());
  console.log(`Broken app written to ${toPosix(app)}`);
  const pinned = ["package.json", "test/format.test.mjs"].map((file) => ({ file, hash: sha256(path.join(app, file)) }));

  const install = installHarness(app, HARNESS_ROOT, literalTarget);
  console.log(`Install: ${install.method}`);
  console.log(install.output.trim().split("\n").filter((l) => /poteto-harness:/.test(l)).join("\n"));
  expect("harness installed", install.status === 0, `exit ${install.status}`);
  for (const { file, hash } of pinned) expect(`install left ${file} byte-identical`, sha256(path.join(app, file)) === hash);
  writeFiles(app, { ".poteto/feature-map.json": `${JSON.stringify(FEATURE_MAP, null, 2)}\n` });

  section("BEFORE snapshot (real runs)");
  const before = snapshot(app);
  printSnapshot("BEFORE", before);
  expect("app becomes ready", before.map.ready);
  expect("health passes", allPass(checkResults(before.map, "health")));
  expect("cart-total fails (bug present)", allFail(checkResults(before.map, "cart-total")), details(checkResults(before.map, "cart-total")));
  expect("coupon fails (feature missing)", allFail(checkResults(before.map, "coupon")), details(checkResults(before.map, "coupon")));
  expect("quality gate flags the messy module",
    before.gate.violations.some((v) => v.kind === "max-lines" && v.file === "src/format-utils.mjs"), `violations=${before.gate.violations.length}`);
  expect("existing brownfield test passes", before.tests.fail === 0 && before.tests.pass >= 1, `pass=${before.tests.pass} fail=${before.tests.fail}`);
  expect("decision log starts valid", before.log.status === 0, before.log.output);

  bugTask(app);
  featureTask(app);
  refactorTask(app);

  section("AFTER snapshot (real runs)");
  const after = snapshot(app);
  const project = validateProject(app);
  printSnapshot("AFTER", after);
  expect("every Feature Map check passes", after.map.ready && after.map.failed === 0 && after.map.passed === before.map.results.length, mapLine(after.map));
  expect("every test passes", after.tests.fail === 0 && after.tests.pass > before.tests.pass, `pass=${after.tests.pass} fail=${after.tests.fail}`);
  expect("quality gate has no violations", after.gate.violations.length === 0);
  expect("decision log is valid and has the trail", after.log.status === 0 && after.log.rows > before.log.rows, after.log.output);
  expect("validate-project passes", project.status === 0, project.output.split("\n").slice(-1)[0]);
  expect("package.json untouched by the whole run", sha256(path.join(app, "package.json")) === pinned[0].hash);
  expect("brownfield test file preserved", sha256(path.join(app, "test/format.test.mjs")) === pinned[1].hash);

  section("Before / after");
  console.log(table(before, after));
  section(".poteto/decisions.tsv");
  const trail = checkDecisions(app);
  console.log(`(${trail.output})`);
  return path.join(app, ".poteto", "decisions.tsv");
}

function main() {
  const keep = process.argv.includes("--keep");
  const app = path.join(tmpRoot(), APP_NAME);
  console.log("poteto-harness autonomous smoke test");
  console.log(NOTE);
  let crashed = null;
  try {
    const log = run(app);
    console.log(readFileSync(log, "utf8").trimEnd());
  } catch (error) {
    crashed = error;
    console.error(`\nsmoke test stopped: ${error.stack ?? error.message}`);
  } finally {
    if (!keep) {
      rmSync(app, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      console.log(`\nRemoved ${toPosix(app)}`);
    } else console.log(`\nKept ${toPosix(app)}`);
  }
  const failed = expectations.filter((e) => !e.ok);
  section("Verdict");
  console.log(`expectations=${expectations.length} passed=${expectations.length - failed.length} failed=${failed.length}${crashed ? " (run crashed)" : ""}`);
  for (const f of failed) console.log(`  FAIL ${f.name}${f.detail ? ` -- ${f.detail}` : ""}`);
  const ok = !crashed && failed.length === 0;
  console.log(ok ? "PASS: broken app fixed, feature added, module refactored, all verified live." : "FAIL");
  process.exitCode = ok ? 0 : 1;
}

if (isMain(import.meta.url)) main();
