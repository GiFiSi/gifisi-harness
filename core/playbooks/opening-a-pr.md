---
name: opening-a-pr
title: Opening a PR
summary: Turn verified work into a small, reviewable pull request with a one-minute briefing, opened ready for review.
skills: [technical-writing, no-comments, unslop, blast-radius]
principles: [sequence-verifiable-units, prove-it-works, laziness-protocol, minimize-reader-load]
---

# Opening a PR

## When to use

Use this playbook at the end of every playbook that changes code, and when the user asks to commit, push, or open a pull request. It assumes the work is already verified by the playbook that produced it. Its job is to make that work easy to review and safe to land.

Pushing and opening a PR are outward-facing. They proceed when the user asked for a PR in this task. Otherwise commit locally and ask before pushing.

## Done Predicate

`gh pr view <branch> --json url,state,isDraft,baseRefName` shows the PR open, not a draft, on the intended base, and its body carries the Why, What changed, and Verification headings with the checks that were actually run.

Template:

- Artifact: the pull request on the remote, plus the branch's commits.
- Observation: the `gh pr view` output above; `git log <base>..HEAD --oneline` shows small commits that each describe one change; the Verification section lists commands and their observed results.
- Without the `gh` CLI or a remote, the artifact is the local branch and the predicate is `git status` clean outside `.gifisi/` with the commits in place; report the PR as not opened and why.

## Steps

1. Confirm a PR is wanted in this task; if it was not asked for, commit locally, report the branch, and ask before any push.
2. Put the change on its own branch off trunk (a separate worktree when other work shares the checkout) and move unrelated edits out of it.
3. Run the project lint and tests from `.gifisi/project.json`, `node scripts/quality-gate.mjs`, and `node scripts/verify-feature-map.mjs` when `.gifisi/feature-map.json` exists; fix failures before going on.
4. Clean the diff with `core/skills/unslop/SKILL.md` and `core/skills/no-comments/SKILL.md`, and remove debug output, dead code, and edits outside the task's scope.
5. Rebase into small landable commits that each build and pass tests on their own, staging with `git add <files>` and never `git add -A`.
6. Run `core/skills/blast-radius/SKILL.md` on the changed symbols and keep its verdicts for the Blast Radius section.
7. Write the title `type(scope): subject` naming the real symbol, and a body under 40 lines with Why, What changed, Scope, Tradeoffs, Blast Radius, Verification, using `core/skills/technical-writing/SKILL.md`.
8. Push with `git push -u origin <branch>` and open it ready with `gh pr create --base <base> --title "<title>" --body-file <file>`, without `--draft`; stack follow-ups by basing each on its parent branch.
9. Check the result with `gh pr view <branch> --json url,state,isDraft,baseRefName` and log a `ship` row with the URL using `scripts/log-decision.mjs`.

## Step notes

Script paths are relative to the harness home: `.gifisi/` in an installed project, the global harness home (for example `~/.gifisi-harness/`) when only a global install exists, the repository root here. Run them as `node "<harness-home>/scripts/<name>.mjs"` from the project root, so `.gifisi/decisions.tsv` lands in the project.

**Step 1.** A request to fix, build, or refactor is not by itself a request to publish. "Commit this" means a local commit. "Open a PR", "push this", or a playbook run the user started with a PR in scope means push and open.

**Step 2.** One PR carries one change (`core/principles/sequence-verifiable-units.md`). A refactor discovered during a bug fix goes in its own commit at least, and its own PR when it is large. Use `git switch -c <branch> <trunk>`; when another task is active in the same checkout, use `git worktree add <dir> -b <branch> <trunk>` so the two never write the same files.

**Step 3.** Rerun the checks on the exact commits you will push. A green run from before a rebase does not count (`core/principles/prove-it-works.md`). If a check fails, fix it and rerun; do not open a PR that says "tests failing, will fix".

**Step 4.** Read the full diff once as the reviewer will. Remove comments that restate the code, leftover logs, commented-out code, unused exports, and formatting churn in lines the change did not need (`core/principles/laziness-protocol.md`). Keep comments that explain a non-obvious why.

**Step 5.** Each commit is a verifiable unit: a reviewer can check out any commit and the build and tests pass. Messages use the same `type(scope): subject` form. Never rewrite commits already pushed to a shared branch without the user's yes.

**Step 6.** The Blast Radius section names the callers, consumers, persisted formats, and public contracts the change can affect, each with a verdict: unchanged, migrated in this PR, or at risk with the reason.

**Step 7.** Body shape, dropping any empty section:

```markdown
## Why
The user-visible problem or goal, in two sentences.

## What changed
- The one change, naming the real symbols.

## Scope
What this PR does not do, and where that work goes.

## Tradeoffs
Only rejected alternatives a reviewer would otherwise ask about.

## Blast Radius
- Caller or contract: verdict.

## Verification
- `<command>`: observed result.
- Live: feature-map check <id> passed.
```

Write for a reader with one minute (`core/principles/minimize-reader-load.md`). Measured numbers go in Verification with the command that produced them.

**Step 8.** Open PRs ready for review, not as drafts. For a stack, open the first against trunk and each next one with `--base` set to the previous branch. Opening a PR does not start watching it; that is `core/playbooks/babysit.md` when the user asks.

**Step 9.** Log example: `node scripts/log-decision.mjs ship "opened fix(cart): parse prices at the boundary" "bug fix verified" "https://github.com/org/repo/pull/123" "open, ready"`.

## Reply

The PR URL, title, base branch, the commits in order, the checks run with their results, and anything left out of scope. If no PR was opened, the branch name, the local commits, and the question you need answered to push.

## Source

Adapted from `skills/poteto-mode/playbooks/opening-a-pr.md` in pstack by Lauren Tan (cursor/plugins, MIT). Git agreements adapted from `README.pt-BR.md` in Vibe Coding Toolkit by Matheus Gomes (MIT).
