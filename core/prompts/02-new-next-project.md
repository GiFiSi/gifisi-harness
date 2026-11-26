# 02 New Next.js project

## When to use

Use this prompt to start a new application from an idea: `PRODUCT.md` first, then a Next.js App Router foundation in TypeScript with Drizzle and PostgreSQL, Zod, Pino and Vitest, the poteto-harness installed into the project, the five-file `docs/` tree, and the 350-line quality gate. Write the product description after the prompt: name, problem, audience, main flows and constraints.

Do not use it on an existing application. An existing codebase keeps its stack; use `core/prompts/03-existing-project-adoption.md`. If the machine itself is not ready (no Node.js LTS, no package manager), run `core/prompts/01-machine-setup.md` first.

## Prompt

```text
Create a new project foundation by following the poteto-harness router. Use
the product description I write after this prompt. If it is missing, ask me
for it once and do nothing else until I answer.

The harness is not installed in the new project yet, so read harness files
from the harness checkout or the global harness home (`~/.poteto-harness/`).
After step 6 they are also under `.poteto/` in the project. Paths below are
relative to the harness home.

1. Before reading or editing code, print the task-start signal exactly in
   this shape:
   [POTETO-HARNESS] Task Type: New project | Playbook: Multi-phase plan
   Reason: <one sentence on why this is a greenfield setup>
   Done Predicate: <the project's lint, typecheck, tests and build pass,
   `node .poteto/scripts/validate-project.mjs` exits 0, and the dev server
   answers its home route on a free port>
2. Open `core/playbooks/multi-phase-plan.md`, take the setup branch, and copy its
   numbered Steps verbatim into your todo list. Execute them in order.
3. Load `core/skills/project-bootstrap/SKILL.md` and follow its phases. Load
   `core/skills/quality-gates/SKILL.md` when you reach linting, and
   `core/skills/context-tools/SKILL.md` only if I want Context7, Graphify or RTK.
4. Destination: the directory I name, or the current directory. If the
   current directory is the poteto-harness repository itself, create a
   sibling folder named after the project instead. Never overwrite existing
   files; in a non-empty destination scaffold into a temporary directory and
   merge without overwriting.
5. Write PRODUCT.md from the product template first: problem, audience, MVP,
   flows, requirements, constraints, assumptions, acceptance criteria. Use
   reversible assumptions for missing details and mark external decisions as
   pending. Do not invent features, integrations or credentials.
6. Scaffold with the stable create-next-app (App Router, TypeScript,
   Tailwind, ESLint, src/, @/* alias), checking current flags in official
   docs. Prefer pnpm when available. Then install the harness into the
   project: `bash install.sh --project <dir>` from a harness checkout, or
   `node ~/.poteto-harness/scripts/sync-harnesses.mjs --project <dir>` from a
   global install. Run it a second time and confirm it reports writes=0.
7. Add the default core from the skill: Drizzle with pg for persistence,
   Zod, Pino, Vitest, with the env schema, logger, lazy bounded database pool
   and Vitest config from `core/templates/next/`. Builds and tests must pass
   without database credentials. Do not invent tables and do not run
   migrations against any database I did not name.
8. Fill PRODUCT.md and docs/architecture.md, docs/design.md,
   docs/onboarding.md, docs/quality.md and docs/setup.md with facts from the
   product and the code, never with claims about checks that did not run.
   Keep AGENTS.md short and let CLAUDE.md import it.
9. Install the quality gate per the quality-gates skill: 350-line ceiling,
   then measure. Wire lint, typecheck, test, build and check scripts.
10. Verify: run lint, typecheck, tests and build; start the dev server on a
    free port and fetch the home route; run
    `node .poteto/scripts/validate-project.mjs`; stop every process you
    started.
11. Log each phase with `node .poteto/scripts/log-decision.mjs setup
    "<phase>" "<why>" "<command>" "<result>"`.

Ask before global installs, accounts, paid services, publishing, pushing or
any outbound message. Do not add Git hooks or branch protections. Do not
build the whole product: deliver the foundation and name the first MVP task.
```

## Expected result

- The `[POTETO-HARNESS]` header and the setup-branch steps as the todo list.
- `PRODUCT.md` with assumptions and pending decisions marked.
- A Next.js TypeScript foundation with Drizzle, Zod, Pino and Vitest that builds and tests without credentials.
- The harness installed under `.poteto/`, a second install run reporting `writes=0`, and `validate-project.mjs` exiting 0.
- The five `docs/` files filled from facts, the quality gate installed with its measured baseline, and a decision-log trail.
- A final reply with the run command, evidence for each check, open items, and the next MVP task.

## Source

- `docs/prompts/11-next-project-bootstrap.md`, `docs/04-project-bootstrap.md` and `docs/06-project-defaults.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for poteto-harness: routed through the router header and `playbooks/multi-phase-plan.md`, installs the harness with the poteto-harness installer, and drops the upstream vendor skill catalog.
