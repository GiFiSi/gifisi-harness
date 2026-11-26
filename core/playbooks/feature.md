---
name: feature
title: Feature
summary: Design the data shape first, add a Feature Map check and a test that fail, implement with review separation, and verify the new behavior live.
skills: [architect, arena, tdd, create-verification-skill, interrogate, how]
principles: [foundational-thinking, model-the-domain, experience-first, separate-before-serializing-shared-state, sequence-verifiable-units, prove-it-works]
---

# Feature

You own the design: plan, review, verify. The person or agent that writes the code is not the one that judges it.

## When to use

- The user asks for a capability the product does not have: a new endpoint, page, command, option, integration, or rule.
- An existing feature needs new behavior that users will observe.
- Not for restructuring without behavior change (use `core/playbooks/refactoring.md`), for a wrong result in existing behavior (use `core/playbooks/bug-fix.md`), or for work that spans many PRs (use `core/playbooks/multi-phase-plan.md`).

## Done Predicate

The new behavior is observed on the surface users touch: its Feature Map check failed before the change and passes after it, and its behavior test passes.

Template for the signal header:

```
Done Predicate: Feature Map check <feature id>/<check name> in .poteto/feature-map.json fails before and passes after; <test file> passes; lint, tests, and the 350-line gate pass.
```

A feature with no live surface (a library function) uses its public API test as the observation and says so.

## Steps

1. Trace the affected subsystem with `core/skills/how/SKILL.md`: entry points, data shapes, callers, and the project docs the change touches.
2. Shape the design with `core/skills/architect/SKILL.md`, choosing the data model (state machine, table, typed model) before any logic, and log the choice with phase `design`.
3. Write the throughput checkpoint as four todo items: blocking first steps, independent workstreams, shared mutable state, smallest safe decomposition; mark a dimension `n/a: <reason>` instead of dropping it.
4. Add the new behavior to `.poteto/feature-map.json` per `core/skills/create-verification-skill/SKILL.md`, run `node scripts/verify-feature-map.mjs`, and observe the new check fail.
5. Write a behavior test per `core/skills/tdd/SKILL.md`, run it, observe it fail for the missing behavior, and log phase `failing-test`.
6. Implement in small units with review separation: delegate the code (through `core/skills/arena/SKILL.md` when valid shapes compete) and review every diff yourself; log phase `implement`.
7. Run the test, the project's lint and tests from `.poteto/project.json`, `node scripts/quality-gate.mjs`, and the Feature Map; observe all pass and log phase `verify`.
8. If the design is contested or a reviewer disagrees, stress it with `core/skills/interrogate/SKILL.md` before shipping and log the outcome.
9. Rebase into small ordered commits that each end in a passing check, then run `core/playbooks/opening-a-pr.md`.

## Step notes

Script paths are relative to the harness home (`.poteto/` in an installed project). Log rows with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`.

**Step 1.** Read `PRODUCT.md` and the one `docs/` file the change touches (usually architecture or design). Name every caller of the code you will change. If a requirement lands in an existing design, ask what the design would be had the requirement existed on day one (`core/principles/redesign-from-first-principles.md`).

**Step 2.** Settle types and data first (`core/principles/foundational-thinking.md`, `core/principles/model-the-domain.md`): a state machine over scattered booleans, a table or registry over branching, a typed model over repeated shape assumptions, parsed at the boundary. When product tradeoffs appear, pick what the user feels (`core/principles/experience-first.md`).

**Step 3.** The four items:
- **Blocking first steps.** Gates that run before any fan-out: schema, shared types, the failing checks.
- **Independent workstreams.** Disjoint files, services, or layers can run in parallel. Shared writes serialize.
- **Shared mutable state.** Split the target before adding locks (`core/principles/separate-before-serializing-shared-state.md`). Serialize only for a real invariant.
- **Smallest safe decomposition.** If one worker is best, say why.

Code-coupled work (one feature) goes to a single owner who fans out only after the blocking phase. Rewrite the checkpoint at phase boundaries.

**Step 4.** Each check names a request or command and the exact observation (`status`, `json` key paths, `bodyIncludes`, `exitCode`, `stdoutIncludes`). See `core/templates/poteto/feature-map.example.json` for the schema. A check that passes before the feature exists is testing the wrong thing; fix the check.

**Step 5.** Assert observable behavior, not internals (`core/principles/test-behavior-not-implementation.md`). The failure message must point at the missing behavior, not at a typo or import error.

**Step 6.** If your harness can spawn subagents, give the implementer a specific scope: file paths, the named data shape from step 2, and the failing test and Feature Map check as success criteria. When the implementation admits several valid shapes (error handling, abstraction layer, test structure), run `core/skills/arena/SKILL.md` so competing runners surface alternatives and a separate judge picks. Without subagents, write the code yourself and review it in a separate pass against the step 2 design. Port improvements to shared primitives to every consumer and verify each. Commit each unit once its check passes.

**Step 7.** Use the commands in `.poteto/project.json`; do not guess them. Wrong-surface or inconclusive results are not a pass; report them as such. A repeated mistake class goes to `core/skills/correct/SKILL.md`.

**Step 8.** Contested means two reasonable reviewers would pick different designs, or the change sets a precedent other code will copy.

**Step 9.** Order commits so each one builds and passes on its own (`core/principles/sequence-verifiable-units.md`). Stack follow-ups as separate PRs rather than growing this one.

## Reply

- What you built and how a user reaches it.
- What you chose and why, with a table when you compared design alternatives.
- The throughput checkpoint as written.
- Verification: Feature Map output before and after, test output, lint and gate results.
- Open decisions and parked follow-ups.

## Source

- `skills/poteto-mode/playbooks/feature.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `docs/guide/06-verify-and-ship.md` from pstack, MIT.
- Feature delivery and quality-gate practice from `README.pt-BR.md` and `docs/` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
