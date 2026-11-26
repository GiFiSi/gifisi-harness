---
name: outcome-oriented-execution
title: Outcome-Oriented Execution
group: Core
applies_when: Planned rewrites and migrations. Converge on the target design; skip throwaway compatibility states.
---

# Outcome-Oriented Execution

## Rule

Optimize for the intended, verifiable end state, not for smooth intermediate states. Converge on the target design and prove it at explicit verification boundaries. Do not write temporary compatibility code that only keeps a halfway state alive.

## When it applies

- A planned rewrite or migration with explicit phase boundaries.
- You are tempted to add a shim, adapter, or dual-write path whose only job is to keep an intermediate step green.
- The plan names a target design and the open question is how to get there.

It does not apply to unplanned changes on a shared branch that others depend on, or to production systems that must stay up through every step. There, each deployed state must work.

## How to apply

1. Write the target design and its Done Predicate first: what the end state looks like and which static and runtime checks prove it.
2. Declare where temporary breakage is acceptable: which phases, which modules, for how long. Write it in the plan.
3. Move each area straight to the target shape. Skip compatibility layers that the end state will delete.
4. Keep high-signal checks running on the areas you are actively touching, so breakage stays scoped and known.
5. At plan completion, require the full verification: type check, lint, tests, and a run on the real surface. See `core/principles/prove-it-works.md`.

Worked example. A migration moves 40 modules from callback APIs to promises. The smooth path wraps every new promise API in a callback adapter so unmigrated callers keep working, then removes the adapters at the end. That is 40 adapters written to be deleted. The outcome path declares the `storage/` package broken during phase 2, converts its callers and callees together, runs that package's tests at the phase boundary, and never writes an adapter.

## Smells

- Adapters or shims with a comment saying they will be removed after the migration.
- Two code paths for the same behavior, selected by a migration flag.
- A plan where every step must pass the full suite, forcing compatibility code to exist.
- A migration that "finished" while compatibility code still ships.
- Breakage nobody declared in the plan, discovered during the migration.

## Check

Answer yes or no: does the final diff contain no code whose only purpose was to keep an intermediate state working, and did the full static and runtime verification pass at plan completion? Yes to both means the principle held.

Related: `core/principles/migrate-callers-then-delete-legacy-apis.md`, `core/playbooks/multi-phase-plan.md`.

## Source

- `skills/principle-outcome-oriented-execution/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
