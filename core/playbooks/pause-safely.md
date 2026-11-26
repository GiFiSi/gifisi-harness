---
name: pause-safely
title: Pause safely
summary: Stop at a safe boundary and leave a durable handoff that a cold-start agent can resume from without redoing work.
skills: [show-me-your-work]
principles: [sequence-verifiable-units, prove-it-works, make-operations-idempotent, guard-the-context-window]
---

# Pause safely

## When to use

Use this playbook only when the user explicitly asks to pause, stop for now, park the work, or hand it off, or when your context is about to be compacted or the session will end. You own a clean stop. "Keep going", "going to bed, keep going", and "don't stop" are not pause requests; they mean continue (`core/playbooks/autonomous-run.md`).

The counterpart is `core/playbooks/session-pickup.md`, which reads what this playbook writes.

## Done Predicate

The handoff file `.poteto/handoff.md` exists with goal, verified state, checks, pending work, blockers, and next action filled from this session, the working tree has no uncommitted edits outside `.poteto/`, and `.poteto/decisions.tsv` ends with a `handoff` row naming the handoff and the last commit.

Template:

- Artifact: `.poteto/handoff.md` (written from `core/templates/task-handoff.md.template`), the local `wip:` commit if one was needed, and the `handoff` row.
- Observation: `git status --porcelain -- . ":!.poteto"` prints nothing (the handoff and the log row are written after the commit, so `.poteto/` may show changes); `git log -1 --oneline` shows the commit the handoff names; `node scripts/log-decision.mjs --check` passes.
- No push, PR, deploy, or deletion happened to make the pause.

## Steps

1. Confirm the user asked to pause, or that context or the session is ending; on "keep going" or "don't stop", continue the task instead.
2. Stop at a safe boundary: finish or back out of the current atomic step, start nothing new, and stop any subagents or background processes you started.
3. Rerun the cheapest check that proves the current state (the relevant tests, or `scripts/verify-feature-map.mjs` for the touched feature) and record pass or fail as observed.
4. Commit uncommitted edits as one local `wip:` commit on the current branch with `git add <files>`; if the tree is broken, say so in one line of the commit body.
5. Write `.poteto/handoff.md` from `core/templates/task-handoff.md.template`: goal, verified state, checks with results, pending work, blockers, next action, key files, and gotchas.
6. Point the handoff at the trail (`.poteto/decisions.tsv` rows, plan file, PR URL) instead of copying it, and name the first command to run on resume.
7. Log a `handoff` row with `scripts/log-decision.mjs` naming `.poteto/handoff.md` and the last commit hash.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the global harness home (for example `~/.poteto-harness/`) when only a global install exists, the repository root here. Run them as `node "<harness-home>/scripts/<name>.mjs"` from the project root, so `.poteto/decisions.tsv` lands in the project.

**Step 1.** A pause is explicit. Do not pause because the work got hard or a check failed; that is a blocker to report inside the running playbook.

**Step 2.** An atomic step is one that leaves the tree consistent: a test plus its fix, a renamed symbol plus every caller. If finishing it would take long, back it out with `git restore <files>` or `git stash` and say so. Kill servers you started, so a later session does not find a port taken.

**Step 3.** The handoff separates verified from believed. A check you did not rerun after the last edit is reported as "last passed at <commit>", not as passing (`core/principles/prove-it-works.md`).

**Step 4.** Nothing lives only in your context. The commit covers everything outside `.poteto/`; the handoff and the `handoff` row come after it so the handoff can name the commit. Commit locally only; take no irreversible action to pause. If the branch already had a PR open and the user asked for the work to be visible, pushing the `wip:` commit is allowed; otherwise do not push. Never commit secrets or files the project ignores.

**Step 5.** The template sections map to what the next agent needs first:

- Goal: the user's request and the Done Predicate from the signal header.
- Verified state: what is done, each with the check that proves it.
- Checks: commands with their last observed result and the commit they ran on.
- Pending: remaining steps of the playbook, in order.
- Blockers: what stops progress and what would unblock it.
- Next action: one concrete first step.
- Key files and gotchas: paths, not diffs; traps you already hit.

Writing the handoff is idempotent: if `.poteto/handoff.md` exists from an earlier pause on the same task, update it in place rather than appending a second copy (`core/principles/make-operations-idempotent.md`). If it belongs to a different task, keep its content under a dated heading below the new one.

**Step 6.** Keep the handoff short (`core/principles/guard-the-context-window.md`). The decision log already has the forks and verifications; the handoff points to the row range. `core/skills/show-me-your-work/SKILL.md` describes how to make that trail auditable.

**Step 7.** Log example: `node scripts/log-decision.mjs handoff "paused after unit 2 of 4" "user asked to stop for now" ".poteto/handoff.md; commit a1b2c3d" "tree clean, unit 3 pending"`.

## Reply

Where you are in the playbook, what is on disk (paths, no diff dumps), the commits made and whether the tree is clean outside `.poteto/`, which checks passed and which were not rerun, and the first action on resume. This is a pause, not a final report.

## Source

Adapted from `skills/poteto-mode/playbooks/pause-safely.md` in pstack by Lauren Tan (cursor/plugins, MIT). Handoff fields adapted from the continuity agreements in `README.pt-BR.md` and the task handoff template in `templates/` of Vibe Coding Toolkit by Matheus Gomes (MIT).
