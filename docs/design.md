# Design

This document records why the harness is shaped the way it is. Each section states the choice, the reason, and the cost we accepted.

## Router design

Choice: one always-on router, rendered from `core/harness/router.md`, at or below 149 lines. It tells the agent that every `scripts/`, `core/skills/`, `core/playbooks/`, `core/principles/` or `core/templates/` path written inside a harness file is relative to the harness home (empty in this repository, `.poteto/` in a project, `<home>/.poteto-harness/` globally), and it writes each script call with that prefix and in quotes, such as `node ".poteto/scripts/classify-task.mjs"`, so a home path with spaces stays one argument. It holds the classification rule, the routes table, the done-predicate rules, a one-line index of the 24 principles, the correction ladder, the decision-trail rule, project facts and autonomy limits. Nothing else loads at session start.

Reason: every harness we target reads one always-on instruction file (`AGENTS.md`, `CLAUDE.md`, a Cursor rule with `alwaysApply: true`). Slash commands differ between harnesses and require the user to remember them. A router that the agent applies to every prompt needs no user action and behaves the same everywhere.

Cost: the router competes for attention with everything else in the context. We keep it short, put the header format in a code block, and make the first required action (print the header) observable, so a skipped routing step is visible to the user.

## Classification

Choice: the agent classifies each prompt itself against the routes table. Trivial work (an answer from known context, one obvious edit with no behavior change) skips the header. When two routes fit, `node scripts/classify-task.mjs "<prompt>"` ranks them by keyword signals across the 30 routes in `core/harness/routes.json`. Signals are in English and Portuguese. Each matched signal scores its word count, so phrases outrank single words. Among equal scores, the route whose first matched signal appears earliest in the prompt wins (in "add a fix for the crash", the leading "add" puts Feature ahead of Bug fix), then file order. A prompt with no match falls back to the Multi-phase plan route with `core/skills/figure-it-out/SKILL.md`.

Reason: keyword scoring is deterministic and testable, and it is good enough to break ties. The final choice stays with the agent, which can read intent that keywords miss. Several task types share a playbook on purpose (Quality gates, Correction and Refactoring all use `core/playbooks/refactoring.md`; Code review, Security review and Investigation all use `core/playbooks/investigation.md`; Feature and Formal verification both use `core/playbooks/feature.md`), with different skills loaded per route.

Cost: keyword signals miss paraphrases. The header makes a misroute visible, and a task that changes type midway gets a new header.

## The task-start signal

Choice: before reading or editing code on a non-trivial task, the agent prints:

```text
[POTETO-HARNESS] Task Type: <category> | Playbook: <selected playbook>
Reason: <1 sentence why this playbook fits>
Done Predicate: <exact verifiable condition on the real artifact>
```

It then copies the playbook's numbered steps verbatim into its todo list and runs them in order.

Reason: the header forces two decisions before any work: which procedure applies, and what observation will prove the work is done. Copying steps verbatim stops the agent from paraphrasing away the hard ones (reproduce first, failing test first, verify live).

Cost: three lines of output per task. The trivial-work exemption keeps this off one-line edits and questions.

## Context protection

Choice: content loads by path, one file at a time. One playbook per task. A skill loads when the step that uses it starts. A principle file loads when the agent cites it. The router tells the agent never to bulk-read harness folders, and to route large reads and fan-out to subagents when the harness has them.

Reason: pstack and the toolkit together are hundreds of pages. Loading them all would crowd out the code the agent is working on. The router's principle index gives the agent enough to know which principle applies without loading 24 files.

Cost: the agent needs a tool to read files, which all three target harnesses have.

## Done predicates and live verification

Choice: every non-trivial task names its real artifact and the command or observation that proves the outcome. Live behavior is checked on the user's surface through `.poteto/feature-map.json`, run by `node scripts/verify-feature-map.mjs`, which starts the app on a free port, waits for its ready path, runs HTTP or CLI checks and always stops the app. A predicate the agent cannot observe is reported as `INCONCLUSIVE`.

Reason: "unit tests pass" is the most common false done signal. The Feature Map turns "it works" into a rerunnable command that any agent or reviewer can run.

Cost: someone has to write and maintain the Feature Map. `core/skills/create-verification-skill/SKILL.md` and `core/skills/maintain-verification-skill/SKILL.md` carry that procedure.

## Correction ladder

Choice: when the user corrects the agent, or a mistake class happens twice, the fix goes to the highest tier that works:

1. Architecture: make the mistake impossible (one owner per state, one supported path, delete the old way).
2. Lint or test: a check whose failure message names the fix, proven to fail on the real past mistake.
3. Text: a row in `.poteto/corrections.md` that pairs a judgment-call rule with what enforces it.

Reason: a sentence in an instruction file is the weakest guard. It is easy to skip and costs context on every session. A lint or test runs every time and costs nothing until it fires. `core/principles/encode-lessons-in-structure.md` states the same rule.

Cost: tiers 1 and 2 take more work than writing a sentence. `core/skills/correct/SKILL.md` keeps that work bounded to one mistake class at a time.

## Decision trail

Choice: non-trivial work appends rows to `.poteto/decisions.tsv` with six columns: `ts`, `phase`, `decision`, `why`, `evidence`, `result`. The signal header, each fork, each verification and each revert get a row. Evidence is a pointer (path, `file:line`, commit, command), never a paragraph. The file is append-only; a wrong row is corrected by a superseding row.

Reason: a reviewer reading the work later needs the reasoning, not a narrative. TSV opens in any spreadsheet and diffs cleanly. `scripts/log-decision.mjs` escapes tabs and newlines and guards cells that start with a formula character.

Cost: one command per decision. The script makes each append a single line.

## Harness-agnostic choices

| Choice | Reason | Tradeoff |
|---|---|---|
| `AGENTS.md` holds the router; `CLAUDE.md` only imports it | One source, read natively by Codex and through the import by Claude Code | Harnesses that ignore both files see nothing |
| Cursor gets an owned `.mdc` rule with `alwaysApply: true` | Cursor loads project rules without user action | The global rule file may need adding in Cursor Settings; the installer does not verify loading |
| Skills are plain Markdown loaded by path | Works in every harness with a file-read tool | No automatic skill discovery or triggering |
| Capabilities are described, not named | "Spawn a subagent if your harness has one, otherwise do it inline" works everywhere | Less precise than vendor-specific instructions |
| Zero npm dependencies, Node 18 ESM | Install works offline and on any machine with Node | Some helpers (frontmatter parsing, globbing) are written by hand |
| Managed markers instead of whole-file ownership | User content in shared files survives every install | Splicing must preserve line endings and bytes; `scripts/check-install.mjs` proves it |
| Optional external tools (Context7, Graphify, RTK) | Useful when present; nothing breaks when absent | Hooks and skills must check presence before use |

## Source

- `pstack/skills/poteto-mode/SKILL.md`, `pstack/skills/poteto-mode/worker.md`, `pstack/skills/correct/SKILL.md`, `pstack/skills/show-me-your-work/SKILL.md` and `pstack/docs/guide/02-poteto-mode.md`, pstack by Lauren Tan (MIT): routing, the playbook step contract, the correction ladder and the decision log.
- `templates/project-docs/design.md.template` and `README.pt-BR.md`, Vibe Coding Toolkit by Matheus Gomes (MIT): design document layout and the working agreements.
