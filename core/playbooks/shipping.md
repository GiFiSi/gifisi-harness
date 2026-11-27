---
name: shipping
title: Shipping
summary: Land a PR or a stack of PRs bottom-up, merging only the contiguous run that an independent verifier passed on its current patch, and confirm each merge by reading it back.
skills: [blast-radius, show-me-your-work]
principles: [prove-it-works, sequence-verifiable-units, make-operations-idempotent, separate-before-serializing-shared-state]
---

# Shipping

You own what lands. Verify each PR independently, land only the verified run from the bottom, then keep your hands off the stack while it lands.

Merging changes shared history and is hard to undo. Run this playbook only when the user asked to merge, land, ship, or release. Use the `gh` CLI and plain git. Never bypass branch protection (`gh pr merge --admin`), never force-push the trunk, and never merge a PR whose checks are red.

## When to use

- The user asks to merge, land, or ship one PR or a stack of PRs that are already open.
- A release needs its PRs landed in order.
- Not for opening the PR (`core/playbooks/opening-a-pr.md`), for fixing CI or review comments on an open PR (`core/playbooks/babysit.md`), or for building a stack from a plan (`core/playbooks/autopilot-stack.md`).

## Done Predicate

Every PR in the verified run reads back as merged into the trunk with `gh pr view`, each carried a PASS verdict from a verifier that did not write it on the patch that landed, and the run stopped at the first unverified PR.

Template for the signal header:

```
Done Predicate: gh pr view <pr> --json state,mergedAt,baseRefName shows MERGED into <trunk> for PRs <bottom..ceiling>; each has a PASS verdict on its landed patch (git patch-id match); <next PR> left open as the ceiling.
```

## Steps

1. Confirm the user asked to merge, list the PRs bottom-to-top with `gh pr list` and `gh pr view <pr> --json number,headRefName,baseRefName,state,mergeable`, and name the trunk.
2. Get an independent verdict per PR: a reviewer or agent that did not write it runs the change as a user would, parent against head, and posts PASS, PASS+NOTES, or FAIL on the PR.
3. Find the run: walk up from the lowest unmerged PR and stop at the first one without PASS or PASS+NOTES; the PRs below it are the run and the top one is the ceiling.
4. Recheck that each verdict still covers the code: compare `git patch-id` of the verdict commit with the current head, and re-verify any PR whose patch changed.
5. Merge the lowest unmerged PR of the run with `gh pr merge <pr> --squash` once `gh pr checks <pr>` is green, then read it back with `gh pr view <pr> --json state,mergedAt,baseRefName`.
6. Retarget the next PR to the trunk with `gh pr edit <pr> --base <trunk>`, rebase its patch onto the merge result, push with `--force-with-lease`, and apply step 4 before merging it.
7. Leave the stack alone while it lands: watch with `gh pr checks <pr> --watch`, change no branch except step 6's move, and diagnose any stall before acting.
8. Stop at the ceiling, log phase `ship` with the merged PRs and their read-back results, and report what the next PR needs to join a new run.

## Step notes

Script paths are relative to the harness home: `.gifisi/` in an installed project, the repository root here. Log a row with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`.

**Step 1.** A single PR is a stack of one; every step still applies. Find the trunk with `gh repo view --json defaultBranchRef` and check it against the bottom PR's base. If the forge is not GitHub or `gh` is not authenticated, stop and say which tool is missing; do not invent a merge path.

**Step 2.** Only a verdict from someone who did not write the code counts, because an author checks what it meant to build. If your harness can spawn subagents, give each PR to a fresh one with the PR number, the Feature Map checks that cover it, and the instruction to run them parent versus head (`node scripts/verify-feature-map.mjs` on each checkout); otherwise ask the user or a reviewer for the verdict. Green CI and an approving bot review are not verdicts: neither runs the change the way a user would (`core/principles/prove-it-works.md`). Post the verdict as a PR comment (`gh pr comment <pr> --body "PASS: <checks run, results>"`) so it is auditable. `core/skills/blast-radius/SKILL.md` tells the verifier what else to exercise.

**Step 3.** A verified PR above an unverified one waits, because it cannot land without the code below it. A PR whose branch neither holds nor needs that code can move onto the trunk and land on its own, but it needs a fresh verdict first: its old one ran with code beneath it that the trunk does not have.

**Step 4.** A verdict covers a patch, not a SHA. A chain rebase moves every PR above it to a new SHA without failing any check. Run `git diff <parent>..<verdict-sha> | git patch-id --stable` and the same on the current head. Equal ids mean the verdict stands. When the patches differ only in tests, docs, or lint config, a lane's result can stand if what it ran builds the same at both SHAs apart from noise (a difference that also appears between two builds of the verdict SHA, or an embedded commit SHA); name the noise and its files so a reader can check the call. Anything else that drifted gets a fresh verdict.

**Step 5.** Always merge the lowest unmerged PR of the run. A PR whose base is still its parent's branch merges into that branch, not the trunk, so check `baseRefName` first. A merge command can report success when a merge queue only queued the PR, and a requested auto-merge is not a merge: the read-back must show `MERGED` with the trunk as base. Arm `gh pr merge --auto` only on a PR whose verdict covers its current head, because auto-merge lands whatever head is ready. Merging the same PR twice is a no-op; read back before retrying (`core/principles/make-operations-idempotent.md`).

**Step 6.** After the merge, the next PR's base branch may be deleted or stale. `git fetch origin`, `git rebase --onto origin/<trunk> <old-parent-tip> <branch>`, then `git push --force-with-lease origin <branch>`. The lease protects anyone else's pushes. Step 4's patch-id rule decides whether the verdict survives the move.

**Step 7.** A merge lands whatever its branch and base hold at that moment, verdict or not, so no other edits happen during the landing (`core/principles/separate-before-serializing-shared-state.md`). A base that moves to the trunk when its parent merges is expected, not damage to repair. If a merge stalls (required review missing, queue rejected, conflict), read `gh pr view <pr> --json mergeStateStatus,statusCheckRollup` and report the cause before changing anything.

**Step 8.** Extending the run needs new verdicts, which is a new pass through step 2 (`core/principles/sequence-verifiable-units.md`). `core/skills/show-me-your-work/SKILL.md` describes the evidence each merged PR's report should cite.

## Reply

- The verified run and its ceiling.
- Each PR's verdict, who produced it, and the patch-id check result.
- What merged and the read-back that confirmed it (state, mergedAt, base).
- What the next PR needs to join a new run.

## Source

- `skills/poteto-mode/playbooks/shipping.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `docs/guide/06-verify-and-ship.md` from pstack, MIT.
- Authorization agreements for publishing from `README.pt-BR.md` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
