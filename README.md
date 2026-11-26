# poteto-harness

poteto-harness is an engineering harness for coding agents. It works the same way in Claude Code, Codex and Cursor. It combines two MIT projects: the playbooks, principles and skills of Lauren Tan's pstack, and the machine setup, project bootstrap, project adoption, documentation layout and quality gates of Matheus Gomes's Vibe Coding Toolkit.

The harness has one always-on part, a router of fewer than 150 lines. Everything else (22 playbooks, 24 principles, 31 skills, 9 prompts, 31 templates) loads only when a task needs it. You never type a slash command.

## How it works

1. Your harness loads the router at session start. In this repository and in installed projects the router lives in a managed block of `AGENTS.md`. `CLAUDE.md` imports it with `@AGENTS.md`. Cursor reads `.cursor/rules/poteto-harness.mdc`, which has `alwaysApply: true`.
2. The agent classifies every prompt against the routes in `core/harness/routes.json`. Trivial work (a question it can answer, a one-line edit with no behavior change) skips the rest.
3. For any non-trivial task the agent prints this header before it reads or edits code:

   ```text
   [POTETO-HARNESS] Task Type: <category> | Playbook: <selected playbook>
   Reason: <1 sentence why this playbook fits>
   Done Predicate: <exact verifiable condition on the real artifact>
   ```

4. The agent opens the one selected playbook, copies its numbered steps verbatim into its todo list and runs them in order. It loads a skill file (for example `core/skills/tdd/SKILL.md`) only when the step that needs it starts, and reads a principle file before citing it.
5. The agent checks the done predicate on the real artifact: the running app, the CLI output, the generated file. Live checks come from `.poteto/feature-map.json` and run with `node scripts/verify-feature-map.mjs`. If it cannot observe the predicate, it reports `INCONCLUSIVE`.
6. Every fork, verification and revert becomes a row in `.poteto/decisions.tsv`, appended with `node scripts/log-decision.mjs`.
7. Repeated mistakes climb the correction ladder (`core/skills/correct/SKILL.md`): first make the mistake impossible in the architecture, then add a lint rule or test, and only then add a line of text to `.poteto/corrections.md`.

When two routes fit, `node scripts/classify-task.mjs "<prompt>"` ranks them and prints a suggested header. It matches English and Portuguese signals. The agent still makes the call.

Paths written inside harness files (`scripts/`, `core/skills/`, `core/playbooks/`, `core/principles/`, `core/templates/`) are relative to the harness home: the repository root here, `.poteto/` in a project install, `<home>/.poteto-harness/` in a global install. The rendered router spells each script out with that prefix and in quotes, for example `node ".poteto/scripts/log-decision.mjs"`.

## Quickstart

Requirements: Node 18 or newer, and bash (Git Bash on Windows). There are no npm dependencies.

Install into one project:

```bash
./install.sh --project /path/to/your-project
```

Install for every session of your user account:

```bash
./install.sh --global              # writes under your home directory
./install.sh --global --home /tmp/test-home   # writes under another directory, for a trial run
```

Add `--dry-run` to either form to print the actions without writing. Running the same command twice is safe: the second run reports `writes=0` and changes no byte. See [docs/setup.md](docs/setup.md) for Windows notes and uninstall steps.

## What gets installed where

Project install (`--project <path>`):

| Path in the project | What it is | On a second run |
|---|---|---|
| `.poteto/` | Copy of `core/` (playbooks, principles, skills, prompts, templates, harness data), the project scripts, LICENSE and `docs/THIRD_PARTY_NOTICES.md` | Rewritten only where bytes differ; files dropped upstream are removed; tracked in `.poteto/.installed.json` |
| `.poteto/project.json` | Detected package manager, test, lint, build and dev commands, frameworks, ESLint `max-lines` status | Regenerated deterministically |
| `.poteto/decisions.tsv` | Decision trail with the six-column header | Created once, never rewritten |
| `.poteto/corrections.md` | Tier-3 correction rules | Created once from the template |
| `AGENTS.md` | Router in a managed block; created from a template when missing | Only the block between the markers changes |
| `CLAUDE.md` | Bridge that imports `@AGENTS.md` | Left alone when it already imports it |
| `.cursor/rules/poteto-harness.mdc` | Router as an always-apply Cursor rule | Overwritten only when it carries the managed marker |
| `PRODUCT.md`, `docs/*.md` | Product brief and the five-file docs tree from templates | Created only when missing |

The installer never touches `package.json`, lockfiles, tests, lint configs, source files or `.gitignore`.

Global install (`--global [--home DIR]`, DIR defaults to your home directory):

| Path under DIR | What it is |
|---|---|
| `.poteto-harness/` | `core/` (playbooks, principles, skills, prompts, templates, harness data), the runtime scripts with all of `scripts/lib/`, LICENSE and `docs/THIRD_PARTY_NOTICES.md`. Not copied: `README.md`, the rest of `docs/`, `install.sh`, `package.json`, `scripts/tests/`, `scripts/smoke/` and the repository-only scripts (`validate-harness.mjs`, `check-install.mjs`, `run-autonomous-smoke-test.mjs`, `run-tests.mjs`) |
| `.claude/CLAUDE.md` | Router in a managed block, next to your own content |
| `.codex/AGENTS.md` | Router in a managed block, next to your own content |
| `.cursor/rules/poteto-harness.mdc` | Router as an always-apply rule |

With only a global install, a project has no `.poteto/project.json`: the router tells the agent to read commands from the project's own manifest (`package.json` scripts, Makefile) and to create `.poteto/decisions.tsv` and `.poteto/corrections.md` from `core/templates/poteto/` on first use.

Managed blocks start with `<!-- poteto-harness:begin ... -->` and end with `<!-- poteto-harness:end -->`. Text outside them is preserved byte for byte, line endings included.

## Playbooks

One playbook per task. Each has a When to use section, a Done Predicate template, 3 to 12 numbered steps ready for a todo list, step notes and a reply shape.

| Playbook | Delivers | Routed from |
|---|---|---|
| [Authoring a skill](core/playbooks/authoring-a-skill.md) | Write or edit a skill or playbook so every line changes a decision, every path resolves, and the validator plus one real run prove it works. | Skill authoring |
| [Autonomous run](core/playbooks/autonomous-run.md) | Drive one task to a checkable exit condition without stopping, one verified change and one decision row per iteration, with an escape hatch for real dead ends. | Autonomous run |
| [Autopilot-full](core/playbooks/autopilot-full.md) | Carry a queue of independent PRs from build to merged, one owner per PR, with merges authorized only by verdicts from verifiers that never wrote the code. | Autopilot full |
| [Autopilot-stack](core/playbooks/autopilot-stack.md) | Carry a queue of changes to verified, green PRs, stacking only where one builds on another, and hand them to the operator without merging. | Autopilot stack |
| [Babysit](core/playbooks/babysit.md) | Drive one open PR to merge-ready by clearing conflicts, review threads, and CI in that order, with skeptical triage of every comment, and never merge. | PR babysitting |
| [Bug fix](core/playbooks/bug-fix.md) | Reproduce the bug on the real surface, prove the root cause with runtime evidence, land a failing test before the smallest fix, and verify on the same surface. | Bug fix |
| [Eval](core/playbooks/eval.md) | Measure whether a variant (skill, prompt, playbook, model setting) changes agent behavior, with blinded candidates, a blinded judge, and evidence read from what candidates actually did. | Eval |
| [Feature](core/playbooks/feature.md) | Design the data shape first, add a Feature Map check and a test that fail, implement with review separation, and verify the new behavior live. | Feature, Formal verification |
| [Hillclimb](core/playbooks/hillclimb.md) | Sustained improvement of one measured number against a target, one change per attempt, kept or reverted on evidence. | Metric hillclimb |
| [Investigation](core/playbooks/investigation.md) | A read-only, cited answer to a question about the code, a recommendation between options, or a code or security review of a diff. | Code review, Security review, Investigation |
| [Multi-phase plan](core/playbooks/multi-phase-plan.md) | A checklist plan of small verifiable units for large or multi-PR work, or the phased execution of machine setup, new project bootstrap, and existing-project adoption. | Multi-phase plan, Machine setup, New project, Project adoption |
| [Opening a PR](core/playbooks/opening-a-pr.md) | Turn verified work into a small, reviewable pull request with a one-minute briefing, opened ready for review. | Opening a PR |
| [Pause safely](core/playbooks/pause-safely.md) | Stop at a safe boundary and leave a durable handoff that a cold-start agent can resume from without redoing work. | Pause |
| [Perf issue](core/playbooks/perf-issue.md) | Fix one performance problem with a measured baseline, a traced cause, and a measured post-fix number on the same command. | Performance |
| [Prototype](core/playbooks/prototype.md) | Answer one open design or approach question with throwaway variants observed side by side, then hand the chosen direction to Feature. | Prototype |
| [Refactoring](core/playbooks/refactoring.md) | Change structure without changing behavior, pinned by a characterization check, split by responsibility under the 350-line gate, and proven equivalent on the real artifact. | Refactoring, Quality gates, Correction |
| [Runtime forensics](core/playbooks/runtime-forensics.md) | Diagnose a live or intermittent failure by capturing a real runtime artifact, reducing it to the mechanism, proving that mechanism cheaply, and citing the source line. | Runtime forensics |
| [Session pickup](core/playbooks/session-pickup.md) | Resume prior work from its durable trail (handoff, decision log, git state) without redoing finished steps, then route the remaining work to its playbook. | Session pickup |
| [Shipping](core/playbooks/shipping.md) | Land a PR or a stack of PRs bottom-up, merging only the contiguous run that an independent verifier passed on its current patch, and confirm each merge by reading it back. | Shipping |
| [Trace forensics](core/playbooks/trace-forensics.md) | Diagnose from an existing capture (profile, heap snapshot, trace, transcript, log bundle) by turning it into a queryable shape, narrowing to the cause, and attributing it to source. | Trace forensics |
| [Visual parity](core/playbooks/visual-parity.md) | Migrate or restyle UI with pixel-exact equivalence, proven by an image-diff check against an untouched baseline wired into the Feature Map. | Visual parity |
| [Worktree cleanup](core/playbooks/worktree-cleanup.md) | Reclaim disk from stale git worktrees, merged branches, and caches with a read-only audit first and safety gates that never delete unmerged or uncommitted work without the user's yes. | Cleanup |

## Principles

The router prints one line per principle. The agent opens the file before it cites a principle and names the choice it changed.

| Principle | Group | Applies when |
|---|---|---|
| [Laziness Protocol](core/principles/laziness-protocol.md) | Core | Refactoring, sizing a diff, or tempted to add a layer. Bias to deletion and the smallest change that solves it. |
| [Foundational Thinking](core/principles/foundational-thinking.md) | Core | Before writing logic. Settle core types, data structures, and what concurrent actors share first. |
| [Redesign from First Principles](core/principles/redesign-from-first-principles.md) | Core | A new requirement lands in an existing design. Redesign as if it had been there from day one. |
| [Attack the Premise](core/principles/attack-the-premise.md) | Core | Two fixes sharing one premise failed. Write the premise down and test it before a third fix. |
| [Subtract Before You Add](core/principles/subtract-before-you-add.md) | Core | Sequencing an addition, refactor, or rewrite. Remove dead weight first, then build on the simpler base. |
| [Minimize Reader Load](core/principles/minimize-reader-load.md) | Core | Code is hard to trace. Count layers and hidden state, collapse one-caller wrappers, shrink mutable scope. |
| [Outcome-Oriented Execution](core/principles/outcome-oriented-execution.md) | Core | Planned rewrites and migrations. Converge on the target design; skip throwaway compatibility states. |
| [Experience First](core/principles/experience-first.md) | Core | Product, UX, or scope tradeoffs. Choose what the user feels over implementation convenience. |
| [Exhaust the Design Space](core/principles/exhaust-the-design-space.md) | Core | A novel interaction or architecture with no precedent. Build 2-3 competing prototypes, then compare. |
| [Build the Lever](core/principles/build-the-lever.md) | Core | Any non-trivial work. Build the script, codemod, or check that does or proves it, so a reviewer can rerun it. |
| [Model the Domain](core/principles/model-the-domain.md) | Architecture | Stateful or branch-heavy logic. Encode the domain in a structure (state machine, table, typed model). |
| [Boundary Discipline](core/principles/boundary-discipline.md) | Architecture | Wiring validation, errors, or adapters. Guard at system boundaries, trust internal types, keep logic pure. |
| [Type System Discipline](core/principles/type-system-discipline.md) | Architecture | Designing types or signatures. Make illegal states unrepresentable and parse external data at boundaries. |
| [Make Operations Idempotent](core/principles/make-operations-idempotent.md) | Architecture | Commands, lifecycle steps, or loops that face crashes and retries. Converge to the same end state. |
| [Migrate Callers Then Delete Legacy APIs](core/principles/migrate-callers-then-delete-legacy-apis.md) | Architecture | A new internal API while old callers exist. Migrate every caller and delete the old API in one wave. |
| [Separate Before Serializing Shared State](core/principles/separate-before-serializing-shared-state.md) | Architecture | Concurrent actors might write the same file, branch, or key. Remove the sharing before adding locks. |
| [Prove It Works](core/principles/prove-it-works.md) | Verification | Before declaring done. Verify against the real artifact on the real surface, not a proxy. |
| [Fix Root Causes](core/principles/fix-root-causes.md) | Verification | Debugging. Trace each symptom to the first wrong state and fix it there; a guard is not a fix. |
| [Sequence Work into Verifiable Units](core/principles/sequence-verifiable-units.md) | Verification | Multi-step work and commit stacks. Small units that each end in a check, verified before the next. |
| [Test Behavior, Not Implementation](core/principles/test-behavior-not-implementation.md) | Verification | Writing or keeping a test. Assert what users observe, so it fails only when behavior breaks. |
| [Explain the Number](core/principles/explain-the-number.md) | Verification | Before trusting or reporting a measurement. Find what limits it and rule out measuring the wrong thing. |
| [Guard the Context Window](core/principles/guard-the-context-window.md) | Delegation | Large outputs, long files, fan-out. Route bulk to subagents or files; keep summaries in the main thread. |
| [Never Block on the Human](core/principles/never-block-on-the-human.md) | Delegation | Tempted to ask about reversible work. Proceed, show the result, let the human course-correct. |
| [Encode Lessons in Structure](core/principles/encode-lessons-in-structure.md) | Meta | Writing the same instruction twice. Encode it as a lint, test, type, or script instead of more text. |

## Skills

A skill is a procedure that a playbook step loads by path. `origin` says which upstream project it adapts; `poteto-harness` marks original work.

| Skill | Origin | What it does |
|---|---|---|
| [how](core/skills/how/SKILL.md) | pstack | Explains how a subsystem works today: runtime flow, key types, ownership, layering. |
| [why](core/skills/why/SKILL.md) | pstack | Answers why code or a decision is the way it is, from commits, threads, decision logs and docs. |
| [teach](core/skills/teach/SKILL.md) | pstack | Runs how and why and weaves them into one plain explanation that builds step by step. |
| [recall](core/skills/recall/SKILL.md) | pstack | Rebuilds working context from `.poteto/decisions.tsv`, the handoff file and git history. |
| [architect](core/skills/architect/SKILL.md) | pstack | Settles types, signatures, state ownership and module boundaries before code, by comparing two sketched shapes. |
| [arena](core/skills/arena/SKILL.md) | pstack | Produces N independent candidates, scores them on a rubric, grafts the best parts onto one base, verifies it. |
| [swarm](core/skills/swarm/SKILL.md) | pstack | Fans out workers over independent slices and returns one report of PASS, ISSUES or BLOCKED with evidence. |
| [interrogate](core/skills/interrogate/SKILL.md) | pstack | Adversarial review; a finding survives only when a rerun command shows it breaks the stated intent. |
| [blast-radius](core/skills/blast-radius/SKILL.md) | pstack | Finds what a change could break outside its diff and proves the fact that makes it safe. |
| [tdd](core/skills/tdd/SKILL.md) | pstack | Makes broken or missing behavior a failing test first, then fixes it and watches it pass. |
| [unslop](core/skills/unslop/SKILL.md) | pstack | Removes AI writing patterns from prose while keeping meaning and tone. |
| [no-comments](core/skills/no-comments/SKILL.md) | pstack | Strips comments from a diff and turns comments that explain surprises into refactor flags. |
| [correct](core/skills/correct/SKILL.md) | pstack | Fixes a repeated mistake class at the highest ladder tier: architecture, then lint or test, then text. |
| [reflect](core/skills/reflect/SKILL.md) | pstack | Mines a session for durable lessons and turns each into a ladder fix after the user approves. |
| [show-me-your-work](core/skills/show-me-your-work/SKILL.md) | pstack | Owns the decision trail in `.poteto/decisions.tsv` and its append-only rules. |
| [create-verification-skill](core/skills/create-verification-skill/SKILL.md) | pstack | Builds the Feature Map, `.poteto/feature-map.json`, so any agent can drive each feature live. |
| [maintain-verification-skill](core/skills/maintain-verification-skill/SKILL.md) | pstack | Keeps the Feature Map true to the app as it changes. |
| [create-formal-verification-skill](core/skills/create-formal-verification-skill/SKILL.md) | pstack | Checks one property over every case in a stated scope where tests reach least. |
| [maintain-formal-verification-skill](core/skills/maintain-formal-verification-skill/SKILL.md) | pstack | Brings formal checks back in line after the covered code changed. |
| [benchmark-checklist](core/skills/benchmark-checklist/SKILL.md) | pstack | Vets a performance number before anyone reports it or acts on it. |
| [figure-it-out](core/skills/figure-it-out/SKILL.md) | pstack | Designs an auditable workflow when no narrower playbook fits. |
| [technical-writing](core/skills/technical-writing/SKILL.md) | pstack | Layered standard for technical prose: one document mode, reader-first sentences. |
| [reframe](core/skills/reframe/SKILL.md) | pstack | Gives the expert vocabulary for what the user is building and rewrites the request with it. |
| [sharpen](core/skills/sharpen/SKILL.md) | pstack | Makes a task deeper, not bigger, by naming what a top professional would add. |
| [machine-setup](core/skills/machine-setup/SKILL.md) | vibe-coding-toolkit | Prepares a developer machine inventory-first; installs nothing without the user's OK. |
| [project-bootstrap](core/skills/project-bootstrap/SKILL.md) | vibe-coding-toolkit | Starts a Next.js + TypeScript app (Drizzle, PostgreSQL, Zod, Pino, Vitest) with `PRODUCT.md` first. |
| [project-adoption](core/skills/project-adoption/SKILL.md) | vibe-coding-toolkit | Adopts the harness in an existing project while preserving its stack, database and contracts. |
| [quality-gates](core/skills/quality-gates/SKILL.md) | vibe-coding-toolkit | Installs the ESLint gate with the 350-line ceiling, its self-check and a dependency-free fallback. |
| [context-tools](core/skills/context-tools/SKILL.md) | vibe-coding-toolkit | Uses Context7, Graphify and RTK only after verifying each is present. |
| [code-review](core/skills/code-review/SKILL.md) | vibe-coding-toolkit | Multi-lens review of a frozen diff; every finding carries a verified failure scenario. |
| [security-review](core/skills/security-review/SKILL.md) | vibe-coding-toolkit | Read-only, evidence-based security review of a repository or a diff. |

## Prompts

Paste-ready prompts for tasks a person starts on purpose: machine setup, a new Next.js project, adopting an existing project, code review, security review, a file-size refactor, installing quality gates, brainstorm to plan, and a lint warning burndown. The catalog, with the playbook and skills each one loads, is in [core/prompts/README.md](core/prompts/README.md). You do not need them for ordinary work; the router classifies plain requests.

## Templates

`core/templates/` holds the files the installer and the skills copy into a project:

- `AGENTS.project.md.template`, `CLAUDE.md.template`, `PRODUCT.md.template` and the five `docs/*.md.template` files.
- `core/templates/poteto/`: the empty decision log, the corrections file and an example Feature Map.
- `task-handoff.md.template`, `security-review.md.template`, `environment-manifest.example.json`.
- `core/templates/eslint/`: flat config with `max-lines` at 350, local quality rules and a self-check script.
- `core/templates/hooks/`: hook settings and dependency-free hook scripts for Context7 reminders, Graphify refresh and RTK command rewriting, plus MCP and Codex config samples.
- `core/templates/next/`: the Next.js foundation (typed env schema with a test, Pino logger, Drizzle client and schema, Drizzle and Vitest configs).

The installer substitutes the tokens listed in `core/harness/manifest.json` (project name, harness home, package manager, test, lint, build and dev commands, date).

## Scripts

All scripts are Node ESM with no dependencies. Each code file stays at or below 350 lines.

| Script | Purpose |
|---|---|
| `scripts/sync-harnesses.mjs` | Renders the router into `AGENTS.md`, `CLAUDE.md` and the Cursor rule; runs project and global installs |
| `scripts/validate-harness.mjs` | Validates this repository: canonical sets, file shapes, links, router size and drift, banned content, syntax, unit tests |
| `scripts/check-install.mjs` | Proves the installer is clean and idempotent on empty, brownfield and global fixtures |
| `scripts/run-autonomous-smoke-test.mjs` | Runs a full improvement cycle on a deliberately broken app and prints before and after numbers |
| `scripts/classify-task.mjs` | Ranks routes for a prompt and prints a suggested header |
| `scripts/log-decision.mjs` | Appends to and checks `.poteto/decisions.tsv` |
| `scripts/verify-feature-map.mjs` | Starts the app and runs every Feature Map check on its live surface |
| `scripts/quality-gate.mjs` | Dependency-free 350-line and `debugger` gate for projects without an ESLint `max-lines` rule |
| `scripts/validate-project.mjs` | Checks that a project install is complete |
| `scripts/run-tests.mjs` | Runs the unit tests in `scripts/tests/` with an explicit file list (what `npm test` calls) |
| `scripts/lib/paths.mjs` | Harness root, temp root, user path resolution, project root lookup |
| `scripts/lib/frontmatter.mjs` | Frontmatter, section and numbered-list parsing |
| `scripts/lib/content-checks.mjs` | Banned-content, line-count and link checks for the validator |
| `scripts/lib/detect-stack.mjs` | Stack detection for `.poteto/project.json` and template token values |
| `scripts/lib/install-tree.mjs` | Write-if-different copying, action log and `.installed.json` pruning |
| `scripts/lib/managed-blocks.mjs` | Router rendering, managed-marker splicing with line endings preserved, the owned Cursor rule |
| `scripts/smoke/fixture.mjs`, `scripts/smoke/edits.mjs`, `scripts/smoke/steps.mjs` | The smoke test's broken app, its scripted edits, and its real check and logging steps |

## Verify the harness

Three commands prove the repository works. Run them from the root of a checkout of this repository. They do not run from a global install, which leaves out `install.sh`, `docs/`, the tests and these scripts.

```bash
node scripts/validate-harness.mjs          # exit 0: 22 playbooks, 24 principles, 31 skills, templates, links, router, unit tests
node scripts/check-install.mjs             # install.sh twice per fixture: clean first run, writes=0 and identical hashes on the second
node scripts/run-autonomous-smoke-test.mjs # broken app in the temp dir: header, reproduce, fix, feature, refactor, live verify, decision trail
```

The same commands are available as `npm run validate`, `npm run check-install` and `npm run smoke`. `npm test` runs only the unit tests through `node scripts/run-tests.mjs`, which lists the test files itself, so it works on Node 18 in any shell, including `cmd.exe` and PowerShell. [docs/quality.md](docs/quality.md) explains what each one checks and what it does not.

## Honest limits

- The smoke test is not an agent. Its code edits are scripted stand-ins for what an agent would write. Every check around those edits is real: classification, the playbook steps it prints, the failing and passing tests, the live HTTP checks, the quality gate and the decision rows all come from actual runs.
- The global install writes `.cursor/rules/poteto-harness.mdc` under your home directory. Cursor may only load user-level rules that you add in its Settings. The installer writes the file; it does not verify that Cursor loads it.
- Context7, Graphify and RTK are optional. The hook templates and `core/skills/context-tools/SKILL.md` check that a tool is present before using it. Nothing in the harness assumes them.
- The router is text. A harness that ignores `AGENTS.md`, `CLAUDE.md` or Cursor rules will not see it. The header makes compliance visible, so you can tell when routing did not happen.
- Installing tools, publishing, pushing and destructive actions still need your explicit OK. The harness never grants that authority.

## Repository docs

- [PRODUCT.md](docs/PRODUCT.md): problem, users, scope and acceptance criteria.
- [docs/architecture.md](docs/architecture.md): sources of truth, render pipeline, install targets, project artifacts, script map.
- [docs/design.md](docs/design.md): router design, classification, context protection, correction ladder, decision trail, tradeoffs.
- [docs/onboarding.md](docs/onboarding.md): how to add a playbook, skill or principle and regenerate the router.
- [docs/quality.md](docs/quality.md): validator checks, tests, the 350-line gate, idempotency and smoke proofs.
- [docs/setup.md](docs/setup.md): requirements, Windows notes, install and uninstall.
- [CONTRIBUTING.md](docs/CONTRIBUTING.md): file formats, path conventions and banned content.

## Provenance and license

poteto-harness is MIT licensed ([LICENSE](LICENSE)). It adapts:

- pstack by Lauren Tan (MIT), https://github.com/cursor/plugins/tree/main/pstack: playbooks, principles, the pstack skills, the routing model, the Feature Map, the correction ladder and the decision log.
- Vibe Coding Toolkit by Matheus Gomes (MIT), https://github.com/soumatheusgomes/vibe-coding-toolkit: machine setup, project bootstrap and adoption, the five-file docs tree, `PRODUCT.md`, the ESLint quality gates, the context tool hooks, the prompts and the working agreements.

Both license texts and a per-project list of adapted material are in [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).

## Source

- `pstack/README.md` and `pstack/docs/guide/README.md`, pstack by Lauren Tan (MIT): overview of routing, playbooks, principles and skills.
- `README.pt-BR.md` and `docs/00-overview.md`, Vibe Coding Toolkit by Matheus Gomes (MIT): overview of setup, bootstrap, adoption, docs tree and quality gates.
