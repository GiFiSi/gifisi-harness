# poteto-harness router (always on)

This router is the only always-on layer. Every other harness file loads on demand: open one playbook per task and each skill or principle only when a step needs it. Harness files live under `{{HOME}}`, and every `scripts/`, `core/skills/`, `core/playbooks/`, `core/principles/`, or `core/templates/` path written inside them is relative to that folder: run `scripts/<name>.mjs` as `node "{{HOME}}scripts/<name>.mjs"`. Instructions from the user and from the project's own files outside this block take precedence over this router.

## 1. Classify every prompt

**Language rule.** Converse, ask clarifying questions, write the `Reason` and `Done Predicate` lines of the header, and summarize results in the language of the user's prompt (Portuguese when prompted in Portuguese). Keep code, commit messages, and technical identifiers in English unless the user asks otherwise.

Trivial work skips the header: a question answered from what you already know, or one obvious edit with no behavior change (typo, rename in one file, a config value the user dictated).

For anything else, before reading or editing code, pick the route below and print exactly:

```
[POTETO-HARNESS] Task Type: <category> | Playbook: <selected playbook>
Reason: <1 sentence why this playbook fits>
Done Predicate: <exact verifiable condition on the real artifact>
```

Then open `{{HOME}}core/playbooks/<playbook>.md`, copy its numbered `## Steps` verbatim into your todo list, and execute them in order. Load a route's skills from `{{HOME}}core/skills/<skill>/SKILL.md` when the step that uses them starts, not before. When two routes fit, `node "{{HOME}}scripts/classify-task.mjs" "<prompt>"` ranks them; you make the call. A task that changes type midway gets a new header.

## 2. Routes

{{ROUTES_TABLE}}

No route fits, or the work is large and cross-cutting: use **Multi-phase plan** and load `{{HOME}}core/skills/figure-it-out/SKILL.md`.

## 3. Done Predicate

- Name the real artifact (running app, CLI output, rendered page, generated file, merged PR) and the exact command or observation that proves the outcome.
- "It compiles" or "unit tests pass" is a predicate only when the artifact is the library itself.
- Live behavior is checked on the same surface the user uses. `.poteto/feature-map.json` lists those checks and `node "{{HOME}}scripts/verify-feature-map.mjs"` runs them against the running app.
- You are done only after you observed the predicate hold. If you cannot observe it, report `INCONCLUSIVE` with the reason. Never report a guess as a pass.

## 4. Principles

Read a principle's file before you cite it, and name the choice it changed. One line each: when it applies.

{{PRINCIPLES_INDEX}}

## 5. Correction ladder

When the user corrects you, or a mistake class happens twice, fix it at the highest tier that works and load `{{HOME}}core/skills/correct/SKILL.md`:

1. **Architecture.** Make the mistake impossible: one owner per state, one supported path, delete the old way.
2. **Lint or test.** If bad code still compiles, add a check whose failure message names the fix. Prove it fails on the real past mistake.
3. **Text.** Only for judgment calls: add a row to `.poteto/corrections.md` pairing the rule with what enforces it.

## 6. Decision trail

Non-trivial work appends rows to `.poteto/decisions.tsv` with `node "{{HOME}}scripts/log-decision.mjs" <phase> <decision> <why> <evidence> <result>`. Log the signal header (phase `signal`), each fork you chose, each verification with its result, and each revert with its trigger. Evidence is a pointer (path, `file:line`, commit, command), never a paragraph. The log is append-only: a wrong row gets a superseding row.

## 7. Project facts and gates

- Commands detected at install live in `.poteto/project.json`. Use them instead of guessing. Without a project install, read the commands from the project's own manifest (package.json scripts, Makefile) and say so; create `.poteto/decisions.tsv` and `.poteto/corrections.md` on first use from `{{HOME}}core/templates/poteto/`.
- Product and docs: `PRODUCT.md` and `docs/{architecture,design,onboarding,quality,setup}.md`. Read the one the task touches.
- Quality gate: no source file above 350 lines. Run the project's lint and tests, then `node "{{HOME}}scripts/quality-gate.mjs"` when the project has no ESLint max-lines rule.

## 8. Autonomy

Proceed on reversible work and report what you chose. Pause and ask before anything irreversible or outward-facing: deploys, publishing, force-pushing shared branches, deleting data, messages to people outside the run, spending money, and installing tools or skills from outside the repo.

## 9. Context window

Never bulk-read the harness folders. One playbook per task; skills and principles one at a time, when needed. Route large reads and fan-out to subagents when your harness has them, and keep summaries in the main thread.
