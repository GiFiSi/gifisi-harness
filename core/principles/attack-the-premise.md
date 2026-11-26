---
name: attack-the-premise
title: Attack the Premise
group: Core
applies_when: Two fixes sharing one premise failed. Write the premise down and test it before a third fix.
---

# Attack the Premise

## Rule

When two or more fixes that share one premise fail the same gate, suspect the premise, not the fixes. Write the premise down and test it directly before you write another fix that assumes it.

## When it applies

- Two attempts at a bug, a flaky test, a perf target, or an eval score both failed the same check.
- Each attempt changed a different detail but rested on the same belief about the cause.
- You are about to try a third variation of the same idea.

## How to apply

1. Write the premise as one sentence: the claim every failed fix assumed. Example: "The test is flaky because the network call is slow."
2. Find an observation that would come out differently if the premise were false. Make that observation before writing code.
3. Look at the distribution of failures, not only their size. Which inputs fail, which runs, which machines, which order?
4. If the evidence contradicts the premise, list what the failures share that the premise did not predict. That shared factor is the new lead.
5. If one part always lands on the losing side, change what puts it there. Do not add a mechanism that cleans up after it.
6. Record the premise, the test, and the result in `.poteto/decisions.tsv` with `scripts/log-decision.mjs`, so the next attempt starts from evidence.

Worked example. A test fails one run in five. Fix one raises the timeout. Fix two adds a retry. Both fail. Premise: "the request is slow". Test: log the request duration on failing runs. Every failing run finished in under 50 ms, so the premise is false. The failures share one thing: they run right after a test that leaves a fake clock installed. The real fix restores the clock in that test's teardown. No timeout or retry is needed.

## Smells

- A third fix that is a variation of the first two (bigger timeout, more retries, another guard).
- A cleanup step added to undo a bad state instead of preventing it.
- Explanations of the failure that use "probably" and were never checked.
- Failure analysis that reports averages but never looks at which cases fail.

## Check

Answer yes or no: before starting the current fix, is the shared premise of the previous failed fixes written down, with the observation that tested it and its result? If two fixes have failed and the answer is no, stop and test the premise first.

Related: `core/principles/fix-root-causes.md`, `core/skills/figure-it-out/SKILL.md`.

## Source

- `skills/principle-attack-the-premise/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
