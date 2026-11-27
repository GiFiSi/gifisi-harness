---
name: why
description: Answer why code, a decision, or a threshold is the way it is, from the written record (commits, PR and issue threads, decision logs, docs), not from reading the code. Load for design rationale, why we picked Y, regressions, postmortems, and checking whether an old reason still holds. For runtime behavior, load the how skill.
origin: pstack
---

# Why

Answer from the record, not the code. The code shows what was built. Only the record shows what the authors meant, what they rejected, and what they knew at the time.

## When to use

- "Why does X work this way", "why did we pick Y", "why is the limit 5".
- A regression: which change introduced it and what that change was trying to do.
- A postmortem or a data-backed threshold whose basis you need before changing it.
- Checking whether an old reason still holds before you delete or change something.
- Not for how the code behaves now. That is `core/skills/how/SKILL.md`.

## Procedure

1. Pin the target: a file, function, constant, config value, or behavior. Locate it at `file:line` on the current commit.
2. Find the change that introduced it. Use `git log -S "<literal>" --oneline -- <path>` for a value or symbol, `git log --follow --oneline -- <path>` for a file that moved, and `git blame -w -C -C <path>` to see past whitespace and moved lines. Keep following blame through refactors until you reach the commit that first introduced the behavior, not the last one that touched the line.
3. Read each relevant commit whole: message, full diff, and the files changed alongside it. List every later commit that changed the target the same way.
4. Read the discussion around each commit. If the forge has a CLI or API you can use, read the PR description, review threads, and linked issues. Search the issue tracker for the identifiers you found.
5. Read the project's own record: `.gifisi/decisions.tsv` rows whose decision or evidence names the target, `.gifisi/corrections.md`, `docs/architecture.md`, `docs/design.md`, `PRODUCT.md`, ADRs, and changelogs.
6. When the trail is thin, widen once: tests added in the same commit (they show intended behavior), benchmarks or data cited in the PR, incident notes. Stop when new sources only repeat what you have.
7. Separate what the authors wrote from what you infer. Quote or closely paraphrase the record with its citation. Label every claim measured (the record shows data), stated (an author wrote it), or inferred (your reading).
8. Test whether the reason still holds: is the constraint still present in today's code, dependencies, or data? Say what would have to be true for it to no longer apply.
9. State what the record does not answer. "Nobody wrote down why" is a finding, not a failure.

## Output

- The answer in two or three sentences, with its confidence.
- The trail: each commit, PR, issue, or decision row cited by SHA, number, or `file:line`, with one line on what it says.
- Each claim labeled stated, measured, or inferred.
- Whether the reason still holds today, and the evidence.
- What the record does not answer, and who or what could.

Keep hedges that come from the evidence. They are findings, not style.

## Source

Adapted from pstack `skills/why/SKILL.md` and `docs/guide/03-understand.md` (Lauren Tan, cursor/plugins, MIT).
