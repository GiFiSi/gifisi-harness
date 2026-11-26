---
name: hillclimb
title: Hillclimb
summary: Sustained improvement of one measured number against a target, one change per attempt, kept or reverted on evidence.
skills: [benchmark-checklist, reflect, how]
principles: [prove-it-works, build-the-lever, explain-the-number, sequence-verifiable-units, laziness-protocol, guard-the-context-window, separate-before-serializing-shared-state]
---

# Hillclimb

## When to use

Use this playbook to push one measurable thing toward a target over many iterations: a pass rate, a latency median, a bundle size, a benchmark score. You own the metric and the integrity of the experiment. A single slow path with one obvious cause is `core/playbooks/perf-issue.md`. A wrong result is `core/playbooks/bug-fix.md`. This playbook is the loop.

The discipline is fixed: one change, one measurement, keep or revert. Never stack untested changes. Never claim a win from reading code.

## Done Predicate

The frozen measurement command `<command>` reports a median at or past `<target>` after at least `<N>` attempts, and the regression gate passes on the final commit.

Template:

- Artifact: the metric printed by one repeatable command, plus the regression gate (project tests and lint from `.poteto/project.json`, `node scripts/quality-gate.mjs`, and `node scripts/verify-feature-map.mjs` when `.poteto/feature-map.json` exists).
- Observation: baseline and final medians from the same frozen command, with the percent delta, and every `attempt-N` row present in `.poteto/decisions.tsv`.
- The attempt floor stops a lucky early win from ending the run. "At least 50% better than baseline and at least 10 attempts" is the right shape.
- If the target is not reached, the result is `NOT MET` with the best number and the reason, never a relaxed predicate.

## Steps

1. Trace the target code with `core/skills/how/SKILL.md` and pick a workload case that reproduces the user's complaint; if no case reproduces it, fix the repro before climbing.
2. Fix one metric, the direction that counts as better, and a stop predicate pairing a target with a minimum attempt count; log it as phase `signal` with `scripts/log-decision.mjs`.
3. Build one repeatable measurement command that prints the median of N runs, its error count, and the work done; prove it separates contrasting workloads, vet it with `core/skills/benchmark-checklist/SKILL.md`, then freeze it.
4. Run the regression gate green (tests and lint from `.poteto/project.json`, `scripts/quality-gate.mjs`, `scripts/verify-feature-map.mjs` when a Feature Map exists), record the baseline median, and log a `baseline` row.
5. Read the earlier `attempt-*` rows in `.poteto/decisions.tsv`, then write the next hypothesis naming one specific mechanism from the traced architecture.
6. Make exactly one change for that hypothesis, delegating it with a tight scope if your harness can spawn subagents, review the diff, then measure with the frozen command and run the regression gate.
7. Keep the change only if the metric moves past noise and the gate stays green, otherwise revert it fully; commit a kept change alone with `git add <files>` and log an `attempt-N` row either way.
8. On a plateau or a run of rejects, pivot category, combine near-misses, reread the source, or try a radical idea; revert any win that breaks behavior and keep simplifications that hold the number.
9. Stop when the predicate holds or only marginal ideas remain, never by relaxing the predicate; load `core/skills/reflect/SKILL.md` and log a `verify` row with baseline, final, and delta.
10. Open the PR with `core/playbooks/opening-a-pr.md`, kept commits in landing order and the baseline-to-final numbers under Verification.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the global harness home (for example `~/.poteto-harness/`) when only a global install exists, the repository root here. Run them as `node "<harness-home>/scripts/<name>.mjs"` from the project root, so `.poteto/decisions.tsv` lands in the project.

**Step 1.** Name the workload dimensions that can move the result: data size, history length, cached state, concurrency, cold versus warm start. A hillclimb on a case that does not show the user's symptom optimizes the wrong thing. If the complaint cannot be reproduced, the honest output is a better repro, not a faster benchmark.

**Step 2.** Use the user's numbers when given. When none are given, choose a target and floor, state them in the signal header, and proceed (`core/principles/never-block-on-the-human.md`). The predicate is written down before the first attempt and does not change afterwards.

**Step 3.** This is `core/principles/build-the-lever.md`: the command is the lever a reviewer reruns. Checks before freezing it:

- Run the easy case and the target case. The target case must show the symptom and the easy case must not. If the harness cannot tell them apart, change the workload or the metric.
- Sample enough to clear noise. Report the median of N and the spread, never a single run.
- Print the error count and a count of work done, so a "faster" run that silently did less work is caught (`core/principles/explain-the-number.md`).
- Once frozen, changing the harness resets the baseline. Log that as its own row.

**Step 4.** The regression gate is the set of checks that must stay green on every kept attempt. Read the commands from `.poteto/project.json`. Run `node scripts/quality-gate.mjs` when the project has no ESLint `max-lines` rule, so no attempt sneaks a file over 350 lines.

**Step 5.** A hypothesis names a mechanism: "move the schema parse off the request path because it runs per call and its input never changes". "Try memoizing something" is not a hypothesis. For a speed metric, order hypotheses by the performance mantras in `core/playbooks/perf-issue.md`, cheapest first. Borrow only their order, not that playbook's stop rule. Never retry a hypothesis a prior row already rejected unless you name what changed.

**Step 6.** Supervise and review rather than type when your harness can spawn subagents (`core/principles/guard-the-context-window.md`). Independent hypotheses may run in parallel only when each attempt works in its own worktree or copy (`core/principles/separate-before-serializing-shared-state.md`), and each is still measured alone against the same baseline.

**Step 7.** Map each attempt onto the six log columns:

| Column | Content |
|---|---|
| phase | `attempt-N` |
| decision | the change, one line |
| why | the mechanism the hypothesis named |
| evidence | the command and the before and after medians |
| result | `kept +12.4%` or `reverted -0.3% (noise)` |

Example: `node scripts/log-decision.mjs attempt-4 "cache parsed schema per process" "parse ran per request" "npm run bench: 182ms -> 141ms (median of 15)" "kept -22.5%"`. Each attempt ends in a check before the next begins (`core/principles/sequence-verifiable-units.md`). One commit per kept attempt. Stage only the files you changed.

**Step 8.** Correctness and simplicity outrank the number. A deletion that holds the metric is a win (`core/principles/laziness-protocol.md`). Several rejects in a row mean the model of the system is wrong: go back to step 1's trace before the next attempt. If the run is unattended, follow the wake and continuation rules of `core/playbooks/autonomous-run.md`, not its stop rule.

**Step 9.** Do not quit while cheap untried hypotheses remain. If you are stuck, say so with the evidence instead of spinning. The reflection names what moved the number and what did not, so the next climb starts from it.

**Step 10.** The PR body lists each kept attempt on one line, in the order it landed, and points at the decision rows.

## Reply

The metric and target, baseline to final with the percent delta, attempts run (kept and reverted), each kept change on one line, the `.poteto/decisions.tsv` rows that record them, and the best untried idea if the climb continued.

## Source

Adapted from `skills/poteto-mode/playbooks/hillclimb.md` in pstack by Lauren Tan (cursor/plugins, MIT). Decision-trail and quality-gate mechanics from poteto-harness. Regression-gate practice from `docs/prompts/08-eslint-quality-gates-install.md` in Vibe Coding Toolkit by Matheus Gomes (MIT).
