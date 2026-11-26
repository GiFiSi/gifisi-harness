// Unit tests for scripts/classify-task.mjs: routing, ranking, fallback and the signal header.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSignal, classify, donePredicateOf } from "../classify-task.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "classify-task.mjs");
const routes = JSON.parse(readFileSync(path.join(ROOT, "core", "harness", "routes.json"), "utf8"));
const top = (prompt) => classify(prompt, routes)[0];

test("a broken endpoint routes to bug-fix", () => {
  const result = top("The /api/cart/total endpoint is broken and returns a 500 error");
  assert.equal(result.id, "bug");
  assert.equal(result.playbook, "bug-fix");
  assert.deepEqual(result.matched, ["broken", "error", "500 error"]);
  assert.equal(result.score, 4);
});

test("adding coupon support routes to feature", () => {
  const result = top("add coupon support");
  assert.equal(result.id, "feature");
  assert.equal(result.playbook, "feature");
});

test("refactoring a 400 line module routes to refactoring", () => {
  const result = top("refactor the 400 line module");
  assert.equal(result.id, "refactor");
  assert.equal(result.playbook, "refactoring");
});

test("machine setup reaches the machine-setup route, not the fallback", () => {
  const result = top("set up my machine");
  assert.equal(result.id, "machine-setup");
  assert.equal(result.playbook, "multi-phase-plan");
  assert.equal(result.score, 4);
  assert.ok(result.skills.includes("machine-setup"));
});

test("reviewing a PR diff reaches the code-review route", () => {
  const result = top("review this PR diff");
  assert.equal(result.id, "code-review");
  assert.equal(result.playbook, "investigation");
  assert.ok(result.skills.includes("code-review"));
});

test("gibberish falls back to multi-phase with score 0", () => {
  const ranked = classify("qwzx plorb vintuk", routes);
  assert.equal(ranked[0].id, routes.fallback);
  assert.equal(ranked[0].id, "multi-phase");
  assert.equal(ranked[0].score, 0);
  assert.ok(ranked.every((entry) => entry.score === 0));
});

test("signals need word boundaries", () => {
  assert.notEqual(top("the debugger window is too small").id, "bug");
  assert.equal(top("address the padding").score, 0, "'add' must not match inside 'address'");
});

test("phrases outrank single words; ties go to the earliest signal in the prompt", () => {
  const ranked = classify("we have a memory leak that makes the page slow", routes);
  assert.equal(ranked[0].id, "perf");
  assert.equal(ranked[0].score, 3);
  const tie = classify("bug slow", routes);
  assert.deepEqual([tie[0].id, tie[1].id], ["bug", "perf"]);
  const swapped = classify("slow bug", routes);
  assert.deepEqual([swapped[0].id, swapped[1].id], ["perf", "bug"], "the earlier signal wins a tie, not file order");
  assert.equal(top("Add error handling to the login form").id, "feature", "a leading 'add' beats a later 'error'");
});

for (const [prompt, expected] of [
  ["Add a user profile page", "feature"],
  ["Fix the 500 error on login", "bug"],
  ["corrigir o erro no checkout", "bug"],
  ["a página está lenta", "perf"],
  ["model check the order state machine", "formal-verification"],
  ["cut a release for v2", "shipping"],
]) {
  test(`"${prompt}" routes to ${expected}`, () => {
    assert.equal(top(prompt).id, expected);
  });
}

test("donePredicateOf takes the first sentence of the first prose paragraph", () => {
  const text = [
    "---", "name: demo", "---", "", "# Demo", "", "## Done Predicate", "",
    "The file `.poteto/plans/x.md` exists. It lists units.", "", "```", "Done Predicate: x", "```", "", "## Steps", "1. Go.",
  ].join("\n");
  assert.equal(donePredicateOf(text), "The file `.poteto/plans/x.md` exists.");
  assert.equal(donePredicateOf("# No predicate\n"), null);
});

test("buildSignal prints the three header lines and a load line", () => {
  const ranked = classify("the login page is broken", routes);
  const { header, load } = buildSignal(ranked, { root: ROOT, cwd: ROOT });
  const lines = header.split("\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "[POTETO-HARNESS] Task Type: Bug fix | Playbook: Bug fix");
  assert.match(lines[1], /^Reason: matched "broken" \(score 1\); runner-up: /);
  assert.match(lines[2], /^Done Predicate: \S/);
  assert.match(load, /^Load: core\/playbooks\/bug-fix\.md; skills: core\/skills\/why\/SKILL\.md, /);
});

test("CLI --json returns ranked routes and the header", () => {
  const result = spawnSync(process.execPath, [SCRIPT, "set up my machine", "--json", "--top", "2"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.ranked.length, 2);
  assert.deepEqual(Object.keys(data.ranked[0]).sort(), ["id", "matched", "playbook", "score", "skills", "taskType"]);
  assert.equal(data.ranked[0].id, "machine-setup");
  assert.match(data.header, /^\[POTETO-HARNESS\] Task Type: Machine setup \| Playbook: Multi-phase plan\n/);
});

test("CLI without a prompt exits 2 with usage", () => {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});
