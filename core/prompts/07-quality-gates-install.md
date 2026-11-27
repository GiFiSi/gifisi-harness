# 07 Quality gates install

## When to use

Use this prompt to install the ESLint quality gates in a JavaScript or TypeScript project: a flat config with the 350-line ceiling and the local quality rules, copied from tested templates, plus a self-check that proves the copy works. The job is to install and measure. No violation is fixed in this task; splitting oversized files is `core/prompts/06-file-size-refactor.md` and clearing warnings is `core/prompts/09-lint-warning-burndown.md`.

Projects without JavaScript use their native linter. The prompt does not install ESLint just to satisfy a checklist.

## Prompt

```text
Install this project's quality gates by following the gifisi-harness
router. The harness files are under `.gifisi/` in this project (or
`~/.gifisi-harness/` for a global install); paths below are relative to that
home.

1. Before reading or editing code, print the task-start signal exactly in
   this shape:
   [GIFISI-HARNESS] Task Type: Quality gates | Playbook: Refactoring
   Reason: <one sentence on why this installs and measures a lint gate>
   Done Predicate: <the rule self-check exits 0, the lint command runs and
   reports a per-rule violation count with each new rule's severity set from
   that count, and no source file outside lint config and package scripts
   changed>
2. Open `core/playbooks/refactoring.md` and copy its numbered Steps verbatim into
   your todo list. This task installs and measures only, so mark steps 4, 5,
   6 and 7 as "n/a: install-only task" and execute the rest in order. Step 1
   is the baseline, step 2 pins the current lint output, step 8 is the
   measured gate.
3. Load `core/skills/quality-gates/SKILL.md` and follow its procedure through
   the measuring and logging steps. It names the template files, where each
   goes, and the order. Load `core/skills/correct/SKILL.md` only if you add a rule
   for a mistake that already repeated.
4. Read the project before changing anything and report: package manager,
   ESLint version and existing config, TypeScript and path aliases, source
   root, presentation directories, the data client module and binding, and
   the log adapter. On ESLint 8 or older, stop and report instead of
   upgrading silently. Take commands from .gifisi/project.json.
5. Baseline with no install: `node .gifisi/scripts/quality-gate.mjs --root .`
   and the existing lint command. Record the counts.
6. Copy the rule files byte for byte; do not reformat, convert or improve
   them. Merge into an existing eslint.config.mjs instead of replacing it,
   and keep every existing rule and severity. Remove a quality rule whose
   boundary this project does not have (no data module, no log adapter)
   instead of inventing one.
7. Install dev dependencies with the project's package manager, matching
   majors for eslint and @eslint/js. Never force past a peer conflict.
8. Run the self-check and require exit 0. Wire lint, lint:fix and lint:rules
   scripts without removing existing ones.
9. Measure: run lint with full per-file output. A new rule with zero
   violations stays error; a rule with violations goes to warn with the
   count written beside it as the baseline.
10. Log the baseline and the measure as `baseline` rows, the install as a
    `setup` row and the self-check as a `verify` row, each with
    `node .gifisi/scripts/log-decision.mjs <phase> "<decision>" "<why>"
    "<command>" "<counts>"`.

Do not fix any violation. Do not raise the 350 ceiling, add broad ignores
or disable comments, or delete tests. Do not add Git hooks. Do not push.
```

## Expected result

- The `[GIFISI-HARNESS]` header and the refactoring steps as the todo list, with steps 4 to 7 marked not applicable.
- The rule files copied, the config merged, dev dependencies installed with matching majors, and the self-check exiting 0.
- A report: rules installed, rules removed and why, violation count per rule with its severity and baseline, files over 350 lines largest first, and the commands to run the gate.
- Decision-log rows for baseline, install, self-check and measure, and no change to application source.

## Source

- `docs/prompts/08-eslint-quality-gates-install.md` and `docs/tools/06-eslint-biome-quality-gates.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for gifisi-harness: routed through `playbooks/refactoring.md` (the quality gates route) and `skills/quality-gates/SKILL.md`.
