---
name: interrogate
description: Adversarial review. Adversaries try to break a change or design, and a finding survives only when rerunning its command shows a failure that breaks the stated intent. Reports verified findings and applies no fixes. Works with parallel subagents or sequential lenses. Load for interrogate, adversarial review, challenge this, stress test this, find blind spots, or tear this apart.
origin: pstack
---

# Interrogate

Adversaries try to break a change or a design. A finding survives only when a run proves it. Report the findings. Do not apply fixes.

## When to use

- A finished or nearly finished change you are unsure about, before shipping.
- A contested design that is expensive to reverse, once a prototype exists to probe. An abstract plan with no code gives adversaries little to break; prototype first (`core/playbooks/prototype.md`).
- The user asks to interrogate, challenge, stress test, or tear apart a change.
- Not for style or naming review. Interrogate drops every finding a run does not prove.

## Procedure

1. **Scope.** Use what the user names. Otherwise the scope is the branch diff from its merge base with the base branch through the working tree: `git diff $(git merge-base HEAD <base>)`, plus uncommitted and untracked files.
2. **Intent.** Restate in your own words what the change is supposed to do, in two to four sentences, from the user's message, the commit messages, and the PR description. Include the behavior it must preserve. Ask the user only when the intent is genuinely unclear; the intent is the bar every finding is measured against.
3. **Lenses.** Choose 3 adversaries by default, each with a distinct lens so they find different failures. Useful lenses: input and boundary abuse; state, ordering, and concurrency; failure paths and resource cleanup; regressions in callers (use `core/skills/blast-radius/SKILL.md`); security and trust boundaries; the live surface the user touches. When the harness offers models from different vendors or families, give each adversary a different one.
4. **Isolate.** Give each adversary its own git worktree at the scope's commit (`git worktree add <dir> HEAD`) and copy the scope's uncommitted changes into it, or a copy of the project under the OS temp directory. Repros stay in that worktree, never in the user's tree (`core/principles/separate-before-serializing-shared-state.md`).
5. **Fan out.** Give each adversary the scope, the intent, its lens, its worktree path, and the brief below. Run them as described under Parallel and sequential modes.
6. **Verify.** For each finding, rerun its exact command yourself against the scope. Keep a finding only when the output shows the failure and the failure breaks the intent. Drop the rest and record why.
7. **Merge.** Combine findings that share a root cause into one, listing every adversary that found it. Do not pick one adversary's list: the verdict keeps every verified finding.
8. **Report and clean up.** Write the report to the Output contract. Log it with `node scripts/log-decision.mjs review "<verdict>" "<intent in brief>" "<finding commands>" "<verified count>/<dropped count>"` (path relative to the harness home). Remove the adversary worktrees.

### Adversary brief

> Break this change. Prove each finding with a run against the real code: a failing test, a repro script, or command output that shows the wrong behavior. For a design or plan, run a prototype or probe the current tree. Keep repros in your own worktree. Report each finding with a title, the exact command, the output it printed, and the output the intent requires. Leave out anything you did not run, including style, naming, structure, and risks that need a future change to matter. No findings is a valid result.

## Parallel and sequential modes

**Parallel.** If your harness can spawn subagents, start every adversary in one batch, in the background if supported, each with its own worktree and lens. Pass file pointers and the intent, not pasted diffs.

**Sequential.** Without subagents, run one adversary pass per lens yourself, in a fixed order:

- Write the intent and all lenses down before the first pass. Do not revise the intent between passes.
- In each pass, work only that lens. Set aside what earlier passes found so the lenses stay independent.
- Record each pass's findings with command and output before starting the next.
- Verify and merge only after every pass is done.

## Output

- **Intent**: the restatement.
- **Findings**: for each verified finding, the command, its output, the output the intent requires, how the failure breaks the intent, and the adversaries or lenses that found it. Say "no verified findings" when none survive.
- **Dropped**: for each adversary, the count of dropped findings and why (could not reproduce, did not break the intent, unrun claim).

Apply nothing. The user decides which findings to fix; read the Dropped list too, because the user can override the verdict.

## Source

Adapted from pstack `skills/interrogate/SKILL.md`, `skills/arena/SKILL.md`, and `docs/guide/04-design.md` (Lauren Tan, cursor/plugins, MIT). Vendor reviewer configuration was replaced with harness-neutral lenses and a sequential mode.
