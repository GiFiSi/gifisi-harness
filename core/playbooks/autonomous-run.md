---
name: autonomous-run
title: Autonomous run
summary: Drive one task to a checkable exit condition without stopping, one verified change and one decision row per iteration, with an escape hatch for real dead ends.
skills: [show-me-your-work, figure-it-out, reflect]
principles: [never-block-on-the-human, prove-it-works, sequence-verifiable-units, make-operations-idempotent, attack-the-premise]
---

# Autonomous run

You own the exit condition. Define done, then drive to it without stopping. The human audits the decision trail later, so every iteration leaves a row that explains itself.

## When to use

- The user is stepping away ("overnight", "while I sleep", "run until done", "don't stop") and the task has an outcome a command can check.
- A long, iterative task: a migration with a countable remainder, a failing suite to drive green, a metric to reach.
- Not for a queue of independent PRs (use `core/playbooks/autopilot-full.md` or `core/playbooks/autopilot-stack.md`). Not for a goal stated only as a duration: "work on this for four hours" has nothing to check, so turn it into a predicate first.

Earn the trust before the loop: the task has been done once by hand or under watch, the agent has the checks a human would use, and each stage can stop the line when work misses the bar.

## Done Predicate

The exit condition written before the first iteration holds when its command runs against the real artifact at the final commit, and `.gifisi/decisions.tsv` has one `attempt-N` row per iteration.

Template for the signal header:

```
Done Predicate: <command> on <artifact> reports <exit condition, for example "0 old callers" or "all tests pass">; .gifisi/decisions.tsv has one attempt-N row per iteration.
```

A dead end is a valid stop only with a written handoff that names the blocker and the evidence. It is reported as not done.

## Steps

1. Write the exit condition as a predicate a command can check (tests green, repro passes, zero old callers, N PRs merged) and log it with phase `signal`.
2. Design the run's phases with `core/skills/figure-it-out/SKILL.md` and work on an isolated branch or worktree off a named base.
3. Pick the wake mechanism: an event watcher with a long heartbeat fallback when there is an event to wait on, otherwise a fixed heartbeat sized to when a re-check is worth it.
4. Each iteration, make the smallest change the evidence justifies, verify it against the predicate, commit if it advanced, and discard it if it did not.
5. Log one row per iteration with `node scripts/log-decision.mjs` (phase `attempt-N`, N counting from 1): the change, the evidence pointer, and the predicate state, per `core/skills/show-me-your-work/SKILL.md`.
6. Fix reversible discoveries that block the goal (flaky check, broken script, related bug) in their own commit or PR, then return to the predicate.
7. On a plateau, pivot the approach instead of stopping, and never relax the predicate to declare victory.
8. Stop when the predicate holds, or at a real dead end write `.gifisi/handoff.md` from `core/templates/task-handoff.md.template`, log a `handoff` row, and stop.

## Step notes

Script paths are relative to the harness home (`.gifisi/` in an installed project).

**Step 1.** A good contract has four parts: the goal, the exit condition, the permissions (for example "commit without asking"), and an escape hatch ("if truly stuck after a few hours, stop and write up why"). Write the command that checks the condition and run it once now to record the starting state. Log: `node scripts/log-decision.mjs signal "<goal>" "<why autonomous-run>" "<check command>" "<starting state>"`.

**Step 2.** A fresh worktree (`git worktree add ../<task> -b <branch> <base>`) keeps the run from colliding with other open work. Large or cross-cutting work gets its phases from `core/skills/figure-it-out/SKILL.md` before any code.

**Step 3.** If your harness has a scheduler, loop, or wake mechanism, use it. Otherwise poll in-session with a shell loop that checks the event (CI state, a merge, a ref advancing) and sleeps between checks. If your harness can spawn subagents, give a watcher the event and let it wake you; keep a long time-based heartbeat as a fallback in case the watcher dies. Make each iteration safe to repeat after a crash (`core/principles/make-operations-idempotent.md`): it reads state from the repository and the log, not from memory.

**Step 4.** One change, one check, one row. A belt-and-suspenders change that "might help" gets reverted, not left to ride. Verify each unit before the next one starts instead of batching checks at the end (`core/principles/sequence-verifiable-units.md`). Run the project's lint and tests from `.gifisi/project.json` and `node scripts/quality-gate.mjs` before each commit.

**Step 5.** Evidence is a pointer (commit, path, command and its exit code), never a paragraph. Rows are append-only; a wrong row gets a superseding row. Run `node scripts/log-decision.mjs --check` at the end.

**Step 6.** Mid-run discoveries that serve the goal are yours: broken skills, related bugs, flaky verifiers, tooling failures, fixable drift. Do not park reversible work for the human (`core/principles/never-block-on-the-human.md`). Surface only irreversible or outward-facing actions (deploys, publishing, force-pushing shared branches, deleting data, messages to people outside the run, spending money), product calls no experiment can settle, and real dead ends.

**Step 7.** A plateau means the current approach is exhausted, not the goal. If two attempts built on one premise both failed, write the premise down and test it (`core/principles/attack-the-premise.md`). Use `core/skills/reflect/SKILL.md` steps 1 to 5 to list what the last iterations taught before choosing the next approach; mid-loop you need only the lesson list, so apply nothing there and queue the fixes for the end of the run, where its unattended branch in step 7 applies.

**Step 8.** Write the handoff at `.gifisi/handoff.md`, where `core/playbooks/session-pickup.md` looks for it, and fill every field of `core/templates/task-handoff.md.template`: goal and Done Predicate, verified state, checks, pending work, blockers, next action, key files, and gotchas. A dead end names what was tried, the evidence that each attempt failed, and what would unblock it.

## Reply

- The exit condition and the command that checks it.
- Iterations run, what landed (commits), and what was discarded and why.
- Final predicate state, observed, with the command output.
- Side fixes made along the way and anything left for the human, with the reason it needs them.

## Source

- `skills/poteto-mode/playbooks/autonomous-run.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `docs/guide/07-overnight.md` from pstack, MIT.
- Continuity and handoff rules from `README.pt-BR.md` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
