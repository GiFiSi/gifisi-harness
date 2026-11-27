---
name: sequence-verifiable-units
title: Sequence Work into Verifiable Units
group: Verification
applies_when: Multi-step work and commit stacks. Small units that each end in a check, verified before the next.
---

# Sequence Work into Verifiable Units

## Rule

Order work as small units that each end in a state you can check. Do not start the next unit until the current one is green. Deliver the units in the order that proves the work to a reviewer.

## When it applies

- Sweeps, migrations, and runs of similar edits across many files.
- Any plan with more than one step, including a playbook's todo list.
- Stacking commits or pull requests.
- Edits made by a codemod, script, or subagent rather than by hand.

## How to apply

1. **Bracket each unit.** Start from a known-good state, make one change, run the check, then proceed. The check is a command with a pass or fail result: type check, test, lint, or a live probe.
2. **Keep units small enough to bisect.** If a unit fails, the cause must be inside that unit. One file group, one caller group, one behavior.
3. **Run the per-unit check even when a tool did the edit.** A codemod that touched 40 files still needs the type checker before the next batch.
4. **Stop on red.** A failed check means fix or revert this unit. Do not stack the next change on top of a broken state.
5. **Order delivery to prove itself.** The failing test before the fix. The subtraction before the reshape. The baseline measurement before the treatment. Each commit builds and passes on its own.
6. **Log the boundary.** Record each completed unit with `node scripts/log-decision.mjs` so `.gifisi/decisions.tsv` shows what was verified and when.

Worked example. Renaming `price` to `priceCents` across 60 files in one pass produced 200 type errors and no clear starting point. Sequenced:

```text
unit 1: add priceCents to the model, keep price          -> tsc ok, tests ok
unit 2: migrate src/cart/* (14 files)                     -> tsc ok, tests ok
unit 3: migrate src/checkout/* (19 files)                 -> tsc ok, 1 test red -> fix rounding -> ok
unit 4: migrate the rest (27 files)                       -> tsc ok, tests ok
unit 5: delete price from the model                       -> tsc ok, rg "\.price\b" = 0
```

The rounding bug surfaced inside a 19-file unit, not in a 60-file diff. Each commit is reviewable alone.

## Smells

- One commit that mixes a refactor, a fix, and a feature.
- Running the tests only at the end of a long session.
- "I will fix the type errors after the rest of the migration."
- A stack where a middle commit does not build.
- A fix commit placed before the test that shows the bug.

## Check

Answer yes or no: does every unit of this work end in a check that ran and passed before the next unit started, and does each commit build and pass on its own? Yes means the principle held.

Related: `core/principles/prove-it-works.md`, `core/principles/migrate-callers-then-delete-legacy-apis.md`, `core/skills/tdd/SKILL.md`.

## Source

- `skills/principle-sequence-verifiable-units/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
