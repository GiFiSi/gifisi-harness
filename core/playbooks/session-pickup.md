---
name: session-pickup
title: Session pickup
summary: Resume prior work from its durable trail (handoff, decision log, git state) without redoing finished steps, then route the remaining work to its playbook.
skills: [recall, show-me-your-work]
principles: [prove-it-works, guard-the-context-window, sequence-verifiable-units, never-block-on-the-human]
---

# Session pickup

You own the resume point. Read the prior trail; do not redo it. The counterpart is `core/playbooks/pause-safely.md`, which writes the trail this playbook reads: `.gifisi/handoff.md` (from `core/templates/task-handoff.md.template`), `.gifisi/decisions.tsv`, and the commits on the branch.

The trail is authoritative input for what was done and decided. It is not proof that the result works. Recheck inherited claims on the real artifact before building on them; do not re-run work the trail shows as finished.

## When to use

- The user says pick up, resume, continue where we left off, or points to a handoff, branch, or PR from an earlier session.
- A new session starts in a project whose `.gifisi/handoff.md` names unfinished work.
- An earlier agent run failed or stopped and the user wants it ratified, finished, or postmortemed.
- Not for starting fresh work (route the prompt normally) or for pausing (`core/playbooks/pause-safely.md`).

## Done Predicate

The resume point is named from the handoff, decision log, and git state, every inherited "verified" claim was rechecked on the current commit, and the remaining work is routed to one playbook with its own signal header.

Template for the signal header:

```
Done Predicate: resume point <step of playbook X> identified from .gifisi/handoff.md and .gifisi/decisions.tsv rows <range>; inherited checks <commands> rerun on <commit> with <results>; remaining work routed to <playbook>.
```

## Steps

1. Locate the trail in this project only: `.gifisi/handoff.md`, `.gifisi/decisions.tsv`, the branch and its commits, and any PR or plan file the handoff names; never read another project's session history.
2. Validate the decision log with `node scripts/log-decision.mjs --check`, then read its last rows and the handoff's goal, Done Predicate, verified state, pending work, blockers, and next action.
3. Reconstruct operational state: `git status --porcelain`, `git log --oneline <base>..HEAD`, `git diff <base> --stat`, the worktree in use, and the commands in `.gifisi/project.json`.
4. Diff done against pending: list each planned step as landed (with commit), in progress, or not started, and name the single resume point without re-running finished work.
5. Recheck inherited claims on the current commit: rerun the checks the handoff lists as passing and `node scripts/verify-feature-map.mjs` for touched features, and record what still holds.
6. Pick the verdict: continue the execution, ship a finished result, ratify or override a prior conclusion, or postmortem a failed run; log phase `handoff` with the resume point and evidence.
7. Route the remaining work with `node scripts/classify-task.mjs "<pending work>"`, print the new signal header, and continue in that playbook from the resume point.

## Step notes

Script paths are relative to the harness home: `.gifisi/` in an installed project, the repository root here. Log a row with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`.

**Step 1.** Stay inside the current project. Do not glob across other projects' folders or a harness's private session storage; that reads unrelated private work. If the user named a branch, PR, or file, start there. If there is no handoff, the trail is the decision log plus git history; say so. `core/skills/recall/SKILL.md` describes how to search past work within these bounds.

**Step 2.** A malformed log is a finding, not a blocker: report the bad rows and keep reading the valid ones. Read the handoff whole; read the log from the end backwards until you reach the row where this task began (its `signal` row). If the trail is long, read it through a subagent or a script that prints the reduced timeline, and keep only that in the main thread (`core/principles/guard-the-context-window.md`).

**Step 3.** The base is the branch the work targets (`git merge-base HEAD origin/main` or the base the handoff names). A `wip:` commit at the tip is the previous agent's pause commit; keep it, do not amend it away until its content is accounted for. Uncommitted changes you did not make are someone's work: read them, never discard them.

**Step 4.** Resist re-deriving the trail. "Let me verify everything from scratch" treats an authoritative record as untrustworthy and spends the session redoing it. Rerun checks, not work. Each playbook step maps to its log phase (`reproduce`, `failing-test`, `fix`, `verify`, and so on); a step with a matching row and commit is landed.

**Step 5.** A prior self-report is a claim, not a proof (`core/principles/prove-it-works.md`). The handoff separates verified from believed; a check marked "last passed at <commit>" on an older commit needs a rerun now. If a check that the handoff marks passing now fails, that is the resume point: something between the two commits broke it.

**Step 6.** Verdicts:

- Continue: the plan still holds; resume at the named step.
- Ship: the work is finished and verified; route to `core/playbooks/opening-a-pr.md` or `core/playbooks/shipping.md`.
- Ratify or override: a prior conclusion is checked against fresh evidence and kept or replaced, with the reason logged.
- Postmortem: the prior run failed; explain where and why from the trail, using `core/skills/show-me-your-work/SKILL.md` to cite rows and commits.

Reversible choices do not wait for the user (`core/principles/never-block-on-the-human.md`). Ask only when the handoff lists a blocker that needs their decision.

**Step 7.** This playbook ends at the hand-off. The routed playbook owns the rest, starting at the resume point, not step 1. Copy its remaining steps into your todo list and mark the finished ones done. Update `.gifisi/handoff.md` only when you pause again.

## Reply

- Where the prior session stopped and the evidence for it (handoff section, log rows, commits).
- What you inherited and what you reran; ideally nothing was redone.
- Which inherited claims still hold on the current commit and which do not.
- The verdict, the resume point, and the playbook now running.

## Source

- `skills/poteto-mode/playbooks/session-pickup.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `skills/recall/SKILL.md` from pstack, MIT.
- Continuity agreements in `README.pt-BR.md` and the task handoff template in `templates/` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
