---
name: perf-issue
title: Perf issue
summary: Fix one performance problem with a measured baseline, a traced cause, and a measured post-fix number on the same command.
skills: [benchmark-checklist, how, architect]
principles: [explain-the-number, prove-it-works, fix-root-causes, build-the-lever, sequence-verifiable-units, laziness-protocol]
---

# Perf issue

## When to use

Use this playbook when something is too slow, uses too much memory, or does not keep up: a slow page, a slow endpoint, a slow build, a memory leak, low throughput. You own the measurement story. Every fix is tied to a measurement; reading source instead of measuring does not count.

For sustained improvement of a metric over many attempts, use `core/playbooks/hillclimb.md`. For a wrong result, use `core/playbooks/bug-fix.md`.

## Done Predicate

The same measurement command `<command>` shows the post-fix median at or below `<target>` against a recorded baseline on the same workload, and the project's tests, lint, and live checks still pass.

Template:

- Artifact: the slow surface (endpoint, page, CLI, build) measured by one repeatable command, plus the regression gate.
- Observation: baseline and post-fix medians with sample count and spread, the percent delta, and the profile or trace that shows the cost moved.
- A number from the wrong surface, a cold run compared with a warm one, or a delta inside the noise is `INCONCLUSIVE`, not a pass.

## Steps

1. Reproduce the slowness on the surface the user uses and name the metric, the workload, and the target; if it does not reproduce, report that with the measurement instead of fixing.
2. Build one repeatable measurement command (warm-up separated, median of N, spread printed), capture the baseline, vet it with `core/skills/benchmark-checklist/SKILL.md`, and log a `baseline` row.
3. Profile the hot path and trace it with `core/skills/how/SKILL.md`; explain what limits the number before choosing a fix.
4. Rank candidate fixes by the performance mantras, cheapest first, and pick the earliest one that can meet the target.
5. If the fix crosses a function or module boundary, shape it with `core/skills/architect/SKILL.md` first; otherwise make the smallest change that removes the cost.
6. Measure each attempt with the same command, keep or revert it on the number, and log an `attempt-N` row with before and after medians via `scripts/log-decision.mjs`.
7. Run the regression gate: tests and lint from `.gifisi/project.json`, `node scripts/quality-gate.mjs`, and `node scripts/verify-feature-map.mjs` when `.gifisi/feature-map.json` exists.
8. Compare baseline and post-fix artifacts side by side, mark noisy or wrong-surface results inconclusive, and log a `verify` row with the final delta.
9. Open the PR with `core/playbooks/opening-a-pr.md`, citing the command, baseline, post-fix number, and delta under Verification.

## Step notes

Script paths are relative to the harness home: `.gifisi/` in an installed project, the global harness home (for example `~/.gifisi-harness/`) when only a global install exists, the repository root here. Run them as `node "<harness-home>/scripts/<name>.mjs"` from the project root, so `.gifisi/decisions.tsv` lands in the project.

**Step 1.** Measure where the user feels it: page load in a browser, request latency through the real server, the build command the team runs. A micro-benchmark of one function is a proxy; use it only after the end-to-end number confirms that function matters (`core/principles/prove-it-works.md`).

**Step 2.** The command is the lever a reviewer reruns (`core/principles/build-the-lever.md`). Pin inputs and data size. Separate cold and warm runs and say which one the target is about. Run enough samples that the spread is smaller than the change you hope to see.

**Step 3.** Do not claim a ceiling without running it. Find what actually limits the number: CPU in one function, waiting on I/O, lock contention, allocation and GC, repeated work, payload size. Rule out measuring the wrong thing: a cache that hides the cost, a debug build, a logging flag (`core/principles/explain-the-number.md`).

**Step 4.** The performance mantras, cheapest first:

1. Don't do it. Stop work whose result nothing uses.
2. Do it, but don't do it again. Cache or reuse the result.
3. Do it less. Smaller inputs, fewer passes, narrower queries.
4. Do it later. Defer work off the critical path.
5. Do it when they're not looking. Move it to idle time or the background.
6. Do it concurrently. Overlap independent work.
7. Do it cheaper. A faster algorithm or data structure.

When an earlier mantra meets the target, stop there. A fix that deletes work usually beats a fix that speeds it up (`core/principles/laziness-protocol.md`).

**Step 5.** Fix the cause, not the symptom: a timeout bump or a spinner is not a perf fix (`core/principles/fix-root-causes.md`). If your harness can spawn subagents, delegate the implementation with a tight scope and review the diff.

**Step 6.** One change per measurement (`core/principles/sequence-verifiable-units.md`). A change that does not move the number past noise is reverted, even if it looks like it should help. Log example: `node scripts/log-decision.mjs attempt-1 "batch subscriber lookup" "N+1 query per notification" "node bench/notify.mjs: 840ms -> 95ms median of 20" "kept -88.7%"`.

**Step 7.** A faster path that returns a different result is a regression. The live Feature Map checks confirm the surface still behaves.

**Step 8.** Keep the raw outputs (profiles, timing JSON) at a path you can cite. Diff them; do not eyeball two screenshots of numbers.

**Step 9.** The PR names the command so a reviewer can reproduce the number.

## Reply

The baseline number, the post-fix number, the delta, the command that produced both, the cause in one sentence, and the artifact path. Say plainly if any number is inconclusive.

## Source

Adapted from `skills/poteto-mode/playbooks/perf-issue.md` in pstack by Lauren Tan (cursor/plugins, MIT). Quality-gate step from `docs/prompts/08-eslint-quality-gates-install.md` in Vibe Coding Toolkit by Matheus Gomes (MIT).
