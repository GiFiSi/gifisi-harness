# PRODUCT: poteto-harness

## Problem

Coding agents drift on non-trivial work. They start editing before they know what done looks like, report "tests pass" when the user-facing behavior is still broken, repeat the same mistake after being corrected, and leave no record of why they chose what they chose. Two good answers exist as separate projects. pstack has rigorous playbooks, principles and skills but depends on one vendor's slash commands and agent knobs. The Vibe Coding Toolkit covers machine setup, project bootstrap, brownfield adoption, a documentation layout and lint gates, but has no routing layer that runs on its own. Loading either one in full into every session wastes the context window.

## Users

- A developer who works across Claude Code, Codex and Cursor and wants the same behavior in each.
- A developer who starts new Next.js projects and wants the toolkit defaults, docs tree and quality gate from day one.
- A team adopting agents in an existing repository that must keep its stack, database, tests and lint setup untouched.
- A reviewer who reads an agent's work after the fact and needs evidence, not a narrative.

## Outcome

A user writes a plain request. The agent classifies it, prints a visible `[POTETO-HARNESS]` header with a verifiable done predicate, follows one playbook step by step, loads only the skills that step needs, proves the outcome on the real artifact and leaves an auditable row trail in `.poteto/decisions.tsv`.

## MVP scope

In scope:

- An always-on router under 150 lines, rendered into `AGENTS.md`, a `CLAUDE.md` import bridge and an always-apply Cursor rule. No slash commands.
- 22 playbooks, 24 principles and 31 skills, each complete and loaded by path on demand.
- Nine paste-ready prompts and the project templates: `PRODUCT.md`, the five-file `docs/` tree, the ESLint gate with `max-lines` at 350, hook templates for Context7, Graphify and RTK, and the Next.js foundation.
- `install.sh` with `--project <path>` and `--global [--home DIR]`, idempotent through managed markers and write-if-different copies.
- Project artifacts: `.poteto/decisions.tsv`, `.poteto/feature-map.json`, `.poteto/project.json`, `.poteto/corrections.md`.
- Scripts that classify a prompt, append to the decision log, run Feature Map checks against a live app, enforce the 350-line gate and validate an install.
- Three proof commands: repository validation, install idempotency and an autonomous smoke test.

Out of scope:

- A package registry release or an npm dependency of any kind.
- Installing or configuring external tools (Context7, Graphify, RTK, editors, language runtimes) without the user's OK.
- Replacing a project's own test runner, linter or CI.
- A hosted service, telemetry or any network call during install.

## Constraints

- Node 18 or newer, ESM, zero npm dependencies.
- Works on Windows with Git Bash and on Linux and macOS. Paths given as `/tmp/...` resolve to the same directory for bash and Node.
- Every code file is at most 350 lines.
- The installer preserves user content outside managed markers byte for byte, including CRLF line endings, and never edits `package.json`, lockfiles, tests, lint configs, source files or `.gitignore`.
- Content is harness-agnostic: no vendor model names, vendor-only agent options or slash-command invocations.
- Upstream material is adapted in our own words and credited in the `## Source` section of every adapted file in `core/playbooks/`, `core/principles/`, `core/skills/`, `core/prompts/` and `docs/`, and in `THIRD_PARTY_NOTICES.md`, which also lists the upstream path of each adapted template.

## Acceptance criteria

The work is done only when all three hold, each observed from a real run:

1. `node scripts/validate-harness.mjs` exits 0. It verifies the 22 playbooks, 24 principles, every skill, every template, prompt and script, all links and path references, the router size for repo, project and global renders, router drift, banned content, syntax and the unit tests.
2. `install.sh` run twice against `/tmp/test-harness-target` gives a clean install on run 1 and, on run 2, `writes=0`, identical file hashes, exactly one begin and one end marker per managed file, and no duplicated or corrupted content. `node scripts/check-install.mjs` runs this and the brownfield and global variants.
3. `node scripts/run-autonomous-smoke-test.mjs` builds a broken app in `/tmp/poteto-smoke-app` with an intentional bug, a missing feature and a messy module over 350 lines, runs the cycle (signal header, reproduce, root-cause fix, feature, refactor, the 350-line quality gate run by `scripts/quality-gate.mjs`, tests and live verification, decision trail), prints measured before and after results, exits 0 and removes its temporary directory.

## Risks

- A harness may not load the router file. Mitigation: the header makes routing visible on every non-trivial task.
- Keyword classification can pick the wrong route. Mitigation: the agent makes the final call, the classifier shows the runner-up, and a task that changes type gets a new header.
- The smoke test uses scripted edits. Mitigation: it says so in its output, and every check around the edits is a real run.

## Source

- `templates/product.md.template` and `docs/04-project-bootstrap.md`, Vibe Coding Toolkit by Matheus Gomes (MIT): product brief structure.
- `pstack/README.md`, pstack by Lauren Tan (MIT): the problems the playbooks and principles address.
