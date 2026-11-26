---
name: figure-it-out
description: Design an auditable workflow when no narrower playbook fits, such as a large migration, an ambitious multi-part change, or unattended work a human reviews later. Frames a falsifiable predicate, sizes rigor to the risk, runs each unit as an experiment, and keeps the decision trail. Load with the multi-phase plan, autonomous run, or autopilot routes.
origin: pstack
---

# Figure it out

When the task matches no playbook, design one. The first deliverable is the workflow itself, before any code: a sequence of phases that scales rigor to the task, runs each change as an experiment, and leaves a decision trail a human can audit after stepping away.

## When to use

- The router found no route, or the work is large, cross-cutting, or unattended.
- The multi-phase plan route (`core/playbooks/multi-phase-plan.md`), the autonomous run route (`core/playbooks/autonomous-run.md`), and the autopilot routes.
- A migration across many packages, a rewrite, or a program of work with several landable units.
- Not for a task one playbook already covers. Use that playbook.

## Procedure

1. Start the todo list. Its first item is to read the principles index in the router and open `core/principles/prove-it-works.md`, `core/principles/sequence-verifiable-units.md`, and `core/principles/foundational-thinking.md`. Then add phases A to E below as todos.
2. Phase A, frame. Ground in the code first, then commit to a frame. Do not start the run until you can state:
   - The definition of done as a falsifiable predicate on the real artifact, per `core/principles/prove-it-works.md`.
   - Scope, quantified: rough units and effort, plus the blockers grounding found.
   - The rigor level, biased high. One-way doors and a high blast radius get more gates. Reversible low-stakes steps get fewer. Rigor means gates and artifacts, not effort.
3. Present the frame and its tradeoffs before a long run. Reversible work proceeds without waiting, per `core/principles/never-block-on-the-human.md`, but a multi-hour run gets one checkpoint with the user. Log the frame as a `frame` row.
4. Phase B, design the workflow. Split the work into atomic units that each land on their own. Order them riskiest unknown first. Build the scaffold and the verification before the features.
   - Build the verification before the work and capture the baseline from the pre-change state, so every check reads as old value against new value. Add live checks to `.poteto/feature-map.json` when the artifact is a running app.
   - For one-way-door design decisions, load `core/skills/architect/SKILL.md`, which can run `core/skills/arena/SKILL.md`. Skip it for mechanical work whose shape is already clear. A second arena over a settled design is waste, per `core/principles/laziness-protocol.md`.
   - Decide what fans out. Parallelize only across real seams, and give each worker its own branch or worktree, per `core/principles/separate-before-serializing-shared-state.md`. If your harness cannot spawn subagents, run the units in sequence. Do not over-fan.
   - Write the designed phase list down. That list is what the human reviews. Log it as a `design` row with the file that holds it.
5. Add the designed steps to the todo list as concrete items between the Phase C and Phase D entries. Run each under the Phase C discipline and log a row as each step lands, not at the end.
6. Phase C, run the loop. Each unit is an experiment. State the hypothesis, make the smallest change, measure against the predicate on the real artifact, keep the change if it moved the predicate, revert it if it did not. Verify each unit before starting the next, per `core/principles/sequence-verifiable-units.md`.
   - Verify by inspecting the artifact, never a self-report. When something passes too easily, suspect the check before the system.
   - Pair delegated work with a judge. If a worker games the gate, reset its work and tighten the contract. If the gate itself is wrong, fix the gate in its own change instead of routing around it.
   - Every verdict is `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`. Inconclusive is not a pass. Do not hide a negative result.
7. Phase D, keep the audit trail. Log the run through `core/skills/show-me-your-work/SKILL.md` into `.poteto/decisions.tsv` with `node scripts/log-decision.mjs`. This kind of work is usually large enough that the trail should be committed with the change.
8. Phase E, verify and hand back. Check the whole result against the Phase A predicate on the real product, not only on the verification you built. Run `node scripts/log-decision.mjs --check` and the project's lint, tests, and quality gate (`node scripts/quality-gate.mjs` when the project has no ESLint max-lines rule).
9. Encode recurring corrections from the run as structure through `core/skills/correct/SKILL.md`: a type, a lint rule, a test, or a script, per `core/principles/encode-lessons-in-structure.md`.

## Output

- The workflow you designed: the phases and the unit list.
- The rigor level and why.
- The decision trail path and its `rows=N` count.
- What is verified against the predicate, each with `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE` and its evidence.
- What is still open.
- The `Attention` section required by `core/skills/show-me-your-work/SKILL.md`.

## Source

Adapted from pstack `skills/figure-it-out/SKILL.md` and `docs/guide/07-overnight.md` (Lauren Tan, cursor/plugins, MIT).
