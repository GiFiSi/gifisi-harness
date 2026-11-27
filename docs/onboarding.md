# Onboarding

This page is for people who change the harness itself. To use the harness in a project, see [setup.md](setup.md).

## Working in this repository

1. Read [CONTRIBUTING.md](CONTRIBUTING.md). It defines the file formats, the path convention and the content the validator rejects.
2. The router in `AGENTS.md` applies here too. Non-trivial changes get the `[GIFISI-HARNESS]` header, a playbook and rows in this repository's `.gifisi/decisions.tsv`.
3. Edit sources, never generated output. The managed block in `AGENTS.md`, all of `CLAUDE.md` and `.cursor/rules/gifisi-harness.mdc` are generated from `core/harness/router.md`, `core/harness/routes.json` and `core/harness/manifest.json`.
4. Before you hand back a change, run `node scripts/validate-harness.mjs`. Run `node scripts/check-install.mjs` when you touch the installer or anything it copies, and `node scripts/run-autonomous-smoke-test.mjs` when you touch routes, playbook steps or the project scripts.

## Add a playbook

1. Add `{ "name": "<name>", "title": "<Title>" }` to `playbooks` in `core/harness/manifest.json`.
2. Write `core/playbooks/<name>.md` with the frontmatter (`name`, `title`, `summary`, `skills`, `principles`) and the sections `When to use`, `Done Predicate`, `Steps`, `Step notes`, `Reply`, `Source`. `Steps` is a numbered list of 3 to 12 single-line items of at most 320 characters each.
3. Make it reachable: add a route to `core/harness/routes.json` with an `id`, `taskType`, `playbook`, `skills` and `signals`, or point an existing route at it. The validator fails on any playbook no route reaches.
4. Choose signals that are specific. Multi-word phrases score higher than single words in `scripts/classify-task.mjs`. Check the ranking with `node scripts/classify-task.mjs "<a realistic prompt>" --top 3`.
5. Regenerate the router (below) and confirm all three renders stay at or below 149 lines.

Follow `core/playbooks/authoring-a-skill.md` for the writing itself. It applies to playbooks as well as skills.

## Add a skill

1. Add `{ "name": "<name>", "origin": "<origin>" }` to `skills` in `core/harness/manifest.json`. Origin is `pstack`, `vibe-coding-toolkit` or `gifisi-harness`.
2. Write `core/skills/<name>/SKILL.md` with frontmatter (`name`, a one-line `description` under 400 characters, `origin`) and the sections `When to use`, `Procedure` (at least three numbered steps), `Output`, `Source`.
3. Put supporting files in `core/skills/<name>/references/` or `core/skills/<name>/scripts/`. Every file the skill names must exist.
4. Wire it in: list it in the `skills` of the routes or playbooks whose steps load it. A skill nothing loads is dead weight.
5. Load `core/skills/technical-writing/SKILL.md` and `core/skills/unslop/SKILL.md` while you write it.

## Add a principle

1. Add an entry to `principles` in `core/harness/manifest.json` with `name`, `title`, `group` (`Core`, `Architecture`, `Verification`, `Delegation` or `Meta`) and a one-line `applies_when`.
2. Write `core/principles/<name>.md` with frontmatter that repeats the manifest entry exactly, including `applies_when`, and the sections `Rule`, `When it applies`, `How to apply`, `Smells`, `Check`, `Source`.
3. Regenerate the router. Each principle adds one line to the router index, so check the line count.

## Add a prompt or template

- Prompts: add the file name to `prompts` in the manifest, write `core/prompts/<NN>-<name>.md` with `When to use`, `Prompt` (one fenced block) and `Expected result`, and add a row to [core/prompts/README.md](../core/prompts/README.md).
- Templates: add the path to `templates` in the manifest. Use only the tokens listed in `templateTokens`; the installer substitutes each one.

## Regenerate the router

```bash
node scripts/sync-harnesses.mjs --repo          # rewrite AGENTS.md block, CLAUDE.md, the Cursor rule
node scripts/sync-harnesses.mjs --repo --check  # exit 1 if any generated file drifted
node scripts/sync-harnesses.mjs --print-router project   # inspect one render
```

`npm run sync` runs the first command. The validator runs the drift check and measures the repo, project and global renders.

## Rules of thumb

- Rewrite upstream material in your own words, keep its rigor and credit it in `## Source`.
- Describe capabilities, not products: "spawn a subagent if your harness has one, otherwise do the step inline".
- Load skills by path. Never write a slash followed by a skill name.
- Keep every code file at or below 350 lines and free of npm dependencies.

## Source

- `docs/02-playbook-onboarding.md` and `templates/project-docs/onboarding.md.template`, Vibe Coding Toolkit by Matheus Gomes (MIT): onboarding layout.
- `pstack/docs/guide/09-make-it-yours.md`, pstack by Lauren Tan (MIT): extending playbooks and skills and testing a skill change.
