---
name: maintain-formal-verification-skill
description: Bring a project's formal checks back in line with the code after it changed. Find the commits since the sync commit that touched covered code, update the model, explorer, or property to describe the code as it is now, rerun, prove the check can still fail, and say whether each failure is drift in the check or a bug in the code. Load after merges or refactors that skipped the check.
origin: pstack
---

# Maintain a formal verification skill

A formal check proves a property of what it describes. When the code changes and the check does not, the check can keep passing while it describes code that no longer exists. That pass is the dangerous case, because it looks like a proof. This skill is the upkeep loop for the checks that `core/skills/create-formal-verification-skill/SKILL.md` leaves behind, or for any project check that runs a model checker, prover, or exhaustive explorer against named code.

## When to use

- Covered code changed through merges, refactors, or edits made without rerunning the check.
- A scheduled pass, before a release, over every `<project>/.gifisi/verify/formal-*.md` notes file.
- The user asks whether a model is still true to the code.
- Not when no formal check exists yet. Stop and use `core/skills/create-formal-verification-skill/SKILL.md`.

## Procedure

1. Find the checks. Read every `<project>/.gifisi/verify/formal-*.md`, or the one the user named. If the project keeps checks elsewhere, find them by what they do: a TLA+ or Alloy model, or a test that explores states or generates inputs against named code. For each, collect the property, the covered files and functions, the bounds and assumptions, the run command, and the sync commit. If no sync commit is recorded, use the last commit that changed the check files, and say so.
2. Fix the outcome vocabulary and give each check exactly one at the end: **in sync** (no change since the sync commit alters what the check describes, and it passes), **updated** (the check now describes the changed code and passes), **bug** (the check describes the current code and the code breaks the property), or **blocked** (the check could not be brought back in line or could not run; say why). A check can be both updated and bug.
3. Fix the scope. Edit only models, explorers, property tests, and the notes. Never edit product code unless the user asks. Never weaken a property or a model to make a failing check pass.
4. Run each check as it is, before changing anything, and record the result. A pass tells you only that the old description still holds. A failure can be drift or a bug. Do not decide which until step 7.
5. Read every change to covered code. Run `git log --oneline <sync>..HEAD -- <covered paths>` and `git diff <sync>..HEAD -- <covered paths>`, and read each commit message. Look for moved code too: a covered function that was renamed, split, or moved is still covered (`git log --follow`, `git log -S "<name>"`). Look for new code that writes the state a check guards. Classify each change as: no effect (verified against the model, not the commit message); the check no longer describes the code (a step split in two, a branch added or removed, a new path to the guarded state, a value with a new range); the promise changed on purpose (cite the doc comment, test, changelog, or commit message that says so); or the promise may be broken (no evidence of intent).
6. Update from the code, not from the result. Change the model or explorer so every changed part again points to code a reviewer can open, and keep one indivisible code step as one step in the check. Write the update before you rerun. Change a property only for a promise that changed on purpose, and record the old wording, the new wording, and the evidence. Keep the bounds unless the change makes them wrong; report any reduction.
7. Rerun and judge each result. On a pass, break the new code the way the property guards against (remove a new guard, reorder a new step) and confirm the check catches it, then drop the break. On a failure, replay the trace against the real code step by step. If a step cannot happen in the code, the check is wrong: fix it and say what was wrong. If every step can happen, it is a bug: name the commit that introduced it (`git bisect run` with the check command when the history is long), tell the trace in the code's words, and state the harm in one sentence. A cheap reproduction against the real code goes in the report, not in product code.
8. Update the notes: covered files and functions, commands, bounds, assumptions, tool versions, and the sync commit set to the commit you checked. Do not move the sync commit for a blocked check. Follow the notes once as the next agent would, so you know the steps still run.
9. Ship the check updates as their own change, separate from any product fix, and log each check with `node scripts/log-decision.mjs verify "formal check <area> <outcome>" "<commits read>" "<rerun result and the break it caught>" "<outcome>"`.

## Output

For each check:

- The outcome and the commits you read.
- What changed in the check and why: the code changed shape, or the promise changed on purpose, with its evidence.
- The rerun result and the break you used to show the updated check can still fail.
- Each bug in plain words: the trace as steps in the code's names, the harm, and the introducing commit.
- What the check still does not cover, including new code it should cover.

Say outright which failures were drift in the check and which were bugs in the code. For a check that passed before the update and fails after, say that the old pass was on a stale description.

## Source

Adapted from pstack `skills/maintain-formal-verification-skill/SKILL.md` (Lauren Tan, cursor/plugins, MIT). The `.gifisi/verify/` layout and decision logging are gifisi-harness additions.
