---
name: machine-setup
description: Prepare or repair a developer machine inventory-first. Record every component, version and backup in an environment manifest, propose installs, and install nothing without the user's OK. Load for new machines, broken toolchains, or reproducing an environment elsewhere.
origin: vibe-coding-toolkit
---

# Machine setup

Bring a computer to a known, verified development baseline without surprising the owner. The scope is the machine: runtimes, package managers, CLIs, agent clients and their integrations. Project dependencies, lockfiles and data stay untouched. The result is a filled environment manifest plus a private report that says what is ready, what is blocked, and how to restore every changed setting.

## When to use

- A new machine, a new user account, a container, VM, WSL distribution or remote server that must run development work.
- An existing environment with broken PATH entries, duplicate installs, an old Node.js, or agent integrations that do not load.
- Reproducing a recorded environment on another machine from a sanitized manifest.
- Skip it for project setup. A new application uses `core/skills/project-bootstrap/SKILL.md`; an existing repository uses `core/skills/project-adoption/SKILL.md`.

## Procedure

1. Name the target. State which environment receives the setup: native OS, WSL, container, VM or remote host. When more than one is reachable, ask which one. Never mix executables or dependencies between native Windows and WSL.
2. Inventory before changing anything. Record OS, version, architecture, shell, startup files, PATH, privileges, system package manager, runtimes, global packages, CLIs, agent clients, and each client's skills, MCP servers, hooks and plugins. Use each ecosystem's own listing (`npm ls -g --depth=0`, `brew list`, `winget list`, `fnm list`, client config files), not only what PATH resolves. For each component note name, purpose, version or revision, path, source, install method and update method.
3. Start the manifest from `core/templates/environment-manifest.example.json`. Copy it to a user setup directory outside every project, for example `~/dev-setup/environment-manifest.json`. Fill the `environment` block and one `components` entry per item found. Keep statuses at `pending` until a check passes.
4. Read project constraints. Scan the projects the user names for `.nvmrc`, `.node-version`, `engines`, `packageManager` and lockfiles. A version a project requires is a requirement, not a duplicate.
5. Compare against the baseline below and write a proposal: one line per component with current state, proposed action (install, update, reconcile duplicate, leave), source URL, scope (machine, user, client), and any cost, restart or system password it needs. Distinguish real duplicates from symlinks and installs that serve different environments.
6. Ask before installing. Present the proposal and wait for an explicit OK per group. Installing, updating, removing a duplicate, editing shell startup files, and changing client settings all need that OK. Reading and inventory do not. External skills, plugins and MCP servers also need a safety scan of their source per `core/skills/context-tools/SKILL.md` before install.
7. Back up before each approved change. Copy every config file you will edit (shell rc files, client settings, MCP config, hook config) to a dated backup directory beside the manifest. Record the backup path and the restore command in the report.
8. Apply approved changes in dependency order: system prerequisites and package manager; Git and GitHub CLI; search and JSON utilities; Node.js version manager, Node.js LTS, npm, pnpm; agent CLIs; container engine and Compose; agent integrations. Use each tool's official install method, a stable channel, and the existing install method when one already works. Do not install the same tool through two managers.
9. Verify in a fresh shell, without temporary variables. For each component run its version command and record the resolved executable path. Check per-project Node.js switching and return to the default. For containers run `docker version` (client and server), `docker info`, `docker compose version`, and `docker run --rm hello-world`, then remove only what the test created. For agent integrations, a file on disk is not proof: confirm discovery in a new session.
10. Install the global harness, with the user's OK, once the agent clients pass step 9. Propose it in step 5 like any other component (scope: user; it writes `~/.gifisi-harness/`, a managed block in `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`, and `~/.cursor/rules/gifisi-harness.mdc`, preserving everything outside the markers) and back up those three client files in step 7. Run `bash <harness-checkout>/install.sh --global` from a checkout of gifisi-harness (without bash: `node <harness-checkout>/scripts/sync-harnesses.mjs --global`). Run the same command a second time and confirm its last line reports `writes=0`; any other count means the install is not idempotent, so record it as `blocked`. Add one `components` entry for the harness with the checkout revision and the managed files the run listed. Cursor may load user-level rules only when they are added in its Settings, so mark the Cursor rule as configured, not verified, until a new Cursor session shows the router; for Claude Code and Codex confirm the router header appears in a new session.
11. Close the manifest. Set each component's status to `ready`, `blocked` or `unsupported`, with a reason in `notes` for anything not ready. Fill `generated_at` with the UTC timestamp and set `template` to `false`. For a shareable copy, replace personal home paths with `${USER_HOME}` and remove private names, private repositories and any credential.
12. Record the decision trail when a project is open: `node scripts/log-decision.mjs setup "<component> <action>" "<why>" "<version command output>" "<ready|blocked>"`.

## Baseline

| Group | Components |
|---|---|
| System | Certificates, download, extraction and compiler toolchain; a system package manager |
| Development | Git, GitHub CLI, a Node.js version manager (fnm preferred), Node.js LTS, npm, pnpm, ripgrep, fd, jq |
| Containers | Docker client, a reachable engine, Compose v2 via `docker compose` |
| Agents | The agent clients the user works with, authenticated through their own login flow, plus the global gifisi-harness install (step 10) |
| Optional context tools | Context7, Graphify, RTK, handled by `core/skills/context-tools/SKILL.md` |

Treat optional items as `required: false` in the manifest until a selected workflow needs them.

## Guardrails

- Never ask for, print or store passwords, tokens or one-time codes. Authentication happens in the tool's own login flow; the user completes it.
- Never change an agent client's model, provider, permission mode or billing as a side effect of setup.
- Do not use `curl | sh` or `irm | iex` installers without showing the exact command and getting the OK.
- Do not remove a component whose purpose is unknown. Preserve it and record the open question.
- Do not clean Docker volumes, images or containers you did not create.
- A blocked item blocks only its dependents. Continue the independent steps and report the exact intervention needed: browser login, system password, OS permission, restart.

## Output

- The manifest file path, with `template: false`, a `generated_at` timestamp, and every component marked `ready`, `blocked` or `unsupported`.
- A private Markdown report beside it: environment, the approved proposal, previous and final versions, sources and install methods, backups and restore commands, verification commands with results, and open interventions.
- For reproduction on another machine: the sanitized manifest path and the note that sessions, secrets and container data do not travel with it.

## Source

- `docs/03-environment-setup.md` and `docs/prompts/10-development-environment-setup.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- `templates/environment-manifest.json.example`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for gifisi-harness: inventory-first and ask-before-install replace the upstream prompt's pre-granted install authorization.
