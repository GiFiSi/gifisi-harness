---
name: swarm
description: Fan out N workers over independent slices or a declared race, collect PASS, ISSUES, or BLOCKED results with evidence, and return one consolidated report. Works with parallel subagents or one slice at a time. Load for swarm this, coverage matrices, parallel checks, gauntlets, exploration partitions, and races.
origin: pstack
---

# Swarm

Swarm buys coverage or speed by splitting work into independent briefs, running them, and returning one report. Unlike `core/skills/arena/SKILL.md`, it does not pick a base or graft. It covers slices, or it races arms under a selection rule declared before anything runs.

Open a todo list with one entry per phase (Frame, Fan out, Aggregate, Report) before launching anything.

## When to use

- Coverage: run every package, route, platform, or locale through its check.
- Gauntlets: many independent probes of one artifact.
- Exploration: partition a large search space (a codebase, a log set, a dependency tree).
- Races: N workers on identical briefs where the first pass or the best result wins.
- Not when slices share writable state that cannot be split. Separate it first (`core/principles/separate-before-serializing-shared-state.md`) or run the work in one thread.

## Procedure

1. **Done predicate.** State what the swarm must return and the condition that makes it complete, for example "every package under `<project>/packages/` has a result from its check script".
2. **Shape.** Choose partition (one worker per slice), race (N workers, identical brief), or mixed. For a race or mixed shape, declare the selection rule before spawning: `first pass`, `rank all`, or `best-of`.
3. **Workers.** Pick the number of workers and their model. When the harness offers several models and the task is a model race, name each arm's model up front. Otherwise one model for all workers keeps results comparable.
4. **Isolate writes.** Give each worker that writes its own output location: a git worktree or a directory under the OS temp directory. Read-only workers can share the tree.
5. **Pin the method.** When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method: sample count, what one sample is, and run order. The worker records both in its result.
6. **Write standalone briefs.** Each brief holds the goal, scope, exact slice or race arm, how to verify, and what to report. A worker needs nothing from the conversation.
7. **Fan out.** Run the briefs as described under Parallel and sequential modes. If a worker drops out, continue with the rest and record the dropout.
8. **Aggregate.** Read every terminal result. Drop a result that lacks the SHAs or method its brief named, and rerun that brief once. After a second miss, record a gap. A gap never counts as a pass. For coverage, every required slice needs a result. For a race, apply the declared rule and nothing else.
9. **Report.** Return one consolidated report (see Output). Do not paste raw worker output.
10. **Record.** Log the outcome with `node scripts/log-decision.mjs verify "<shape and rule>" "<done predicate>" "<report path or command>" "<pass/issues/gaps counts>"` (path relative to the harness home).

## Worker result schema

Every worker returns exactly one status:

- `PASS`: the check ran and held. Include the command and the decisive output line.
- `ISSUES`: the worker proved one or more defects. List every issue it can prove, not only the first, each with the command and its output.
- `BLOCKED`: the worker could not run the check. Include the reason and what would unblock it.

Every result also records its slice or arm, the SHAs, and the method when the brief named them.

## Parallel and sequential modes

**Parallel.** If your harness can spawn subagents, start all workers in one batch, in the background if supported, each with its standalone brief and its own output path. If the harness can run workers remotely, use that only when the worker needs nothing from the local machine.

**Sequential.** Without subagents, run the briefs yourself one at a time, in a fixed order:

- Write every brief before running the first, so later results cannot reshape earlier briefs.
- Run each slice in its own worktree or directory, record its result in the schema above, then move on. Keep only the result in context, not raw output.
- A race run sequentially loses the timing advantage. Use `rank all` or `best-of` unless the user wants the first pass, and record the run order.

## Output

One consolidated report:

- The done predicate and whether it holds.
- A result table: slice or arm, status, evidence (command and decisive line).
- Issue one-liners, grouped by root cause where several slices share one.
- Gaps and dropouts, each with the reason.
- The race rule and its winner, when a race ran.

## Source

Adapted from pstack `skills/swarm/SKILL.md` and `docs/guide/04-design.md` (Lauren Tan, cursor/plugins, MIT). Vendor model and cloud-environment settings were replaced with harness-neutral worker selection and a sequential mode.
