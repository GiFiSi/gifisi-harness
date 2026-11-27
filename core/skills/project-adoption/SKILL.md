---
name: project-adoption
description: Adopt the harness in an existing (brownfield) project. Inspect and baseline first, brainstorm a coverage plan, preserve stack, database and contracts, install with install.sh --project, reconcile docs, then ship small verified improvements with before/after evidence. Load for existing repos.
origin: vibe-coding-toolkit
---

# Project adoption

Bring an existing codebase under the harness without breaking what already works. The project keeps its stack, database, package manager, tests, lint rules, CI and public contracts. The harness adds a router, `.gifisi/` artifacts, documentation and a sequence of small, verified improvements. Every claim in the final report points at a command that ran before and after.

## When to use

- The user opens an existing repository and asks to set it up, adopt the harness, onboard the codebase, or update a partial or old installation.
- A rerun after an earlier adoption: the same procedure discovers the current state and changes only what drifted.
- Skip it for an empty directory; use `core/skills/project-bootstrap/SKILL.md`. Skip it for machine-wide tooling; use `core/skills/machine-setup/SKILL.md`.

## Procedure

1. Confirm the root and read its instructions: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, directory-level instruction files, `README.md`, existing docs and CI config. If the open directory is the harness repository, ask for the target project first.
2. Inventory and separate fact from assumption. Record product, audience and critical flows from existing docs; stack, versions, runtime, package manager, lockfiles and workspaces; canonical commands from `package.json` scripts or the equivalent; entry points, data layer, auth, logging, tests and CI; Git state and uncommitted changes; which agent tools are installed, configured, loaded and working. In a large or unfamiliar codebase, use `core/skills/how/SKILL.md` to map it.
3. Baseline before any edit. Run every safe existing check: lint, typecheck, tests, build. Run `node <harness>/scripts/quality-gate.mjs --root <project>` for file sizes. Record each command, its exit code and its counts. Pre-existing failures are part of the baseline, not something this adoption caused. Do not connect to production services or run commands with unknown side effects to get a baseline.
4. Brainstorm and plan. State the goal, constraints and what done means. Ask one question at a time, and only when the answer changes a decision. Write a coverage table: component, need, current state, action (install, update, reuse equivalent, not applicable, blocked), risk, validation. Order work by dependency and risk: harness and context, docs, quality gates, then code improvements. Large or architectural work gets a written plan per `core/playbooks/multi-phase-plan.md`.
5. Install the harness: `bash <harness>/install.sh --project <project>`. It writes only `.gifisi/`, the managed block in `AGENTS.md`, the `@AGENTS.md` import in `CLAUDE.md`, `.cursor/rules/gifisi-harness.mdc`, and `PRODUCT.md` plus the five docs where they are missing. It never touches `package.json`, lockfiles, tests, lint configs, source files or `.gitignore`. Text outside the managed markers survives byte for byte.
6. Check the install. Read `.gifisi/project.json` and confirm package manager, commands and frameworks match what step 2 found. Run `node .gifisi/scripts/validate-project.mjs --root .`. Run the installer again and confirm `writes=0`. A wrong detection is a harness issue to report, not a reason to edit project files.
7. Reconcile docs. Existing docs were kept, so merge by hand. Start with `AGENTS.md`: when it existed before step 5, the installer added only the managed router block and none of the project section in `core/templates/AGENTS.project.md.template` (Product and stack, Commands, Working agreements, Continuity, Standards, Git and delegation). Merge each missing section into `AGENTS.md` outside the managed markers, keep the project's own rules where they conflict and say so, replace the template tokens with real values, and fill the Commands table from `.gifisi/project.json`; rerun the installer and confirm `writes=0`, which shows the markers are intact. Map each existing document to one of `PRODUCT.md`, `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md`, `docs/setup.md`. Keep an already canonical document and link to it instead of creating a competitor. Fold a lowercase `product.md` into `PRODUCT.md` with an intermediate rename on case-insensitive filesystems. Replace every template line in newly created docs with project facts. Write only implemented structure as fact; label plans as plans. A project without UI says so in `docs/design.md`.
8. Map live surfaces. Write `.gifisi/feature-map.json` for the critical flows found in step 2, per `core/skills/create-verification-skill/SKILL.md`. Run `node .gifisi/scripts/verify-feature-map.mjs` and add the result to the baseline.
9. Adopt quality gates per `core/skills/quality-gates/SKILL.md`. Measure first; new rules with existing violations start at `warn` with a recorded count. Preserve the severity of every existing rule.
10. Improve in small verified units per `core/principles/sequence-verifiable-units.md`. Each unit is one bug fix, one feature, one split of an oversized file, or one doc correction. Route each unit through its own playbook (`core/playbooks/bug-fix.md`, `core/playbooks/feature.md`, `core/playbooks/refactoring.md`). After each unit rerun the affected checks and fix any regression before the next unit.
11. Log every decision: `node .gifisi/scripts/log-decision.mjs setup "<decision>" "<why>" "<command>" "<result>"`. Run `node .gifisi/scripts/log-decision.mjs --check` at the end.
12. After snapshot. Rerun every baseline command from step 3 plus the feature map and `validate-project`. Build a before/after table from the two runs. Whenever a command changed during adoption (a new `lint`, `test` or `typecheck` script), rerun the installer so `.gifisi/project.json` picks it up, then make the `AGENTS.md` Commands table match `.gifisi/project.json` row for row. Update `docs/setup.md` with harness revision, date, the coverage table and each item marked validated, configured without execution, reused, not applicable or blocked.

## Guardrails

- Stack migration, ORM or database changes, major version upgrades, applying migrations, production changes, new costs and deletions need the user's explicit decision. Prepare a proposal with impact and recovery; continue the independent parts.
- Never weaken a test, rule, validation or permission to make a check pass. Never raise the file-size ceiling or add broad ignores to hide violations.
- Back up any configuration file before changing it, without versioning secrets.
- Do not publish, push, send messages, add Git hooks or add branch protections.
- Reviews of non-trivial changes follow `core/skills/code-review/SKILL.md`; security-relevant changes follow `core/skills/security-review/SKILL.md`.

## Output

- Before/after table: lint, typecheck, test, build, quality gate, feature map, decision rows. Every number comes from a run in this session.
- The coverage table with each component's final state and reason.
- Files changed, grouped by unit, and the decision log path `.gifisi/decisions.tsv`.
- What was not validated, open risks, interventions the user must make, and the next unit of work.

## Source

- `docs/prompts/12-existing-project-setup.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- `docs/02-playbook-onboarding.md` and `docs/06-project-defaults.md` (preservation rules for existing projects), Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for gifisi-harness: installer contract, `.gifisi/` artifacts, feature map and decision log.
