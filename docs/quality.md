# Quality

Three commands define done for this repository. Each section below says what a command checks and where its proof stops. Run them from a checkout of this repository: a global install does not copy them, `install.sh`, `docs/` or the tests.

## Commands

| Command | Proves | Exit code |
|---|---|---|
| `node scripts/validate-harness.mjs` | The repository is complete and consistent | 0 when no problem is found |
| `node scripts/validate-harness.mjs --skip-tests` | The same, without the unit tests, for fast iteration | 0 when no problem is found |
| `node scripts/check-install.mjs` | `install.sh` is clean on run 1 and idempotent on run 2 | 0 when every fixture passes |
| `node scripts/run-autonomous-smoke-test.mjs` | The harness drives a full improvement cycle on a broken app | 0 when every before-failure and after-pass was observed |
| `npm test` | The unit tests under scripts/tests, through `node scripts/run-tests.mjs`, which names each test file so the command works on Node 18+ in any shell | 0 when all pass |

## Validator checks

`scripts/validate-harness.mjs` reports every problem as `<file>: <message>` and exits 1 if there is at least one. It checks:

- Canonical sets: the files in `core/playbooks/`, `core/principles/` and `core/skills/` match `core/harness/manifest.json` exactly (22, 24 and 31).
- Playbook shape: frontmatter `name` equals the file name, `title` matches the manifest, `summary` present, `skills` and `principles` name only manifest entries, all six sections present and non-empty, 3 to 12 steps of at most 320 characters.
- Principle shape: `name`, `title`, `group` and `applies_when` match the manifest; all six sections present.
- Skill shape: `name` equals the folder, `description` 1 to 400 characters, `origin` matches the manifest, at least three procedure steps.
- Routes: unique ids, known playbooks and skills, a valid fallback, every playbook reachable from some route, and every skill reachable from some route or from a playbook's `skills` frontmatter.
- Prompts: each manifest prompt exists with `When to use`, a fenced `Prompt` block and `Expected result`.
- Required files: every manifest template, script and doc, plus the top-level files, exist and are not trivially small.
- Router: `node scripts/sync-harnesses.mjs --repo --check` reports no drift; the repo, project and global renders are each at most 149 lines with no unrendered tokens; `CLAUDE.md` imports `@AGENTS.md` and stays a bridge; the Cursor rule has `alwaysApply: true`.
- Syntax: `node --check` on every script, `JSON.parse` on every JSON file, LF endings and `bash -n` on shell scripts.
- Decision log: this repository's `.gifisi/decisions.tsv` has the six-column header and well-formed rows.
- Content: no unfinished-work markers or filler; no vendor model names or vendor-only agent knobs in harness content; no slash-command invocations; template tokens only in `core/templates/`.
- Links: every relative Markdown link and anchor resolves, and every backticked harness path resolves to a real file.
- Unit tests: runs `node --test` with an explicit list of the test files under scripts/tests unless `--skip-tests` is given.

## The 350-line gate

Every code file in this repository has at most 350 raw lines; the validator counts them. In target projects the gate comes in two forms:

- With ESLint: `core/templates/eslint/eslint.config.mjs` sets `max-lines` to 350 (blank lines and comments skipped) plus local quality rules, and `core/templates/eslint/verify-quality-rules.mjs` proves each rule fires on a known-bad sample.
- Without ESLint: `node scripts/quality-gate.mjs` counts lines the same way, flags `debugger` statements, prints the largest file and exits 1 on any violation.

`.gifisi/project.json` records whether the project's ESLint config already has a `max-lines` rule, so the agent knows which form to run.

## Idempotency proof

`scripts/check-install.mjs` builds three fixtures in the system temp directory:

- an empty project, created by the install;
- a brownfield project with a CRLF `AGENTS.md`, a `CLAUDE.md` with user text, `package.json` scripts, a test, an ESLint config with `max-lines`, a user-written architecture doc and a pnpm lockfile;
- a home directory with an existing `.claude/CLAUDE.md`.

For each fixture it runs the installer twice through `install.sh` and hashes every file after each run. It passes only when the hashes match, run 2 reports `writes=0`, each managed file has exactly one begin and one end marker, brownfield bytes outside the markers and every protected file are unchanged, `.gifisi/project.json` detects pnpm and the `max-lines` rule, and `validate-project.mjs` passes on the result. It prints a PASS or FAIL table and removes the fixtures unless `--keep` is given.

## Smoke test

`scripts/run-autonomous-smoke-test.mjs` writes a small HTTP app to `/tmp/gifisi-smoke-app` with three planted problems: a cart total that concatenates strings instead of adding numbers, an ignored `coupon` parameter, and a formatter module over 350 lines. It installs the harness, writes a Feature Map, and records a before snapshot from real runs: live Feature Map checks, the quality gate and the existing tests.

It then runs three tasks. For each one it classifies the prompt with the installed `classify-task.mjs`, prints the real header and the playbook steps as the todo list, and logs a `signal` row. The bug task reproduces the failure live, adds a failing test, fixes the parse at the input boundary and verifies. The feature task adds a failing test, implements coupons and verifies live. The refactor task captures characterization output, replaces the messy module with a table-driven one under the gate, and proves the output is identical.

The after snapshot repeats the real runs and adds the decision-log check and project validation. The script prints a before and after table, the decision trail and a verdict, then removes the app unless `--keep` is given.

## What is verified and what is not

Verified by a real run:

- Repository structure, content rules, links and router size and drift.
- Installer idempotency and byte preservation on the fixtures above, on the machine that runs the check.
- Classification of the three smoke prompts to their expected playbooks.
- Bug, feature and refactor outcomes on the smoke app through live HTTP checks, tests and the quality gate.
- The format of every decision row the smoke test writes.

Not verified by these commands:

- That a given agent follows the router. The smoke test's code edits are scripted stand-ins for an agent's changes. Every check, run and log row around them is real, but no model is in the loop.
- That Cursor loads the global rule file. The installer writes it; Cursor may need the rule added in its Settings.
- External tools (Context7, Graphify, RTK). Their hooks are templates; nothing here installs or calls them.
- Projects unlike the fixtures (monorepos, unusual lockfiles, non-Node stacks). Stack detection reads only lockfiles, `package.json` scripts and config files; a command it cannot find is recorded as `null` in `.gifisi/project.json`.

## Source

- `templates/project-docs/quality.md.template`, `docs/05-toolkit-validation.md` and `docs/tools/06-eslint-biome-quality-gates.md`, Vibe Coding Toolkit by Matheus Gomes (MIT): quality document layout, validation scripts and the 350-line gate.
- `pstack/skills/create-verification-skill/SKILL.md` and `pstack/docs/guide/06-verify-and-ship.md`, pstack by Lauren Tan (MIT): live-surface verification.
