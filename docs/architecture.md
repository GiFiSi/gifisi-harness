# Architecture

gifisi-harness is a tree of Markdown content, three JSON or Markdown sources of truth, and a set of dependency-free Node scripts that render, install and verify that content. There is no build step and no runtime service.

## Sources of truth

| Source | Owns | Read by |
|---|---|---|
| `core/harness/manifest.json` | Canonical names and titles of playbooks, principles (with group and `applies_when` line), skills (with origin), prompts, templates, template tokens, scripts, project scripts, docs, decision columns, size limits | `scripts/validate-harness.mjs`, `scripts/sync-harnesses.mjs`, `scripts/validate-project.mjs` |
| `core/harness/routes.json` | Task routes: id, task type, playbook, skills, classifier signals, and the fallback route | `scripts/sync-harnesses.mjs` (routes table), `scripts/classify-task.mjs` |
| `core/harness/router.md` | Router prose with three tokens: the harness home prefix, the routes table and the principles index | `scripts/sync-harnesses.mjs` |

Everything else is content that the router points to: `core/playbooks/`, `core/principles/`, `core/skills/`, `core/prompts/`, `core/templates/`. Content files refer to each other by repo-relative path in backticks. The validator resolves each path.

## Render pipeline

`scripts/sync-harnesses.mjs` turns the three sources into one rendered router block:

1. Read `core/harness/router.md`.
2. Replace the routes-table token with a Markdown table built from `core/harness/routes.json` in file order: task type, the first four signals, the playbook title with its path, and the route's skills.
3. Replace the principles-index token with one line per principle from `core/harness/manifest.json`: title, group, `applies_when` line, path.
4. Replace the home token with the prefix for the target: empty in this repository, `.gifisi/` in a project, and the absolute `<home>/.gifisi-harness/` path (forward slashes) in a global install.
5. Wrap the result in the managed markers and a generated-source comment.

The rendered block must stay at or below 149 lines for all three targets. `node scripts/sync-harnesses.mjs --print-router <repo|project|global>` prints it, and the validator measures each one.

In this repository the block lands in:

- `AGENTS.md`: a hand-written top section, then the managed block.
- `CLAUDE.md`: a one-line source comment and `@AGENTS.md`, so Claude Code reads the same router.
- `.cursor/rules/gifisi-harness.mdc`: frontmatter with `alwaysApply: true`, then the managed block.

`node scripts/sync-harnesses.mjs --repo` regenerates them. `--repo --check` writes nothing and exits 1 when any of them drifted from the sources.

## Install targets and markers

Managed blocks are delimited by two lines:

```text
<!-- gifisi-harness:begin (managed by gifisi-harness sync-harnesses.mjs; edits inside are overwritten) -->
<!-- gifisi-harness:end -->
```

The installer splices the block between existing markers, or appends it when there are none. It keeps every byte outside the markers and the file's line-ending style. A file it owns whole (the `.mdc` rule) is overwritten only when it already carries the begin marker; an unmanaged file at that path is reported as `skip (not managed)`.

| Mode | Command | Harness copy | Router written to |
|---|---|---|---|
| Project | `./install.sh --project <path>` | `<path>/.gifisi/` (`core/` content and harness data, the project scripts, LICENSE, `docs/THIRD_PARTY_NOTICES.md`) | `AGENTS.md`, `CLAUDE.md` bridge, `.cursor/rules/gifisi-harness.mdc` |
| Global | `./install.sh --global [--home DIR]` | `DIR/.gifisi-harness/`: `core/` content and harness data, the runtime scripts with all of `scripts/lib/`, LICENSE, `docs/THIRD_PARTY_NOTICES.md`. No `README.md`, rest of `docs/`, `install.sh`, `package.json`, `scripts/tests/`, `scripts/smoke/` or repository-only scripts | `DIR/.claude/CLAUDE.md`, `DIR/.codex/AGENTS.md`, `DIR/.cursor/rules/gifisi-harness.mdc` |

The global copy holds what an agent needs at run time, not what proves the repository. `globalEntries()` in `scripts/sync-harnesses.mjs` defines the set. The proof commands (`validate-harness.mjs`, `check-install.mjs`, `run-autonomous-smoke-test.mjs`, `run-tests.mjs`) run from a checkout of this repository, never from the global copy.

Copies are write-if-different. Each install records its managed file list in `.installed.json` (sorted, no timestamps). A file listed there that no longer exists in the source is removed; nothing unlisted is ever deleted. Every action is printed (`create`, `update`, `unchanged`, `skip (exists, preserved)`, `skip (not managed)`, `remove`), followed by a `writes=<N>` summary.

`install.sh` checks for Node 18 or newer, converts path arguments with `cygpath -m` when that tool exists (Git Bash on Windows), and runs `scripts/sync-harnesses.mjs`.

## Project artifacts

A project install creates or maintains four files under `.gifisi/`:

| Artifact | Shape | Written by | Lifecycle |
|---|---|---|---|
| `.gifisi/decisions.tsv` | Tab-separated, header `ts phase decision why evidence result`, UTC timestamps | `scripts/log-decision.mjs` | Created once with the header; append-only after that |
| `.gifisi/feature-map.json` | `app` (start command, cwd, port variable, ready path, timeout) and `features` with HTTP or CLI checks | The agent, following `core/skills/create-verification-skill/SKILL.md` | Kept true to the app by `core/skills/maintain-verification-skill/SKILL.md` |
| `.gifisi/project.json` | Name, package manager, test, lint, build and dev commands, frameworks, ESLint config and `max-lines` status, harness home | The installer, from lockfiles, `package.json` and config files | Regenerated deterministically on each install |
| `.gifisi/corrections.md` | Tier-3 rules, each paired with what enforces it | The agent, following `core/skills/correct/SKILL.md` | Created once from `core/templates/gifisi/corrections.md.template` |

The installer also creates `PRODUCT.md` and the five `docs/*.md` files from `core/templates/` when they are missing, and leaves them alone when they exist.

## Script map

"Runs in" names where a copy of the script exists: the repository checkout, a project install (`.gifisi/scripts/`) or a global install (`<home>/.gifisi-harness/scripts/`).

| Script | Runs in | Role |
|---|---|---|
| `scripts/sync-harnesses.mjs` | Repository, global | Render the router; repo sync and drift check; project and global installs |
| `scripts/validate-harness.mjs` | Repository | Repository validation (predicate 1) |
| `scripts/check-install.mjs` | Repository | Install idempotency on empty, brownfield and global fixtures (predicate 2) |
| `scripts/run-autonomous-smoke-test.mjs` | Repository | Autonomous improvement cycle on a broken app (predicate 3) |
| `scripts/run-tests.mjs` | Repository | Run `scripts/tests/*.test.mjs` with an explicit file list; `npm test` calls it |
| `scripts/classify-task.mjs` | Repository, project, global | Rank routes for a prompt; print a suggested header |
| `scripts/log-decision.mjs` | Repository, project, global | Append to or check `.gifisi/decisions.tsv` |
| `scripts/verify-feature-map.mjs` | Repository, project, global | Start the app on a free port and run Feature Map checks live |
| `scripts/quality-gate.mjs` | Repository, project, global | 350-line and `debugger` gate, counting lines the way ESLint `max-lines` does |
| `scripts/validate-project.mjs` | Repository, project, global | Check that a project install is complete |
| `scripts/lib/paths.mjs` | Repository, project, global | Harness root, temp root, user path resolution, project root lookup |
| `scripts/lib/frontmatter.mjs` | Repository, project, global | Frontmatter, section and numbered-list parsing |
| `scripts/lib/content-checks.mjs` | Repository, global | Banned-content, line-count and link checks for the validator |
| `scripts/lib/detect-stack.mjs` | Repository, global | Stack detection for `.gifisi/project.json` and template token values |
| `scripts/lib/install-tree.mjs` | Repository, global | Write-if-different copying, the action log and `.installed.json` pruning |
| `scripts/lib/managed-blocks.mjs` | Repository, global | Router rendering, marker splicing that keeps the file's line endings, the owned Cursor rule |
| `scripts/smoke/fixture.mjs` | Repository | The smoke test's broken app and its three planted problems |
| `scripts/smoke/edits.mjs` | Repository | Scripted stand-ins for an agent's edits, each an exact whole-file write or single-match replacement |
| `scripts/smoke/steps.mjs` | Repository | Real runs of the installed scripts and of `node --test` during the smoke test |

The scripts that run in a project are the `projectScripts` in `core/harness/manifest.json`. They resolve the harness root from their own location, so the copy under `.gifisi/scripts/` reads `.gifisi/core/harness/` and `.gifisi/core/playbooks/`. The global copy adds the installer and its helpers, so `node "<home>/.gifisi-harness/scripts/sync-harnesses.mjs" --project <path>` can install into a project without a checkout.

## Source

- `templates/project-docs/architecture.md.template`, Vibe Coding Toolkit by Matheus Gomes (MIT): section layout of an architecture document.
- `pstack/skills/poteto-mode/SKILL.md`, pstack by Lauren Tan (MIT): the router and playbook loading model that the render pipeline delivers.
