# 03 Existing project adoption

## When to use

Use this prompt in an existing (brownfield) repository to adopt the poteto-harness, or to update a partial or older adoption. The agent inventories the project, records a baseline of its real checks, plans a coverage matrix, installs the harness under `.poteto/`, reconciles `AGENTS.md`, `CLAUDE.md`, `PRODUCT.md` and the five `docs/` files with what already exists, and ships small verified improvements with before and after evidence.

The stack, database, ORM, package manager, tests and public contracts stay as they are. A migration to another framework is separate work with its own plan. For a new application use `core/prompts/02-new-next-project.md`.

## Prompt

```text
Adopt the poteto-harness in this existing project by following its router.
If the harness is already installed, its files are under `.poteto/`;
otherwise read them from the harness checkout or the global harness home
(`~/.poteto-harness/`). Paths below are relative to the harness home.

1. Before reading or editing code, print the task-start signal exactly in
   this shape:
   [POTETO-HARNESS] Task Type: Project adoption | Playbook: Multi-phase plan
   Reason: <one sentence on why this is a brownfield adoption>
   Done Predicate: <`node .poteto/scripts/validate-project.mjs` exits 0, a
   second install run reports writes=0, and the project's own lint, tests
   and build give results no worse than the recorded baseline>
2. Open `core/playbooks/multi-phase-plan.md`, take the setup branch, and copy its
   numbered Steps verbatim into your todo list. Execute them in order.
3. Load `core/skills/project-adoption/SKILL.md` and follow its phases. Load
   `core/skills/quality-gates/SKILL.md` when you reach linting and
   `core/skills/context-tools/SKILL.md` when you reach Context7, Graphify or RTK.
4. Confirm the target root and read every instruction file that applies,
   including directory-specific ones. If this is the poteto-harness
   repository itself, stop and ask me for the target project.
5. Baseline before any edit: product and docs, stack and versions, package
   manager and lockfiles, workspaces, canonical commands, Git state and local
   changes, entry points, tests, CI, and the agent tools actually loaded.
   Run the existing safe checks (lint, types, tests, build) and record the
   commands and results, including failures that predate this work. Do not
   connect to production or run commands whose effect you have not read.
6. Write a coverage matrix: for each harness component (router files,
   .poteto artifacts, PRODUCT.md, the five docs, quality gate, feature map,
   context tools) give the need, current state, action, risk and the check
   that proves it. Every row ends installed, updated, reused through an
   existing equivalent, not applicable with a reason, or blocked with the
   condition to resume. Show it to me, then proceed with reversible rows.
7. Install with `bash install.sh --project .` from a harness checkout, or
   `node ~/.poteto-harness/scripts/sync-harnesses.mjs --project .` from a
   global install. Run it twice; the second run must report writes=0 and
   leave package.json, lockfiles, tests, lint config and source untouched.
8. Reconcile docs: keep a canonical document that already exists and link
   it instead of creating a competing copy. Fill gaps from code facts only.
9. Quality: measure the 350-line gate and the lint rules per the
   quality-gates skill. New rules with legacy violations start at warn with
   the measured count; never raise ceilings, add broad ignores, or delete
   tests to pass.
10. Write `.poteto/feature-map.json` checks for the critical user flows and
    run `node .poteto/scripts/verify-feature-map.mjs`.
11. Improve in small verified units, each ending in its own check. A change
    to behavior, schema or a public contract becomes a separate proposal.
12. Log every phase, fork and verification with
    `node .poteto/scripts/log-decision.mjs <phase> "<decision>" "<why>"
    "<evidence>" "<result>"`.

Ask before global installs, a major version upgrade, a database or ORM
change, migrations, new costs, deleting files whose purpose you have not
confirmed, publishing, pushing or outbound messages. Do not add Git hooks or
branch protections. Back up any configuration you change.
```

## Expected result

- The `[POTETO-HARNESS]` header and the setup-branch steps as the todo list.
- A recorded baseline of the project's own checks, taken before any edit.
- A coverage matrix where every row has a decision, a reason and a verifiable status.
- The harness installed under `.poteto/`, a second install run with `writes=0`, user content outside the managed markers preserved byte for byte, and `validate-project.mjs` exiting 0.
- Reconciled docs, a measured quality-gate baseline, a working feature map, and before and after results for every check.
- A final reply listing changes, evidence, what was not validated, open risks, and the next action.

## Source

- `docs/prompts/12-existing-project-setup.md` and `docs/02-playbook-onboarding.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for poteto-harness: routed through the router header and `playbooks/multi-phase-plan.md`, installs with the poteto-harness installer, and replaces the upstream vendor plugin catalog with the harness coverage matrix.
