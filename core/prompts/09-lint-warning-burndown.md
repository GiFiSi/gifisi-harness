# 09 Lint warning burndown

## When to use

Use this prompt to bring a lint rule, or the whole warning set, down to zero or to an agreed count without changing behavior. It fits after `core/prompts/07-quality-gates-install.md` left rules at warn with a measured baseline, or when a tightened rule revealed a backlog. The agent measures first, flags the riskiest part of the backlog with real numbers before fixing it, works in file-disjoint waves, and checks every final box by rerunning the command.

Name the rule after the prompt, for example `complexity` or `quality/max-lines`, or name nothing to cover all warnings. For size violations alone, `core/prompts/06-file-size-refactor.md` is narrower.

## Prompt

```text
Burn down lint warnings by following the gifisi-harness router. Scope: the
rule I name after this prompt, or every warning if I name none. This is
behavior-preserving work. The harness files are under `.gifisi/` in this
project (or `~/.gifisi-harness/` for a global install); paths below are
relative to that home.

1. Before editing code, print the task-start signal exactly in this shape:
   [GIFISI-HARNESS] Task Type: Quality gates | Playbook: Refactoring
   Reason: <one sentence on why this is a behavior-preserving burndown>
   Done Predicate: <the lint command reports 0 warnings for the scoped rule
   (or the count agreed at the decision gate), and typecheck, tests and
   build pass, each from a fresh run>
2. Open `core/playbooks/refactoring.md` and copy its numbered Steps verbatim into
   your todo list. Execute them in order.
3. Load `core/skills/quality-gates/SKILL.md` for the burndown and ratchet rules,
   `core/skills/blast-radius/SKILL.md` before changing shared code, and
   `core/skills/correct/SKILL.md` when the same mistake class shows up twice.
4. Ground truth: take commands from .gifisi/project.json, run lint now with
   full per-line output, and report the count by rule and by file. Never
   reuse a number from memory, a commit message or an earlier run.
5. Decision gate, before fixing the risky area: name the single riskiest or
   most expensive slice of the backlog with real numbers (files, lines,
   estimated new modules). Offer three options:
   A. fix every violation fully (the default if I do not answer);
   B. fix the cheap majority and track the rest as visible debt, each with a
      scoped exception and an issue reference, never a silent suppression;
   C. re-scope or loosen the rule, stated plainly as a config change and
      never presented as cleaner code.
   Keep working on everything outside that slice while you wait.
6. Success criteria as commands with expected output: lint shows 0 for the
   rule (or the agreed count), typecheck clean, tests green, build passes,
   zero behavior change. A fix that is not a pure mechanical extraction,
   rename or move leaves this burndown and becomes its own flagged item.
7. Group the work into ordered, file-disjoint waves. For each task: id,
   files, depends-on, and the pitfalls list. If you can spawn subagents,
   give each task to one with a brief that holds its own copy of the
   pitfalls (a subagent sees only its brief); one writer per file;
   lockfiles, shared config and the decision log stay with you. Without
   subagents, run the waves yourself in the same order.
8. Pitfalls to copy into every brief, plus any found on the way: files near
   the 350-line ceiling have no slack; a lint cache may not invalidate on
   config change; an extraction can widen an inferred type; a shared test
   fixture has many callers.
9. After each wave, review the diff with `core/skills/code-review/SKILL.md`
   lenses that match the files changed, plus a security lens for anything
   touching auth, money or user data.
10. Ratchet: when a count drops, lower the recorded baseline in the same
    change; at zero, set the rule back to error.
11. Log baseline, the gate decision, each wave and the final verify with
    `node .gifisi/scripts/log-decision.mjs <phase> "<decision>" "<why>"
    "<evidence>" "<result>"`.
12. Final checklist, each box ticked only from a command you just reran:
    lint count, typecheck, tests, build, the list of every suppression added
    with its reason (or empty), the list of non-mechanical fixes pulled out
    (or empty), and the review result for each wave.

Do not raise ceilings, add broad ignores or delete tests. Commit locally per
wave; do not push.
```

## Expected result

- The `[GIFISI-HARNESS]` header and the refactoring steps as the todo list.
- A fresh per-rule and per-file count, then a decision gate naming the riskiest slice with real numbers and options A, B and C.
- File-disjoint waves, each reviewed, with pitfalls copied into every brief.
- A lowered baseline or the rule back at error, plus decision-log rows for each phase.
- A final checklist where every box comes from a rerun: lint count, typecheck, tests, build, suppressions added, and non-mechanical fixes set aside.

## Source

- `docs/prompts/02-eslint-warning-burndown.md` and `docs/prompts/05-parallel-wave-dispatch.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for gifisi-harness: routed through `playbooks/refactoring.md` (the quality gates route) with `skills/quality-gates/SKILL.md`.
