# 04 Code review

## When to use

Use this prompt before merging a non-trivial change: a branch, a PR, a commit range, or uncommitted work. Several narrow review lenses (general quality, security, language and types, framework, project rules) read the same frozen diff plus its callers, contracts and tests. Every finding needs a concrete failure scenario and is verified against the code before it is reported. The review is read-only and applies no fixes.

Write the target after the prompt: a branch, a PR number, a commit range, or nothing. With nothing, the agent reviews the current branch against its merge-base with the default branch plus any uncommitted changes. For a whole-repository security audit use `core/prompts/05-security-review.md` instead.

## Prompt

```text
Review a change by following the poteto-harness router. The harness files
are under `.poteto/` in this project (or `~/.poteto-harness/` for a global
install); paths below are relative to that home.

Target: the branch, PR, commit range or diff I name after this prompt. If I
name nothing, review the current branch against its merge-base with the
default branch, plus staged, unstaged and relevant untracked changes as
separate layers. If the default branch is ambiguous, ask me once.

1. Before reading code, print the task-start signal exactly in this shape:
   [POTETO-HARNESS] Task Type: Code review | Playbook: Investigation
   Reason: <one sentence on why this is a read-only review>
   Done Predicate: <a ranked findings report where every finding has
   file:line, a failure scenario and the command or reading that confirmed
   it, and `git status --porcelain` shows no source change made by the
   review>
2. Open `core/playbooks/investigation.md`, choose the code review mode, and copy
   its numbered Steps verbatim into your todo list. Execute them in order.
3. Load `core/skills/code-review/SKILL.md` and follow its procedure. Load
   `core/skills/blast-radius/SKILL.md` for the changed symbols that touch shared
   code.
4. Freeze the target first: record base and head commit IDs and the
   comparison mode. Review the diff that exists, not the one described.
5. Pick lenses by risk and drop the ones the diff does not touch. If you
   can spawn subagents, run each lens as a read-only subagent in parallel;
   otherwise run them one at a time and write each lens's findings down
   before starting the next.
6. Finding format: file:line | severity | one-sentence claim | failure
   scenario. Drop anything without a failure scenario. Verify each
   remaining finding against the frozen diff and the connected code, run
   the cheap confirming check when one exists, and drop findings the code
   refutes. Deduplicate by root cause and rank critical, high, medium, low.
7. Log the review with `node .poteto/scripts/log-decision.mjs review
   "<target>" "<lenses run>" "<diff command; checks run>" "<counts by
   severity>"`.

This review is read-only: no edits, commits, pushes or comments posted
anywhere. If a fix is warranted, end the reply with the follow-up task and
the playbook it needs instead of making it.
```

## Expected result

- The `[POTETO-HARNESS]` header and the investigation steps as the todo list.
- A report with the frozen base and head IDs, then findings most severe first. Each finding has `file:line`, the failure scenario, the confirming command or reading, and the lenses that raised it.
- A "checked and clean" list, unreviewed scope and residual risks. An empty critical and high list is a valid result.
- One `review` row in `.poteto/decisions.tsv` and no source change.

## Source

- `docs/prompts/03-multi-agent-code-review.md` and section 10 of `docs/prompts/12-existing-project-setup.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for poteto-harness: routed through `playbooks/investigation.md` and `skills/code-review/SKILL.md`.
