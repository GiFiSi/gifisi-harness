---
name: autopilot-full
title: Autopilot-full
summary: Carry a queue of independent PRs from build to merged, one owner per PR, with merges authorized only by verdicts from verifiers that never wrote the code.
skills: [figure-it-out, show-me-your-work, interrogate, swarm, blast-radius, unslop, no-comments]
principles: [prove-it-works, sequence-verifiable-units, separate-before-serializing-shared-state, never-block-on-the-human, make-operations-idempotent]
---

# Autopilot-full

You own the verdicts, never the PRs. One owner carries each PR from build to merge, and nothing merges until verifiers that never wrote the code have proven the code that lands. A verdict covers one patch; green CI covers one head.

## When to use

- The operator hands over a queue of independent changes and grants merging ("full autopilot", "merged by morning", "take it all the way").
- Each item can land on its own off trunk.
- Not when the operator wants to review before anything lands: use `core/playbooks/autopilot-stack.md`. Not for one task with one exit condition: use `core/playbooks/autonomous-run.md`. Without an explicit merge grant in the request, this playbook stops at merge-ready like `core/playbooks/autopilot-stack.md`.

## Done Predicate

Every PR the grant covers is merged with a clean verifier verdict on the patch that landed and green CI on its final head, and every other PR is reported with its state and blocker.

Template for the signal header:

```
Done Predicate: gh pr view <n> --json state,mergeCommit shows MERGED for each granted PR; .poteto/decisions.tsv holds a clean verdict row for the merged patch-id of each; ungranted PRs reported at merge-ready.
```

## Steps

1. Record the operator's grant: the queue items, which may merge, and which stop at merge-ready; a request to state the plan is not a go.
2. Resolve the forge once (`gh` by default), start the decision trail per `core/skills/show-me-your-work/SKILL.md`, and plan the program with `core/skills/figure-it-out/SKILL.md`.
3. Spawn one owner per PR in parallel off trunk, never stacked; each builds, opens its PR per `core/playbooks/opening-a-pr.md`, proves it live, and babysits to green per `core/playbooks/babysit.md`.
4. Have each owner push every finished unit, record its id and state in the trail, and report its code-ready head after the unslop and no-comments passes and a rebase onto trunk.
5. Verify each code-ready head with a swarm per `core/skills/swarm/SKILL.md` that reruns gates, proves load-bearing behavior on the live surface, and audits the diff; no verifier wrote the code.
6. Block a PR only for a problem you can show at its head (failing run, wrong shipped doc, bug a user would hit); route everything else to a follow-up.
7. Re-verify after change: a rebase or minor fix gets one fresh verifier, new behavior or a large diff gets a full swarm, wording gets none; an unchanged `git patch-id --stable` keeps its verdict.
8. Countersign a loosened gate (raised budget, allowlist entry, skipped check) only after a verifier proves it safe, and never bypass an approval the forge enforces.
9. Merge only granted, verified PRs with green CI on current trunk; rebase and re-test first when trunk changed the patch's files, callers, or dependencies.
10. Audit every agent on a heartbeat by its side effects, replace stuck ones, and stand every owner down at once on the operator's stop.

## Step notes

Log every verdict, countersign, merge, and replacement with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"` (script path relative to the harness home). Evidence is a PR link, a SHA, or a command.

**Step 1.** The grant covers only the queue's items. Items the operator names as theirs and PRs outside the queue stop at merge-ready. Write the grant into the trail as the first row so every owner and every heartbeat can re-read it.

**Step 2.** Use the GitHub CLI for every PR operation: `gh pr create`, `gh pr view`, `gh pr checks`, `gh pr merge`. If the forge is not GitHub, use its CLI with the same verbs and record the choice. Assume the session dies: push early and keep all state in the repository and the trail, not in memory.

**Step 3.** If your harness can spawn subagents or separate sessions, each owner is one. Otherwise run the owners sequentially in this session, one PR at a time, with the same separation between owner and verifier. Parallel owners never share a branch, worktree, or file (`core/principles/separate-before-serializing-shared-state.md`). Open each PR early so CI and review bots run alongside the work.

**Step 4.** Code is ready only after `core/skills/unslop/SKILL.md` and `core/skills/no-comments/SKILL.md` have run, so verification runs on finished code. Rebase onto current trunk, run the repo's checks for the touched paths (commands in `.poteto/project.json`, plus `node scripts/quality-gate.mjs`), push, and report the code-ready head. Report every later head too. An owner force-pushes only its own branch with `git push --force-with-lease=<branch>:<last pushed sha>`; on any push it did not make, it stops and reports. Whoever spawns an agent records its id, state, and a stuck-after runtime in the trail.

**Step 5.** Fan out independent verifiers at the code-ready SHA. The live lane drives the real surface: `node scripts/verify-feature-map.mjs` against the PR's checkout, or the project's verification skill (see `core/skills/create-verification-skill/SKILL.md`). The verdict is not clean without the live lane, and not before you audit the owner's merge-ready receipts, because no lane trusts a claim it has not checked. If the design itself is contested, run `core/skills/interrogate/SKILL.md` before the verdict.

**Step 6.** A problem the base already has does not block unless the PR copies it or newly reaches it. Use `core/skills/blast-radius/SKILL.md` to decide whether the PR newly reaches it.

**Step 7.** A fix round stays on its base unless trunk conflicts, breaks CI, or lands a concurrent change to the same files, because each rebase restarts CI. `git patch-id --stable` on the PR's diff before and after a rebase tells you whether the patch changed; unchanged means the verdict carries, but the new head still needs its own green CI.

**Step 8.** The owner is the one who wants green, so it cannot approve its own loosened gate. A disabled or soft-failed check always comes back out before merge, because it stops guarding every case.

**Step 9.** Green CI alone never authorizes a merge. Right before merging, fetch trunk and ask whether its changes can affect the patch. Rebase and wait for CI when the code that would land was never tested together (a conflict, a file both sides changed, a change to which checks run). When trunk changed a caller of the patch or a dependency it uses, run the patch's checks on the merge result and merge on a pass. Otherwise merge with `gh pr merge <n> --squash` or the repo's merge style. If trunk would force a third rebase, hold and sequence the colliding work yourself.

**Step 10.** Use your harness's loop or scheduler if it has one; otherwise check in-session at a fixed interval. Each heartbeat re-reads this playbook, probes every agent down to the leaf lanes, and judges each by side effects (pushes, trail rows), not status text. An agent is stuck when it errors, cannot start turns, or shows nothing new past its stuck-after runtime. One waiting on you or the operator is not stuck: answer it. A hold reaches every owner as a zero-writes order; each reports where it stands and waits for release.

## Reply

Catch the operator up: each PR's state and verdict with its link, what merged, every countersign and why, open operator gates, parked follow-ups, and a pointer to `.poteto/decisions.tsv`.

## Source

- `skills/poteto-mode/playbooks/autopilot-full.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `docs/guide/07-overnight.md` and `docs/guide/06-verify-and-ship.md` from pstack, MIT.
- Delegation and review rules from `README.pt-BR.md` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
