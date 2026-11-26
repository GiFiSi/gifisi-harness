---
name: project-bootstrap
description: Start a new Next.js + TypeScript application with Drizzle/PostgreSQL, Zod, Pino and Vitest. PRODUCT.md first, then scaffold, install the harness with install.sh --project, the five-file docs tree, and quality gates. Load for greenfield projects and scaffold-from-scratch requests.
origin: vibe-coding-toolkit
---

# Project bootstrap

Turn a product description into a running, verified foundation. The deliverable is a project that starts on a free port, passes lint, types, tests and build without real credentials, carries the harness under `.poteto/`, and documents what was actually built. Features stay as the next tasks; bootstrap does not implement the product.

## When to use

- The user wants a new web application and the target directory is empty or holds only notes.
- The user asks to scaffold, bootstrap or start a project from scratch.
- Skip it when an application already exists in the target. Use `core/skills/project-adoption/SKILL.md` instead; bootstrap never regenerates an existing app.
- The defaults are a reference. A product requirement may override one; record the reason in `PRODUCT.md` and `docs/architecture.md`.

## Defaults

| Area | Choice | Limit |
|---|---|---|
| Application | Stable Next.js, App Router, strict TypeScript, Tailwind, ESLint, `src/`, `@/*` alias | Prefer pnpm when available; keep an existing package manager |
| Persistence | Drizzle ORM + PostgreSQL with the `pg` driver on the Node.js runtime | A product with no persistence omits it; record why |
| Validation | Zod for environment, inputs and external responses | Types are not runtime validation |
| Server code | `server-only` for environment, logger and database client | Secrets never go in `NEXT_PUBLIC_*` or client components |
| Logging | Pino with structured fields and secret redaction | Redaction does not clean free-form messages |
| Tests | Vitest in Node.js for server logic and boundaries | DOM and E2E tests arrive with the flows that need them |
| Quality | 350-line ceiling, logger and data-boundary rules | See `core/skills/quality-gates/SKILL.md` |

## Procedure

1. Inspect the target. Record directory, existing files, Git state, Node.js version, available package managers and agent client. If the target is the harness repository itself, create a sibling directory named after the product.
2. Write `PRODUCT.md` first, from `core/templates/PRODUCT.md.template`. Fill problem, audience, goal, main flows, MVP, requirements, constraints, assumptions and acceptance criteria from the user's description. Mark reversible assumptions as assumptions. Mark decisions only the user can make as open. Invent no features, integrations or credentials. Delete every template line that has no real content.
3. Check current docs before scaffolding. Run `npx create-next-app@latest --help` and read the flags it actually offers. Look up current APIs through Context7 or official docs per `core/skills/context-tools/SKILL.md`. Use stable channels only; never copy a prerelease tag from an example.
4. Scaffold. In an empty directory run `npx --yes create-next-app@latest <name> --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --disable-git --yes`, adjusting flags to the help output. If the target holds files, scaffold into a temporary directory and merge without overwriting. Initialize Git locally if needed; create no remote.
5. Install the harness: `bash <harness>/install.sh --project <path>`. It copies the harness into `.poteto/`, writes `.poteto/project.json`, `.poteto/decisions.tsv` and `.poteto/corrections.md`, splices the router into `AGENTS.md` while keeping any text the scaffold wrote there, creates `CLAUDE.md` and `.cursor/rules/poteto-harness.mdc`, and creates the five docs only where missing. It keeps the `PRODUCT.md` from step 2.
6. Install the core with the project's package manager, after checking peers: runtime `drizzle-orm pg server-only zod pino clsx tailwind-merge`; dev `drizzle-kit @types/pg @next/env vitest`. Align `@types/node` with the runtime and `@next/env` with Next.js. Never pass `--force` or `--legacy-peer-deps` to hide a conflict.
7. Copy the server core from the templates, merging with scaffold files: `core/templates/next/src/lib/env-schema.ts`, `core/templates/next/src/lib/env.test.ts`, `core/templates/next/src/lib/logger.ts`, `core/templates/next/src/db/index.ts`, `core/templates/next/src/db/schema/index.ts`, `core/templates/next/drizzle.config.ts`, `core/templates/next/vitest.config.mts`. Keep the paths under `src/`. Write a `.env.example` with variable names only and make sure Git keeps it. The schema starts with no invented tables; the pool is created lazily so build and tests need no database.
8. Apply quality gates per `core/skills/quality-gates/SKILL.md`: `core/templates/eslint/eslint.config.mjs` to `<project>/eslint.config.mjs`, `core/templates/eslint/eslint-rules/index.cjs` to `<project>/eslint-rules/index.cjs`, `core/templates/eslint/verify-quality-rules.mjs` to `<project>/scripts/verify-quality-rules.mjs`. Point the data-boundary rule at `src/db` and the logger exception at `src/lib/logger.ts`.
9. Wire scripts in `package.json`: `dev`, `build`, `start`, `lint` (`eslint .`), `typecheck` (`next typegen && tsc --noEmit` where supported, else `tsc --noEmit`), `lint:rules` (`node scripts/verify-quality-rules.mjs`), `test` (`vitest run`), `test:watch`, `db:generate`, `db:migrate`, and `check` chaining lint, typecheck, lint:rules, test and build. `check` never connects to a database or applies migrations.
10. Rerun `bash <harness>/install.sh --project <path>` so `.poteto/project.json` picks up the real commands and the ESLint config (`maxLinesRule: true`). Run it once more and confirm the output ends with `writes=0`. The installer fills the `AGENTS.md` Commands table only when it creates the file, so it still shows the commands of step 5 ("not configured" for scripts added in step 9). Update that table, outside the managed markers, so each row matches `.poteto/project.json`. If the scaffold shipped its own `AGENTS.md`, the installer kept it and added only the router block: merge the sections of `core/templates/AGENTS.project.md.template` into it outside the markers, keeping the scaffold's own rules.
11. Fill the docs tree from facts: `docs/architecture.md` (structure that exists, boundaries, data), `docs/design.md` (visual direction, accessibility criteria), `docs/onboarding.md` (local setup, env vars, database, first workflow), `docs/quality.md` (what each check proves and when to run it), `docs/setup.md` (harness revision, versions, sources, dates, each item marked validated, configured without execution, or pending). Label plans as plans.
12. Verify. Run `check`, `node .poteto/scripts/quality-gate.mjs --root .`, `node .poteto/scripts/validate-project.mjs --root .`, and `db:generate` once a table exists (inspect the SQL). Start the dev server on a free port, request `/`, confirm the page content, then stop only that process. Add a first entry to `.poteto/feature-map.json` for the home page per `core/skills/create-verification-skill/SKILL.md` and run `node .poteto/scripts/verify-feature-map.mjs`.
13. Log the trail: `node .poteto/scripts/log-decision.mjs setup "<decision>" "<why>" "<command>" "<result>"` for the scaffold, core install, gates and final verification.

## Guardrails

- Do not publish, push, create remote services, buy anything or apply migrations to a real database without the user's OK.
- Do not add Git hooks, branch protection or push blockers.
- Do not copy the harness repository into the app beyond what `install.sh --project` writes.
- A missing account or optional tool blocks only its own capability. Record it as pending in `docs/setup.md` and continue.

## Output

- The project path, the dev command, and the URL that served the verified page.
- `check`, quality gate, `validate-project` and feature-map results, each with the command and pass count.
- Changed and created files: `PRODUCT.md`, `AGENTS.md`, `CLAUDE.md`, the five docs, `.poteto/` artifacts, core sources and configs.
- Open decisions from `PRODUCT.md`, pending capabilities from `docs/setup.md`, and the next MVP task.

## Source

- `docs/04-project-bootstrap.md`, `docs/06-project-defaults.md` and `docs/prompts/11-next-project-bootstrap.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- `templates/next/`, `templates/eslint/`, `templates/product.md.template` and `templates/project-docs/`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for poteto-harness: harness install via `install.sh --project`, `.poteto/` artifacts, and feature-map verification.
