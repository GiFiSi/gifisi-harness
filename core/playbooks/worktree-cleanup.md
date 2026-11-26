---
name: worktree-cleanup
title: Worktree cleanup
summary: Reclaim disk from stale git worktrees, merged branches, and caches with a read-only audit first and safety gates that never delete unmerged or uncommitted work without the user's yes.
skills: [blast-radius, show-me-your-work]
principles: [prove-it-works, build-the-lever, encode-lessons-in-structure, guard-the-context-window, make-operations-idempotent]
---

# Worktree cleanup

You own a safe cleanup. This is the one playbook that deletes user state with no code review to catch a slip, so the gates in the steps are the review. Audit first, read-only. Delete only what is merged, clean, and not in use. Everything else waits for a named yes from the user.

## When to use

- Disk is filling up, or the user asks to clean up worktrees, stale branches, or build caches.
- Parallel work (arena, visual parity, swarm) left many worktrees behind.
- Not for rewriting history, deleting remote branches others use, or cleaning a repository you do not own.

## Done Predicate

The audit table lists every worktree with its merge, dirty, push, and PR state; only worktrees classified safe and confirmed not in use were removed; `git worktree list` afterwards shows exactly the held-back set; and the space reclaimed is measured, not estimated.

Template for the signal header:

```
Done Predicate: git worktree list shows only <kept set>; removed <N> worktrees (all merged, clean, not in use); held back <M> with reasons; disk use of <parent dir> went from <before> to <after> measured with du.
```

## Steps

1. Record the starting disk use of the worktree parent folders with `du -sh <dir>`, then list every worktree with `git worktree list --porcelain` and treat the first entry (the main worktree) and any `locked` entry as untouchable.
2. Fetch the base with `git fetch origin --prune`, pick the branch PRs merge into, and audit each worktree read-only: size, last commit age, merged state, dirty state, push state, and PR state.
3. Classify each row into a bucket: `hold-wip` (tracked edits), `hold-open-pr`, `hold-unpushed`, `verify-in-use`, `review` (unmerged, no PR), or `safe` (merged, clean, pushed or PR merged); print the table and log phase `baseline`.
4. Ask the user which worktrees are in use and cross-check: running dev servers, open editors, or recent commits in the last few days move a `safe` row to `verify-in-use`; the user's in-use list always wins.
5. Show the diff for every `hold-wip` row and the file list for every untracked-only row, and get a decision per worktree; never discard uncommitted or unmerged work without an explicit yes.
6. Remove each confirmed worktree with `git worktree remove <path>` (no `--force`); use `--force` only for a worktree whose untracked files the user approved by name.
7. Run `git worktree prune --dry-run`, then `git worktree prune`; delete merged local branches with `git branch -d <branch>` only, never `-D` without a yes for that branch.
8. Reclaim other space only from caches the user agreed to clear, measure with `du -sh` again, re-list with `git worktree list`, and log phase `cleanup` with before, after, and the held-back reasons.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the repository root here. Log a row with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`.

**Step 1.** Measure folders, not the whole disk: `du -sh` works in Git Bash, Linux, and macOS. Take paths from `git worktree list --porcelain`, never from memory or a typed guess, because worktrees live in different places (a sibling folder, a hidden tool folder, a temp dir) and a hand-typed path misses some (`core/principles/encode-lessons-in-structure.md`). Each porcelain entry has `worktree <path>`, `HEAD <sha>`, `branch refs/heads/<name>` or `detached`, and optional `locked` or `prunable` lines. A `prunable` entry's folder is already gone; `git worktree prune` handles it.

**Step 2.** The audit is the lever (`core/principles/build-the-lever.md`). Run it as a loop over the porcelain paths so a reviewer can rerun it. Per worktree `<wt>` with branch `<b>` and base `<base>` (for example `origin/main`, or the branch PRs actually target):

- size: `du -sh <wt>`
- age: `git -C <wt> log -1 --format=%cr`
- merged: `git merge-base --is-ancestor <head-sha> <base>` exits 0 for a fast-forward or rebase merge; squash merges are not ancestors, so also run `gh pr list --state merged --head <b> --json number` when `gh` is available
- dirty: `git -C <wt> status --porcelain`; lines not starting with `??` are tracked edits (`wip:N`), lines starting with `??` are untracked files (`scratch:N`)
- pushed: `git -C <wt> rev-list --count origin/<b>..HEAD` is 0 when everything is pushed; a missing `origin/<b>` means never pushed
- PR: `gh pr list --state all --head <b> --json number,state`

Without `gh`, the PR column is unknown and squash-merged branches look unmerged; they fall into `review`, which is the safe side.

**Step 3.** Bucket precedence, first match wins: tracked edits -> `hold-wip`; open or draft PR -> `hold-open-pr`; commits not on any remote and not merged -> `hold-unpushed`; activity in the last four days -> `verify-in-use`; merged or PR merged, clean -> `safe`; anything else -> `review`. The bucket is advice, not permission. Keep the table in a file under `<project>/.poteto/` if it is long, and summarize in the conversation (`core/principles/guard-the-context-window.md`).

**Step 4.** The in-use set is the real artifact (`core/principles/prove-it-works.md`). An automated audit has marked `safe` a worktree that an active session was using. Check for processes holding the folder (a dev server started there, an editor window) and ask the user for the in-use list. If your harness can spawn subagents, they can check each candidate's recent activity in parallel; otherwise check inline.

**Step 5.** Removing a clean worktree is recoverable from its branch. Removing uncommitted edits is not. For `hold-wip`, show `git -C <wt> diff --stat` and the diff, and offer to commit the edits to their branch first. For `scratch:N`, list the untracked files by name before anyone approves dropping them. `hold-unpushed` and `review` rows need an explicit yes per worktree, because their commits exist nowhere else; offer `git push origin <b>` as the safe alternative.

**Step 6.** Plain `git worktree remove` refuses when the worktree has changes, which is the gate working. If a folder survives because of ignored build output, remove that folder only after confirming `git worktree list` no longer lists it. Removing a worktree keeps its branch ref, so no commit is lost.

**Step 7.** `git branch -d` refuses to delete a branch that is not merged into its upstream or HEAD, which is the second gate. A squash-merged branch needs `-D`; ask per branch and name its merged PR as the evidence. Never delete remote branches in this playbook unless the user asks for that specific branch. Rerunning steps 6 and 7 on an already-clean state changes nothing (`core/principles/make-operations-idempotent.md`).

**Step 8.** Other reclaimers, only with the user's agreement: package manager caches (`npm cache verify`, `pnpm store prune`, `yarn cache clean`), build output folders inside removed worktrees, and on macOS old simulators (`xcrun simctl delete unavailable`) and Xcode derived data. Clear only what the user did not ask to keep. Report measured numbers; `core/skills/show-me-your-work/SKILL.md` describes the evidence format. `core/skills/blast-radius/SKILL.md` applies when a branch you plan to delete is the base of another branch or PR.

## Reply

- Disk use before and after, measured with `du`, and the space reclaimed.
- The worktrees and branches removed.
- Each one held back, with a one-line reason (uncommitted edits, open PR, unpushed commits, in use).
- Any decision still waiting on the user.

## Source

- `skills/poteto-mode/playbooks/worktree-cleanup.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `skills/poteto-mode/scripts/worktree-audit.sh` from pstack (audit columns and bucket rules, rewritten as inline git commands), MIT.
- Destructive-action agreements from `README.pt-BR.md` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
