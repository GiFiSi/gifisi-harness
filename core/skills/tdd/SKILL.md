---
name: tdd
description: Make broken or missing behavior executable before changing production code. Write the smallest test that fails for the intended reason, watch it fail, fix or implement, watch it pass. Load for bug fixes and new behavior with a cheap local test path, or when the user asks for a failing or regression test.
origin: pstack
---

# TDD

Make the broken or missing behavior executable before you change production code. The goal is one focused test that fails before the change and passes after it.

## When to use

- A bug with an obvious, cheap local test target: a unit, module, request handler, or CLI command already covered by the project's test runner.
- New behavior in the feature route, where a test can state the intended behavior before the code exists.
- The user asks for TDD, a failing test, or a regression test.
- Skip it when the test path is unclear, expensive, or integration-heavy and nobody asked for it. Use the closest executable check instead (see "When a failing test is impractical").

## Procedure

1. Understand the behavior. Write down the intended behavior, the current behavior, the affected path, and the smallest observable reproduction. For a bug, reproduce it first on the real artifact.
2. Choose the narrowest executable check. Prefer the closest test style the project already uses for that code path. Read `.poteto/project.json` for the test command instead of guessing it. If no practical test path exists, do not build a test rig from scratch to satisfy this skill.
3. Write the failing test first. Add the smallest test that would have caught the bug or that states the new behavior. Assert what a user or caller observes, per `core/principles/test-behavior-not-implementation.md`, not the current implementation.
4. Run the new test before touching production code. Confirm it fails, and that it fails for the intended reason: the wrong value or the missing behavior, not an import error, a typo, or a broken fixture. If it passes, or fails for another reason, fix the test or the reproduction first.
5. Log the observed failure: `node scripts/log-decision.mjs failing-test "<test name>" "<behavior it pins>" "<test file and command>" "fails: <assertion message>"`.
6. Make the smallest production change that satisfies the intended behavior while keeping nearby contracts. For a bug, fix the root cause per `core/principles/fix-root-causes.md`. A guard around the symptom is not a fix.
7. Rerun the new test and confirm it passes. Then run the surrounding suite with the project's test command to catch collateral breakage.
8. Check the real artifact when the change is user-visible: run the live check from `.poteto/feature-map.json` with `node scripts/verify-feature-map.mjs` (installed as `.poteto/scripts/verify-feature-map.mjs`), or the closest real command.
9. Log the result: `node scripts/log-decision.mjs verify "<test name> passes" "<why this proves it>" "<command>" "<pass counts>"`.

## When a failing test is impractical

Use the closest executable regression check: a targeted script, a reproduction command, browser automation, a snapshot comparison, a log assertion, or a focused integration check. Record why a test was impractical.

Prefer no new test over a bad test. A bad test mostly tests mocks, encodes implementation details, depends on timing or unrelated global state, needs expensive infrastructure for a small change, or would be deleted right after proving the fix.

## Guardrails

- Never change a test to match a wrong implementation.
- Never weaken an existing assertion unless the expected behavior changed on purpose, and say why.
- Keep the test focused on the one behavior. No broad fixture churn and no unrelated coverage.
- A flaky bug gets a deterministic test where possible. Name the signal the test locks down.
- When the bug reveals a class of failures, land the focused regression test first, then consider sibling coverage as a separate step.
- Existing tests in a brownfield project stay. Add next to them in the same style.

## Output

- The failing-before test or check, the command, and the failure it produced.
- The passing-after run of that test and of the surrounding suite, with counts.
- The live check result when the change is user-visible.
- If failing-before evidence could not be shown, why, and which check was used instead.

## Source

Adapted from pstack `skills/tdd/SKILL.md` and `docs/guide/05-build-and-clean.md` (Lauren Tan, cursor/plugins, MIT).
