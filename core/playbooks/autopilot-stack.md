---
name: autopilot-stack
title: Autopilot-stack
summary: Carry a queue of changes to verified, green PRs, stacking only where one builds on another, and hand them to the operator without merging.
skills: [show-me-your-work, blast-radius, swarm, figure-it-out, unslop, no-comments]
principles: [prove-it-works, sequence-verifiable-units, separate-before-serializing-shared-state, never-block-on-the-human]
---

# Autopilot-stack

You own the verdicts, never the PRs, and nothing merges. One owner carries each PR to verified and green. The operator reviews and lands them.

## When to use

- The operator hands over several changes and wants them ready but not merged ("autopilot these, but don't merge", "stacked PRs", "I'll land them in the morning").
- Some changes build on others and need a PR stack.
- Not when the operator granted merging: use `core/playbooks/autopilot-full.md`. Not for landing an existing verified stack: use `core/playbooks/shipping.md`.

## Done Predicate

Every PR in the queue is open, green on its current head, and carries a clean verifier verdict for that head's patch, and nothing was merged.

Template for the signal header:

```
Done Predicate: gh pr checks <n> passes on the current head of each PR; .poteto/decisions.tsv has a clean verdict row whose patch-id matches each head; gh pr view shows every PR OPEN.
```

## Steps

1. Record the operator's grant in the trail: the queue items, and that nothing merges and nobody pushes after handoff without the operator's go.
2. Start the decision trail per `core/skills/show-me-your-work/SKILL.md`, resolve the forge once (`gh` by default), and plan the queue with `core/skills/figure-it-out/SKILL.md`.
3. Spawn one owner per PR off trunk; stack a PR on another PR's branch only when it builds on that PR's code.
4. Have each owner build, open its PR per `core/playbooks/opening-a-pr.md`, prove the change live with the Feature Map, and babysit to green per `core/playbooks/babysit.md`.
5. Rebase each stack root onto trunk and each stacked PR onto its parent branch; after a lower PR gets a new head, restack every PR above it.
6. Verify each code-ready head with a swarm per `core/skills/swarm/SKILL.md` whose lanes never wrote the code, and check what each PR can break with `core/skills/blast-radius/SKILL.md`.
7. Keep a verdict across a restack only when `git patch-id --stable` is unchanged; otherwise run one fresh verifier at the new head.
8. Stop each PR at verified and green on its current head, hand the list to the operator, and do not merge.

## Step notes

Log grants, verdicts, restacks, and handoffs with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"` (script path relative to the harness home).

**Step 1.** Write the no-merge rule into the first trail row and into every heartbeat prompt you schedule, so each later check sees it. A request to state the plan is not a go to start.

**Step 2.** Use the GitHub CLI (`gh pr create --base <branch>`, `gh pr view`, `gh pr checks`) or the forge's equivalent CLI, and record the choice. Assume the session dies: push early, keep state in the repository and the trail.

**Step 3.** If your harness can spawn subagents or separate sessions, each owner is one; otherwise run owners one at a time in this session, keeping owner and verifier separate. Independent PRs base on trunk so each can land alone. A stacked PR names its parent in the body. Owners never share a branch, worktree, or file (`core/principles/separate-before-serializing-shared-state.md`).

**Step 4.** The live proof runs `node scripts/verify-feature-map.mjs` against the PR's checkout, or the project's verification skill (see `core/skills/create-verification-skill/SKILL.md`). Before reporting code-ready, the owner runs `core/skills/unslop/SKILL.md` and `core/skills/no-comments/SKILL.md`, the project's checks from `.poteto/project.json`, and `node scripts/quality-gate.mjs`.

**Step 5.** Use `git rebase --onto <new parent head> <old parent head> <branch>` for stacked branches, then `git push --force-with-lease=<branch>:<last pushed sha>`. An owner force-pushes only its own branch; on a push it did not make, it stops and reports.

**Step 6.** Fan out verifiers at each code-ready SHA: rerun the gates, drive the load-bearing behavior on the live surface, and audit the diff. Block a PR only for a problem you can show at its head. A problem its base (trunk or the PR below) already has does not block unless the PR copies it or newly reaches it. Everything else becomes a follow-up.

**Step 7.** Compare `git diff <parent>...<branch> | git patch-id --stable` before and after the restack. A rebase or minor fix gets one fresh verifier; new behavior or a large diff gets a full swarm; a wording-only change gets none. Every new head still needs its own green CI.

**Step 8.** After handoff, nobody pushes without the operator's go. If the operator later grants merging, switch to `core/playbooks/shipping.md`.

## Reply

List each PR with its link, base, head SHA, verdict, CI state, and open follow-ups, in stack order. Point at `.poteto/decisions.tsv` for the trail.

## Source

- `skills/poteto-mode/playbooks/autopilot-stack.md` and `skills/poteto-mode/playbooks/autopilot-full.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `docs/guide/07-overnight.md` from pstack, MIT.
