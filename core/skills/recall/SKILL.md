---
name: recall
description: Rebuild recent working context on a topic from the project's durable trail (.poteto/decisions.tsv, the handoff file, git history, branches) plus the shared record (issues, PRs, reverts, incidents), and return a tight current-state brief with a next move. Load for catch me up, recall my work on X, where did I leave off, or before starting new work on an old topic.
origin: pstack
---

# Recall

Before you start or resume work, rebuild the recent working context and hand back a tight brief: where things stand now and what to do next. Read only what the in-scope threads need, then stop.

Context lives in two records. The project trail holds what was done and decided: `.poteto/decisions.tsv`, `.poteto/handoff.md` (written from `core/templates/task-handoff.md.template` by `core/playbooks/pause-safely.md`), `.poteto/corrections.md`, commits, branches, and worktrees. The shared record holds what happened around the same code under other names: symptoms users keep reporting, fixes that shipped and were reverted, errors still firing. A feature with a long bug tail keeps most of its story in the shared record, so never rebuild it from the project trail alone.

This skill reads files and repositories only. It does not read a harness's private chat storage or another project's history.

## When to use

- "Catch me up", "recall my work on X", "what have I been working on", "where did I leave off".
- Before starting new work on a topic that has history: recall first, then read the new input.
- Route out instead when:
  - The user wants to resume one specific prior session or branch. That is `core/playbooks/session-pickup.md`.
  - The user wants a recurring habit turned into a skill. That is `core/playbooks/authoring-a-skill.md`.
  - The user already handed you a full state capsule (paths, branch, the change). Use it and skip the mining.

## Procedure

1. Lock the scope before searching. Pin the time window (default the last 7 days), the topic if named, and the project (default the current one; never read another project unless asked). State the scope back in one line. Never quietly turn "all" into "recent N".
2. Read the decision trail. Run `node scripts/log-decision.mjs --check` (path relative to the harness home) to validate `.poteto/decisions.tsv`; a malformed row is a finding, keep reading the valid ones. Filter rows to the window and topic, and read the `signal` rows first: each one marks where a task began.
3. Read the handoff and corrections. If `.poteto/handoff.md` exists, read its goal, Done Predicate, verified state, pending work, blockers, and next action. Read `.poteto/corrections.md` for rules that came from past mistakes on this topic.
4. Mine git history. Use `git log --since="7 days ago" --all --oneline` (adjusted to the window), `git log -S "<topic term>"` and `git log --grep "<topic term>"`, `git branch --sort=-committerdate`, `git worktree list`, `git stash list`, and `git status --porcelain`. Order by real commit or modification time, never by name.
5. Sweep the shared record whenever the topic names a feature, file, subsystem, or bug. This is the default, and "my work on X" does not exempt it. For each available source (forge PRs and reviews, issue tracker, error tracker, team docs), ask: what is the current state, what was tried and did not hold, and what are users still reporting? Null results are findings. Skip an unavailable source and say so. Skip this step only for pure activity recall with no named target ("what did I do this week").
6. Fan out when the corpus is large. If your harness can spawn subagents, give one subagent per source (decision log, git history, each shared-record source), run them in parallel, and have each return only findings in this schema: topic, goal, decisions, open threads, struggles and corrections, artifacts (PRs, issues, branches), each with its citation. Otherwise search each source in turn and keep only the findings, not raw output, in the main thread.
7. Verify against live state. Check every PR, branch, and issue the mining surfaced with `git` and the forge CLI if available: is it merged, open, reverted, or gone? A decision row or handoff that says "verified" is a claim; record whether you rechecked it.
8. Write the brief to the Output contract. Group by thread and stay on the named topic.

## Output

Lead with the capsule, then thread status, then problems, then the next move. Cut detail before you cut threads.

- **Capsule.** At most 5 bullets: what this work is and where it stands overall.
- **Threads.** One line each, prefixed with exactly one status tag: `[merged #N]`, `[open PR #N]`, `[in flight <branch>]`, `[verified, uncommitted]`, `[reverted #N]`, or `[planned, not started]`. An untagged thread is not done; tag it.
- **Problems.** At most 5 recurring ones, including symptoms users keep reporting and any fix that shipped and was reverted, so the next attempt starts where the last one failed.
- **Next move.** The single most useful next action, concrete enough to start.

Cite project-trail findings by decision row timestamp, commit SHA, or file path, and shared-record findings by their source (PR number, issue ID, error-tracker issue). An adjacent feature stays out unless it blocks this one. Write the brief through `core/skills/unslop/SKILL.md`, and remove private context before anything leaves the session.

## Source

Adapted from pstack `skills/recall/SKILL.md` and `docs/guide/03-understand.md` (Lauren Tan, cursor/plugins, MIT). Chat-transcript mining was replaced with the project's durable trail.
