# 06 File size refactor

## When to use

Use this prompt after the 350-line gate is installed and measured (`core/prompts/07-quality-gates-install.md`) and it reports files over the ceiling. The agent splits the largest files by responsibility, one file per commit, keeping every public export name and signature, and proves behavior is unchanged with a characterization capture taken before the first edit.

It is size work only. For a general lint warning burndown use `core/prompts/09-lint-warning-burndown.md`. The default batch is three files; the agent stops after the batch and reports.

## Prompt

```text
Split the files that exceed this project's 350-line ceiling by following the
gifisi-harness router. This is behavior-preserving refactoring: no feature
change, no rewrite. The harness files are under `.gifisi/` in this project
(or `~/.gifisi-harness/` for a global install); paths below are relative to
that home.

1. Before reading or editing code, print the task-start signal exactly in
   this shape:
   [GIFISI-HARNESS] Task Type: Refactoring | Playbook: Refactoring
   Reason: <one sentence on why this is a behavior-preserving split>
   Done Predicate: <the quality gate reports none of the batch's files over
   350 lines and no new violation, the characterization capture is
   identical before and after, and the project's lint, typecheck and tests
   pass>
2. Open `core/playbooks/refactoring.md` and copy its numbered Steps verbatim into
   your todo list. Execute them in order.
3. Load `core/skills/architect/SKILL.md` when you name the target shape,
   `core/skills/blast-radius/SKILL.md` when you check callers, and
   `core/skills/no-comments/SKILL.md` before you commit.
4. Ground truth now: take the lint, typecheck and test commands from
   .gifisi/project.json and run them, then run
   `node .gifisi/scripts/quality-gate.mjs` (and the project's max-lines lint
   rule if it has one). List every file over the ceiling with its real line
   count, largest first. Never use a count from memory or an earlier message.
5. Batch: take the three largest files and no others. For each, before
   editing, state its responsibility in one sentence, the seams you found,
   the one you will cut on, and its public exports.
6. Cut on responsibility, never on line count. Seams to look for, in this
   order: business logic inside a UI or route file becomes a domain module;
   a repeated UI block becomes a subcomponent; data access becomes a
   repository or adapter; a cluster of helpers serving one concept becomes
   a module named for that concept. A file named utils, helpers, misc or
   common that holds leftovers is a failure. If a file is one cohesive
   implementation with no seam, say "no natural seam", leave it, and move
   on.
7. Keep the interface: the original file still exports the same names with
   the same signatures, preferably by re-exporting from the new modules.
   Rewrite import sites only when the original file is meant to disappear,
   and say so before you do it.
8. One file at a time: split, run typecheck, tests, lint and the quality
   gate, confirm the file is no longer reported and no new violation
   appeared anywhere (an extracted module can itself cross the ceiling, and
   an extraction can change an inferred type), then commit locally with a
   message naming the file and the seam. Fix any failure before the next
   file.
9. Log baseline, pin, each split and the final verify with
   `node .gifisi/scripts/log-decision.mjs <phase> "<decision>" "<why>"
   "<evidence>" "<result>"`.
10. After the batch, stop. Report the files split and their seams, the files
    left alone and why, and the quality gate output from a final run.

Do not push. Do not raise the ceiling or add an ignore to make a file pass.
```

## Expected result

- The `[GIFISI-HARNESS]` header and the refactoring steps as the todo list.
- A ground-truth list of oversized files from a fresh run, largest first.
- Up to three files split by responsibility, one local commit each, with original exports preserved.
- An identical characterization capture before and after, and passing typecheck, tests and lint after every file.
- A final report with the seams used, files deliberately not split, the quality gate output from a fresh run, and the decision-log rows.

## Source

- `docs/prompts/09-file-size-refactor.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for gifisi-harness: routed through `playbooks/refactoring.md`, with the characterization pin and the harness quality gate replacing the upstream command fields.
