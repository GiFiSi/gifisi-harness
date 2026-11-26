---
name: guard-the-context-window
title: Guard the Context Window
group: Delegation
applies_when: Large outputs, long files, fan-out. Route bulk to subagents or files; keep summaries in the main thread.
---

# Guard the Context Window

## Rule

The main thread's context is the scarcest resource in a long task. Route bulk reading and bulk output to subagents or files, and keep only summaries, decisions, and pointers in the main thread. Overflow degrades reasoning, creates lossy compression, and can halt progress.

## When it applies

- A command that prints thousands of lines: test suites, builds, logs, search results.
- Files longer than a few hundred lines, or many files read to answer one question.
- Fan-out: reviewing many files, comparing many options, running many experiments.
- Repeated reads of the same file in one session.
- A long session that is approaching its context limit.

## How to apply

1. **Load on demand.** The router names one playbook and a few skills. Read those files when the step needs them, not all of them up front.
2. **Read the part you need.** Search first, then read a line range. Do not read a whole file to find one function.
3. **Cap output at the source.** Pipe long commands through a filter: failing tests only, the last 50 lines, a count. Write full output to a file and read the slice that matters.
4. **Delegate bulk reading.** If your harness can spawn subagents, give each one a narrow question and ask for a short answer with file and line pointers. Otherwise, do the reading inline in small, bounded passes and write notes to a file.
5. **Size phases and cap scope.** Limit the files per phase and set a turn budget. Write a short handoff before the context fills, using `core/templates/task-handoff.md.template`.
6. **Keep decisions outside the context.** Record decisions in `.poteto/decisions.tsv` with `node scripts/log-decision.mjs`, so a fresh session can recover them without the transcript.

Worked example. A test suite prints 4,000 lines with 3 failures.

```text
bad:  npm test                                  -> 4,000 lines in context
good: npm test > .poteto/test-run.log 2>&1; echo exit=$?
      grep -n -A 15 "FAIL\|not ok" .poteto/test-run.log | head -60
```

The main thread sees the exit code and 60 lines covering the three failures. The full log stays on disk for later reads.

## Smells

- Pasting a full log, diff, or file into the conversation to find one detail.
- Reading every playbook and skill at the start of a task.
- The same file read three times in one session.
- A subagent that returns its raw tool output instead of a summary.
- A session that loses an earlier decision after context compression.

## Check

Answer yes or no: in this task, did every output or file over a few hundred lines get filtered, sliced, written to disk, or delegated before entering the main thread, with decisions recorded outside the transcript? Yes means the principle held.

Related: `core/principles/separate-before-serializing-shared-state.md`, `core/skills/swarm/SKILL.md`, `core/skills/context-tools/SKILL.md`, `core/harness/router.md`.

## Source

- `skills/principle-guard-the-context-window/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
- Context-economy guidance in `README.pt-BR.md` and `docs/tools/` of Vibe Coding Toolkit (soumatheusgomes/vibe-coding-toolkit, Matheus Gomes), MIT.
