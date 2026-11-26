---
name: bug-fix
title: Bug fix
summary: Reproduce the bug on the real surface, prove the root cause with runtime evidence, land a failing test before the smallest fix, and verify on the same surface.
skills: [why, tdd, blast-radius, architect, how]
principles: [fix-root-causes, prove-it-works, sequence-verifiable-units, attack-the-premise, test-behavior-not-implementation]
---

# Bug fix

You own this task: plan, review, verify. Be scientific. Every shipped line traces to runtime evidence. A change that "might help" is a hypothesis, not a fix, and it does not ship. When evidence refutes a hypothesis, revert what it motivated.

## When to use

- Something that used to work is broken, returns a wrong result, crashes, or throws.
- A user, test, monitor, or Feature Map check reports behavior that contradicts the spec or `PRODUCT.md`.
- Not for slowness (use `core/playbooks/perf-issue.md`), intermittent production-only failures with no local repro yet (use `core/playbooks/runtime-forensics.md`), or a missing capability (use `core/playbooks/feature.md`).

## Done Predicate

The original reproduction, run on the same surface where the bug appeared, now shows the expected behavior, and a regression test that failed before the fix passes after it.

Template for the signal header:

```
Done Predicate: <repro command or Feature Map check id> on <surface> returns <expected> instead of <observed>; <test file> fails on the parent commit and passes on the fix commit.
```

Unit tests alone are not the predicate. They show branch behavior, not that the bug is gone on the surface the user touches. A result you could not observe is `INCONCLUSIVE`, never a pass.

## Steps

1. Reproduce the bug yourself on the surface the user uses (Feature Map check, CLI run, HTTP request, UI flow), save the failing output, and log phase `reproduce`.
2. Binary-search the cause: list candidate hypotheses, seed them with `core/skills/why/SKILL.md` history, and eliminate them with runtime evidence until one mechanism survives.
3. Write the root cause as one sentence naming the first wrong state and its `file:line`, log phase `root-cause`, and if the fix crosses a function boundary, shape it with `core/skills/architect/SKILL.md` first.
4. Add a behavior test that reproduces the bug, run it, observe it fail for the stated reason, and log phase `failing-test`.
5. Fix the root cause with the smallest change the evidence justifies, revert anything a refuted hypothesis motivated, and log phase `fix`.
6. Rerun the failing test and the original reproduction on the same surface, observe both pass, and log phase `verify` with the command and result.
7. Check what else the fix can break with `core/skills/blast-radius/SKILL.md`, then run the project's lint and tests from `.poteto/project.json` and `node scripts/quality-gate.mjs`.
8. Commit the failing test before the fix so history shows red then green, then run `core/playbooks/opening-a-pr.md` if the change ships as a PR.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the repository root here. Log a row with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`. Evidence is a pointer (path, `file:line`, command, commit), never a paragraph.

**Step 1.** Drive the real surface yourself, even when a debugging protocol says to ask the user to reproduce. If the project has `.poteto/feature-map.json`, run `node scripts/verify-feature-map.mjs` and keep the failing row. If no check covers the behavior, add one (see `core/skills/create-verification-skill/SKILL.md`) so the same check proves the fix in step 6. Ask the user only with a specific reason the surface cannot be reached, and only after driving it as far as it goes. If the bug will not fire, synthesize the trigger, tighten conditions, or add instrumentation until it does.

**Step 2.** Each pass, take the split that removes the most remaining problem space: input versus code, this commit versus its parent (`git bisect run <check>` when history has a good point), this layer versus the next. When program state is unclear, add logging and read it while the code runs; do not guess. Use `core/skills/how/SKILL.md` to trace an unfamiliar subsystem. If two fixes built on the same premise already failed, stop and test the premise itself (`core/principles/attack-the-premise.md`).

**Step 3.** The first wrong state is where correct input first becomes incorrect data. A guard downstream of it is not a fix (`core/principles/fix-root-causes.md`). Common root causes: a missing parse at a system boundary, a wrong default, a shared mutable value, an unhandled branch. Log the chosen mechanism and the rejected ones with phase `root-cause`.

**Step 4.** Follow `core/skills/tdd/SKILL.md`. Assert what a user observes (`core/principles/test-behavior-not-implementation.md`), so the test fails only when this behavior breaks. Confirm the failure message matches the mechanism from step 3; a test that fails for another reason proves nothing. Skip the test only when it would need heavy integration setup with no cheap local path, and record that choice and the live check that replaces it.

**Step 5.** One mechanism, one fix. Delete instrumentation added in step 2 unless it earns a place as a permanent log line. If your harness can spawn subagents, delegate the implementation with a narrow scope (files, root cause sentence, the failing test as success criterion) and review the diff yourself; otherwise do it inline and review it as a separate pass.

**Step 6.** "It compiles" and wrong-surface results are not a pass. Paste the failing output from step 1 next to the passing output now. If the live check cannot run, report `INCONCLUSIVE` with the reason.

**Step 7.** Use the commands recorded in `.poteto/project.json`; do not guess them. `node scripts/quality-gate.mjs` enforces the 350-line limit when the project has no ESLint max-lines rule. If the same mistake class has now happened twice, climb the correction ladder with `core/skills/correct/SKILL.md`: a structural fix first, then a lint or test, then a row in `.poteto/corrections.md`.

**Step 8.** Two commits at minimum: the failing test, then the fix (`core/principles/sequence-verifiable-units.md`). Each commit ends in a check you ran.

## Reply

- What was broken, in one sentence a user would recognize.
- Root cause with `file:line`, and the hypotheses you eliminated.
- The fix and why it is the smallest change the evidence justifies.
- Verification: the failing-then-passing repro output and test output, pasted verbatim.
- Blast radius result and the lint, test, and quality-gate results.

## Source

- `skills/poteto-mode/playbooks/bug-fix.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `docs/guide/06-verify-and-ship.md` from pstack, MIT.
- Working agreements and quality gates from `README.pt-BR.md` and `docs/` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
