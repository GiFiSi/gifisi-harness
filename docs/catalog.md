# Catalog

Everything the router can load, in one place: the 22 playbooks, 24 principles, 31 skills, 9 prompts and 31 templates. Playbook and principle rows are copied from the files themselves; when you add or rename one, update this page by hand.

## Playbooks

One playbook per task. Each has a When to use section, a Done Predicate template, 3 to 12 numbered steps ready for a todo list, step notes and a reply shape.

| Playbook | Delivers | Routed from |
|---|---|---|
| [Authoring a skill](../core/playbooks/authoring-a-skill.md) | Write or edit a skill or playbook so every line changes a decision, every path resolves, and the validator plus one real run prove it works. | Skill authoring |
| [Autonomous run](../core/playbooks/autonomous-run.md) | Drive one task to a checkable exit condition without stopping, one verified change and one decision row per iteration, with an escape hatch for real dead ends. | Autonomous run |
| [Autopilot-full](../core/playbooks/autopilot-full.md) | Carry a queue of independent PRs from build to merged, one owner per PR, with merges authorized only by verdicts from verifiers that never wrote the code. | Autopilot full |
| [Autopilot-stack](../core/playbooks/autopilot-stack.md) | Carry a queue of changes to verified, green PRs, stacking only where one builds on another, and hand them to the operator without merging. | Autopilot stack |
| [Babysit](../core/playbooks/babysit.md) | Drive one open PR to merge-ready by clearing conflicts, review threads, and CI in that order, with skeptical triage of every comment, and never merge. | PR babysitting |
| [Bug fix](../core/playbooks/bug-fix.md) | Reproduce the bug on the real surface, prove the root cause with runtime evidence, land a failing test before the smallest fix, and verify on the same surface. | Bug fix |
| [Eval](../core/playbooks/eval.md) | Measure whether a variant (skill, prompt, playbook, model setting) changes agent behavior, with blinded candidates, a blinded judge, and evidence read from what candidates actually did. | Eval |
| [Feature](../core/playbooks/feature.md) | Design the data shape first, add a Feature Map check and a test that fail, implement with review separation, and verify the new behavior live. | Feature, Formal verification |
| [Hillclimb](../core/playbooks/hillclimb.md) | Sustained improvement of one measured number against a target, one change per attempt, kept or reverted on evidence. | Metric hillclimb |
| [Investigation](../core/playbooks/investigation.md) | A read-only, cited answer to a question about the code, a recommendation between options, or a code or security review of a diff. | Code review, Security review, Investigation |
| [Multi-phase plan](../core/playbooks/multi-phase-plan.md) | A checklist plan of small verifiable units for large or multi-PR work, or the phased execution of machine setup, new project bootstrap, and existing-project adoption. | Multi-phase plan, Machine setup, New project, Project adoption |
| [Opening a PR](../core/playbooks/opening-a-pr.md) | Turn verified work into a small, reviewable pull request with a one-minute briefing, opened ready for review. | Opening a PR |
| [Pause safely](../core/playbooks/pause-safely.md) | Stop at a safe boundary and leave a durable handoff that a cold-start agent can resume from without redoing work. | Pause |
| [Perf issue](../core/playbooks/perf-issue.md) | Fix one performance problem with a measured baseline, a traced cause, and a measured post-fix number on the same command. | Performance |
| [Prototype](../core/playbooks/prototype.md) | Answer one open design or approach question with throwaway variants observed side by side, then hand the chosen direction to Feature. | Prototype |
| [Refactoring](../core/playbooks/refactoring.md) | Change structure without changing behavior, pinned by a characterization check, split by responsibility under the 350-line gate, and proven equivalent on the real artifact. | Refactoring, Quality gates, Correction |
| [Runtime forensics](../core/playbooks/runtime-forensics.md) | Diagnose a live or intermittent failure by capturing a real runtime artifact, reducing it to the mechanism, proving that mechanism cheaply, and citing the source line. | Runtime forensics |
| [Session pickup](../core/playbooks/session-pickup.md) | Resume prior work from its durable trail (handoff, decision log, git state) without redoing finished steps, then route the remaining work to its playbook. | Session pickup |
| [Shipping](../core/playbooks/shipping.md) | Land a PR or a stack of PRs bottom-up, merging only the contiguous run that an independent verifier passed on its current patch, and confirm each merge by reading it back. | Shipping |
| [Trace forensics](../core/playbooks/trace-forensics.md) | Diagnose from an existing capture (profile, heap snapshot, trace, transcript, log bundle) by turning it into a queryable shape, narrowing to the cause, and attributing it to source. | Trace forensics |
| [Visual parity](../core/playbooks/visual-parity.md) | Migrate or restyle UI with pixel-exact equivalence, proven by an image-diff check against an untouched baseline wired into the Feature Map. | Visual parity |
| [Worktree cleanup](../core/playbooks/worktree-cleanup.md) | Reclaim disk from stale git worktrees, merged branches, and caches with a read-only audit first and safety gates that never delete unmerged or uncommitted work without the user's yes. | Cleanup |

## Principles

The router prints one line per principle. The agent opens the file before it cites a principle and names the choice it changed.

| Principle | Group | Applies when |
|---|---|---|
| [Laziness Protocol](../core/principles/laziness-protocol.md) | Core | Refactoring, sizing a diff, or tempted to add a layer. Bias to deletion and the smallest change that solves it. |
| [Foundational Thinking](../core/principles/foundational-thinking.md) | Core | Before writing logic. Settle core types, data structures, and what concurrent actors share first. |
| [Redesign from First Principles](../core/principles/redesign-from-first-principles.md) | Core | A new requirement lands in an existing design. Redesign as if it had been there from day one. |
| [Attack the Premise](../core/principles/attack-the-premise.md) | Core | Two fixes sharing one premise failed. Write the premise down and test it before a third fix. |
| [Subtract Before You Add](../core/principles/subtract-before-you-add.md) | Core | Sequencing an addition, refactor, or rewrite. Remove dead weight first, then build on the simpler base. |
| [Minimize Reader Load](../core/principles/minimize-reader-load.md) | Core | Code is hard to trace. Count layers and hidden state, collapse one-caller wrappers, shrink mutable scope. |
| [Outcome-Oriented Execution](../core/principles/outcome-oriented-execution.md) | Core | Planned rewrites and migrations. Converge on the target design; skip throwaway compatibility states. |
| [Experience First](../core/principles/experience-first.md) | Core | Product, UX, or scope tradeoffs. Choose what the user feels over implementation convenience. |
| [Exhaust the Design Space](../core/principles/exhaust-the-design-space.md) | Core | A novel interaction or architecture with no precedent. Build 2-3 competing prototypes, then compare. |
| [Build the Lever](../core/principles/build-the-lever.md) | Core | Any non-trivial work. Build the script, codemod, or check that does or proves it, so a reviewer can rerun it. |
| [Model the Domain](../core/principles/model-the-domain.md) | Architecture | Stateful or branch-heavy logic. Encode the domain in a structure (state machine, table, typed model). |
| [Boundary Discipline](../core/principles/boundary-discipline.md) | Architecture | Wiring validation, errors, or adapters. Guard at system boundaries, trust internal types, keep logic pure. |
| [Type System Discipline](../core/principles/type-system-discipline.md) | Architecture | Designing types or signatures. Make illegal states unrepresentable and parse external data at boundaries. |
| [Make Operations Idempotent](../core/principles/make-operations-idempotent.md) | Architecture | Commands, lifecycle steps, or loops that face crashes and retries. Converge to the same end state. |
| [Migrate Callers Then Delete Legacy APIs](../core/principles/migrate-callers-then-delete-legacy-apis.md) | Architecture | A new internal API while old callers exist. Migrate every caller and delete the old API in one wave. |
| [Separate Before Serializing Shared State](../core/principles/separate-before-serializing-shared-state.md) | Architecture | Concurrent actors might write the same file, branch, or key. Remove the sharing before adding locks. |
| [Prove It Works](../core/principles/prove-it-works.md) | Verification | Before declaring done. Verify against the real artifact on the real surface, not a proxy. |
| [Fix Root Causes](../core/principles/fix-root-causes.md) | Verification | Debugging. Trace each symptom to the first wrong state and fix it there; a guard is not a fix. |
| [Sequence Work into Verifiable Units](../core/principles/sequence-verifiable-units.md) | Verification | Multi-step work and commit stacks. Small units that each end in a check, verified before the next. |
| [Test Behavior, Not Implementation](../core/principles/test-behavior-not-implementation.md) | Verification | Writing or keeping a test. Assert what users observe, so it fails only when behavior breaks. |
| [Explain the Number](../core/principles/explain-the-number.md) | Verification | Before trusting or reporting a measurement. Find what limits it and rule out measuring the wrong thing. |
| [Guard the Context Window](../core/principles/guard-the-context-window.md) | Delegation | Large outputs, long files, fan-out. Route bulk to subagents or files; keep summaries in the main thread. |
| [Never Block on the Human](../core/principles/never-block-on-the-human.md) | Delegation | Tempted to ask about reversible work. Proceed, show the result, let the human course-correct. |
| [Encode Lessons in Structure](../core/principles/encode-lessons-in-structure.md) | Meta | Writing the same instruction twice. Encode it as a lint, test, type, or script instead of more text. |

## Skills

A skill is a procedure that a playbook step loads by path. `origin` says which upstream project it adapts; `gifisi-harness` marks original work.

| Skill | Origin | What it does |
|---|---|---|
| [how](../core/skills/how/SKILL.md) | pstack | Explains how a subsystem works today: runtime flow, key types, ownership, layering. |
| [why](../core/skills/why/SKILL.md) | pstack | Answers why code or a decision is the way it is, from commits, threads, decision logs and docs. |
| [teach](../core/skills/teach/SKILL.md) | pstack | Runs how and why and weaves them into one plain explanation that builds step by step. |
| [recall](../core/skills/recall/SKILL.md) | pstack | Rebuilds working context from `.gifisi/decisions.tsv`, the handoff file and git history. |
| [architect](../core/skills/architect/SKILL.md) | pstack | Settles types, signatures, state ownership and module boundaries before code, by comparing two sketched shapes. |
| [arena](../core/skills/arena/SKILL.md) | pstack | Produces N independent candidates, scores them on a rubric, grafts the best parts onto one base, verifies it. |
| [swarm](../core/skills/swarm/SKILL.md) | pstack | Fans out workers over independent slices and returns one report of PASS, ISSUES or BLOCKED with evidence. |
| [interrogate](../core/skills/interrogate/SKILL.md) | pstack | Adversarial review; a finding survives only when a rerun command shows it breaks the stated intent. |
| [blast-radius](../core/skills/blast-radius/SKILL.md) | pstack | Finds what a change could break outside its diff and proves the fact that makes it safe. |
| [tdd](../core/skills/tdd/SKILL.md) | pstack | Makes broken or missing behavior a failing test first, then fixes it and watches it pass. |
| [unslop](../core/skills/unslop/SKILL.md) | pstack | Removes AI writing patterns from prose while keeping meaning and tone. |
| [no-comments](../core/skills/no-comments/SKILL.md) | pstack | Strips comments from a diff and turns comments that explain surprises into refactor flags. |
| [correct](../core/skills/correct/SKILL.md) | pstack | Fixes a repeated mistake class at the highest ladder tier: architecture, then lint or test, then text. |
| [reflect](../core/skills/reflect/SKILL.md) | pstack | Mines a session for durable lessons and turns each into a ladder fix after the user approves. |
| [show-me-your-work](../core/skills/show-me-your-work/SKILL.md) | pstack | Owns the decision trail in `.gifisi/decisions.tsv` and its append-only rules. |
| [create-verification-skill](../core/skills/create-verification-skill/SKILL.md) | pstack | Builds the Feature Map, `.gifisi/feature-map.json`, so any agent can drive each feature live. |
| [maintain-verification-skill](../core/skills/maintain-verification-skill/SKILL.md) | pstack | Keeps the Feature Map true to the app as it changes. |
| [create-formal-verification-skill](../core/skills/create-formal-verification-skill/SKILL.md) | pstack | Checks one property over every case in a stated scope where tests reach least. |
| [maintain-formal-verification-skill](../core/skills/maintain-formal-verification-skill/SKILL.md) | pstack | Brings formal checks back in line after the covered code changed. |
| [benchmark-checklist](../core/skills/benchmark-checklist/SKILL.md) | pstack | Vets a performance number before anyone reports it or acts on it. |
| [figure-it-out](../core/skills/figure-it-out/SKILL.md) | pstack | Designs an auditable workflow when no narrower playbook fits. |
| [technical-writing](../core/skills/technical-writing/SKILL.md) | pstack | Layered standard for technical prose: one document mode, reader-first sentences. |
| [reframe](../core/skills/reframe/SKILL.md) | pstack | Gives the expert vocabulary for what the user is building and rewrites the request with it. |
| [sharpen](../core/skills/sharpen/SKILL.md) | pstack | Makes a task deeper, not bigger, by naming what a top professional would add. |
| [machine-setup](../core/skills/machine-setup/SKILL.md) | vibe-coding-toolkit | Prepares a developer machine inventory-first; installs nothing without the user's OK. |
| [project-bootstrap](../core/skills/project-bootstrap/SKILL.md) | vibe-coding-toolkit | Starts a Next.js + TypeScript app (Drizzle, PostgreSQL, Zod, Pino, Vitest) with `PRODUCT.md` first. |
| [project-adoption](../core/skills/project-adoption/SKILL.md) | vibe-coding-toolkit | Adopts the harness in an existing project while preserving its stack, database and contracts. |
| [quality-gates](../core/skills/quality-gates/SKILL.md) | vibe-coding-toolkit | Installs the ESLint gate with the 350-line ceiling, its self-check and a dependency-free fallback. |
| [context-tools](../core/skills/context-tools/SKILL.md) | vibe-coding-toolkit | Uses Context7, Graphify and RTK only after verifying each is present. |
| [code-review](../core/skills/code-review/SKILL.md) | vibe-coding-toolkit | Multi-lens review of a frozen diff; every finding carries a verified failure scenario. |
| [security-review](../core/skills/security-review/SKILL.md) | vibe-coding-toolkit | Read-only, evidence-based security review of a repository or a diff. |

## Prompts

Paste-ready prompts for tasks a person starts on purpose: machine setup, a new Next.js project, adopting an existing project, code review, security review, a file-size refactor, installing quality gates, brainstorm to plan, and a lint warning burndown. The catalog, with the playbook and skills each one loads, is in [core/prompts/README.md](../core/prompts/README.md). You do not need them for ordinary work; the router classifies plain requests.

## Templates

`core/templates/` holds the files the installer and the skills copy into a project:

- `AGENTS.project.md.template`, `CLAUDE.md.template`, `PRODUCT.md.template` and the five `docs/*.md.template` files.
- `core/templates/gifisi/`: the empty decision log, the corrections file and an example Feature Map.
- `task-handoff.md.template`, `security-review.md.template`, `environment-manifest.example.json`.
- `core/templates/eslint/`: flat config with `max-lines` at 350, local quality rules and a self-check script.
- `core/templates/hooks/`: hook settings and dependency-free hook scripts for Context7 reminders, Graphify refresh and RTK command rewriting, plus MCP and Codex config samples.
- `core/templates/next/`: the Next.js foundation (typed env schema with a test, Pino logger, Drizzle client and schema, Drizzle and Vitest configs).

The installer substitutes the tokens listed in `core/harness/manifest.json` (project name, harness home, package manager, test, lint, build and dev commands, date).

