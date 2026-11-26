---
name: multi-phase-plan
title: Multi-phase plan
summary: A checklist plan of small verifiable units for large or multi-PR work, or the phased execution of machine setup, new project bootstrap, and existing-project adoption.
skills: [figure-it-out, architect, interrogate, machine-setup, project-bootstrap, project-adoption, quality-gates, context-tools]
principles: [sequence-verifiable-units, outcome-oriented-execution, foundational-thinking, exhaust-the-design-space, make-operations-idempotent, prove-it-works, never-block-on-the-human]
---

# Multi-phase plan

## When to use

Use this playbook for work that does not fit in one verifiable change, and as the router's fallback when no route fits. It has three branches:

- **Setup branch.** Machine setup, new project bootstrap, or existing-project adoption. The phases are known in advance and live in the route's skill. You execute them, each ending in a check.
- **Plan branch.** A migration, rewrite, or feature that spans several PRs. The plan is the deliverable. You do not implement it until the user says go.
- **Small work.** One or two files with an obvious approach needs no plan. Re-route with a new header to `core/playbooks/bug-fix.md`, `core/playbooks/feature.md`, or `core/playbooks/refactoring.md`.

Copy all Steps into the todo list and mark the steps of the branch you are not on as `n/a`.

## Done Predicate

The branch's deliverable exists and its check was observed. That is a plan file at `.poteto/plans/<slug>.md` with unit, live, and perf verification on every unit, or `node scripts/validate-project.mjs --root <project>` exiting 0 with project lint and tests passing, or an environment manifest whose versions came from running each tool.

Template by branch:

- Plan: `.poteto/plans/<slug>.md` lists units in landing order with a dependency graph, and each unit names its files, its change, the result a user sees, and checkable verification boxes. The user has the path.
- New project or adoption: `node scripts/validate-project.mjs --root <project>` exits 0; the lint, test, and build commands in `<project>/.poteto/project.json` pass; `node scripts/quality-gate.mjs --root <project>` reports no violations; a before and after summary exists for adoption.
- Machine setup: a manifest shaped like `core/templates/environment-manifest.example.json` records each tool, its version as printed by the tool itself, its scope, and any backup taken. Tools that were skipped or failed are listed with the reason.

## Steps

1. Pick the branch (setup, plan, or small work); for small work re-route now with a new header, and when no route fit at all load `core/skills/figure-it-out/SKILL.md` first.
2. Setup branch: load the route's skill (`core/skills/machine-setup/SKILL.md`, `core/skills/project-bootstrap/SKILL.md`, or `core/skills/project-adoption/SKILL.md`) and inspect the current state before changing anything.
3. Setup branch: list every install, global config change, and external download the phases need, ask the user once to approve that list, and run the reversible phases while you wait.
4. Setup branch: execute the skill's phases in order, each ending in its own check, and log one row per phase with `scripts/log-decision.mjs` including the command that proved it.
5. Setup branch: close with the branch check (`scripts/validate-project.mjs` plus project lint and tests, or the filled environment manifest) and a before and after summary.
6. Plan branch: settle open questions by running something (`core/playbooks/prototype.md`) and settle types and boundaries with `core/skills/architect/SKILL.md`; ask the user only about product calls no run can settle.
7. Plan branch: write `.poteto/plans/<slug>.md` opening with what changes, unit ids in landing order, the dependency graph, and the files each unit may touch.
8. Plan branch: give each unit one section with checkboxes for depends-on, files, the one change, the visible result, and verification (unit test, live check, perf check where relevant).
9. Plan branch: make each live box a concrete Feature Map check for `scripts/verify-feature-map.mjs` and each perf box a metric, probe, trunk baseline, and failing number; mark units that change an interaction as review-gated.
10. Plan branch: log the plan with `scripts/log-decision.mjs` as phase `design`, hand the path to the user, and stop until the user explicitly says go.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the global harness home (for example `~/.poteto-harness/`) when only a global install exists, the repository root here. Run them as `node "<harness-home>/scripts/<name>.mjs"` from the project root, so `.poteto/decisions.tsv` lands in the project.

**Step 1.** The fallback route lands here for vague, large, cross-cutting, or unattended requests. `core/skills/figure-it-out/SKILL.md` turns the request into a goal, a Done Predicate, and a first verifiable unit. If that shows the work is one unit, re-route to the matching playbook and print a new header.

**Step 2.** Inspect before acting. For a machine: OS, shell, package managers, Node and other runtimes, the agent clients present, and what is already configured. For a new project: the target directory must be empty or the user must confirm what stays; gather the product brief for `<project>/PRODUCT.md`. For adoption: the stack, package manager, lockfile, test and lint commands, existing agent instruction files, CI, and the largest source files. Adoption preserves the stack, the database, and the contracts; a migration is separate work with its own plan. Load `core/skills/context-tools/SKILL.md` when the phases include documentation lookup, code graph, or command-output tooling.

**Step 3.** Installing tools, changing global configuration, and downloading from outside the repo are outward-facing (router section 8). Present one list: tool, version or source, scope (machine or project), and how to undo it. Tools from outside the repo, including skills, need the user's yes. Reading, inspecting, and writing project docs are reversible and proceed without asking (`core/principles/never-block-on-the-human.md`).

**Step 4.** Each phase converges to the same end state when rerun (`core/principles/make-operations-idempotent.md`): rerunning the installer or the skill must not duplicate instruction blocks, hooks, or config entries. Typical phases:

- New project: product brief, official framework scaffold, harness install with `install.sh --project <project>`, quality gates via `core/skills/quality-gates/SKILL.md`, docs from `core/templates/docs/architecture.md.template` and its siblings, first test green.
- Adoption: diagnose, propose improvements with risks and done criteria, harness install, gates and docs reconciled with what exists, incremental cleanup units, before and after comparison.
- Machine setup: runtimes, package managers, agent clients, global harness install with `install.sh --global`, integrations, manifest.

A phase is done when its check passed, not when its commands ran (`core/principles/sequence-verifiable-units.md`). Separate "file present", "configured", and "integration tested" in the log.

**Step 5.** Report what was verified and what was only configured. An integration that needs a credential or an account the user must create is reported as pending with the exact next action, never simulated.

**Step 6.** Plan through code. A prototype answers "which approach" faster than a debate, and it leaves room for an option nobody proposed (`core/principles/exhaust-the-design-space.md`). Settle core types and what concurrent actors share before sequencing work (`core/principles/foundational-thinking.md`). Do not spend `core/skills/interrogate/SKILL.md` on an abstract plan; use it on units once they are built.

**Step 7.** The dependency graph says which units branch from trunk independently, which wait for which, and the files each may touch. Two units that touch the same file are sequenced, not parallel. For a migration, converge on the target design and skip throwaway compatibility states (`core/principles/outcome-oriented-execution.md`). State the bar: "match the original output exactly, bugs included" keeps a migration comparable.

**Step 8.** One unit is one change with its own evidence. A unit is verified only when every box is checked. Tests alone are not verification. Use this shape:

```markdown
### Unit 3: move invoice totals to the pricing module
- [ ] Depends on: Unit 1
- [ ] Files: src/pricing/totals.ts, src/invoice/view.ts
- [ ] Change: invoice view reads totals from pricing; old helper deleted
- [ ] Result: invoice page shows the same totals for the fixture account
- [ ] Unit: totals.test passes, including the rounding case
- [ ] Live: feature-map check invoice-total passes
- [ ] Perf: invoice render median stays within 5% of trunk baseline
```

**Step 9.** A live box drives the real surface with a scenario and a pass predicate, written so `core/skills/create-verification-skill/SKILL.md` can turn it into a `.poteto/feature-map.json` entry. A perf box names the metric, the probe command, the trunk baseline measured first, and the number that fails the unit. Units that change an interaction wait for the user's review before merge.

**Step 10.** Execution starts only on the user's explicit go. When it starts, each unit runs through its own playbook (usually `core/playbooks/feature.md` or `core/playbooks/refactoring.md`) and ends with `core/playbooks/opening-a-pr.md`. Delete the plan file once all units land.

## Reply

Setup branch: phases done with their checks, what was installed with versions, what is configured but untested, pending items with the next action, and the validator result. Plan branch: the plan path, unit ids with dependencies, the review-gated set, and what stays unproven.

## Source

Adapted from `skills/poteto-mode/playbooks/multi-phase-plan.md` and `docs/guide/04-design.md` in pstack by Lauren Tan (cursor/plugins, MIT). Setup, bootstrap, and adoption phases adapted from `docs/03-environment-setup.md`, `docs/04-project-bootstrap.md`, `docs/prompts/10-development-environment-setup.md`, `docs/prompts/11-next-project-bootstrap.md`, and `docs/prompts/12-existing-project-setup.md` in Vibe Coding Toolkit by Matheus Gomes (MIT).
