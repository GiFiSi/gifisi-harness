# 01 Machine setup

## When to use

Use this prompt to bring a computer, a new user account, a VM, a container, a WSL distribution or a remote host to a verified development baseline: Git, GitHub CLI, a Node.js version manager with Node.js LTS, npm and pnpm, search and JSON utilities, a container engine with Compose, the agent clients you use, and optional context tools. It also repairs an existing environment with duplicate installs, a broken PATH or integrations that do not load.

It is machine scope only. Do not use it to create or configure an application; that is `core/prompts/02-new-next-project.md` or `core/prompts/03-existing-project-adoption.md`. The prompt does not pre-authorize installs: the agent inventories, proposes, and installs only what you approve.

## Prompt

```text
Prepare this machine for development by following the gifisi-harness router.
The harness files live in the harness home: `~/.gifisi-harness/` after a global
install, or `.gifisi/` inside a project that has the harness installed. Paths
below are relative to that home.

1. Before running any command that changes the machine, print the task-start
   signal exactly in this shape:
   [GIFISI-HARNESS] Task Type: Machine setup | Playbook: Multi-phase plan
   Reason: <one sentence on why this is a machine-scope setup task>
   Done Predicate: <the environment manifest path with every component marked
   ready, blocked or unsupported, and the version command that proves each
   ready component in a fresh shell>
2. Open `core/playbooks/multi-phase-plan.md`, take the setup branch, and copy its
   numbered Steps verbatim into your todo list. Execute them in order.
3. Load `core/skills/machine-setup/SKILL.md` now and follow its procedure. Load
   `core/skills/context-tools/SKILL.md` only when you reach Context7, Graphify or
   RTK.
4. Target: the environment this session runs in. If more than one
   environment is reachable (native OS and WSL, host and container), ask me
   which one before inventorying. Never mix executables between them.
5. Inventory first, change nothing: OS, architecture, shell and startup
   files, PATH, privileges, package managers, runtimes, global packages,
   CLIs, agent clients and their skills, MCP servers, hooks and plugins.
   Use each ecosystem's own listing, not only what PATH resolves.
6. Start the environment manifest from `core/templates/environment-manifest.example.json`
   in a setup directory outside every project, for example
   ~/dev-setup/environment-manifest.json.
7. Write a proposal, one line per component: current state, action (install,
   update, reconcile duplicate, leave), official source, scope, and any cost,
   restart or system password it needs. Show it to me and wait for my OK per
   group. Reading and inventory need no OK. Installing, updating, removing a
   duplicate, editing shell startup files and changing client settings do.
   External skills, plugins and MCP servers also need the source safety check
   from the context-tools skill before install.
8. Back up every config file before you edit it, into a dated directory next
   to the manifest, and record the restore command.
9. Apply approved changes in dependency order with each tool's official
   method and stable channel. Never install one tool through two managers.
   Never pipe a downloaded script into a shell without showing me the exact
   command first.
10. Verify in a fresh shell: version command and resolved path for each
    component; per-project Node.js switching; `docker version`,
    `docker compose version` and `docker run --rm hello-world`, removing only
    what the test created. A config file on disk does not prove an agent
    integration loads: confirm discovery in a new session or mark it
    unverified.
11. With my OK, install the global harness after the agent clients pass:
    bash <harness-checkout>/install.sh --global
    (without bash: node <harness-checkout>/scripts/sync-harnesses.mjs --global).
    Back up ~/.claude/CLAUDE.md, ~/.codex/AGENTS.md and
    ~/.cursor/rules/gifisi-harness.mdc first. Run the same command again and
    confirm its last line reports writes=0. Record the managed files in the
    manifest. Cursor may need the user rule added in its Settings, so mark
    it configured, not verified, until a new Cursor session shows the router.
12. Log each phase with
    node scripts/log-decision.mjs --log ~/dev-setup/decisions.tsv setup "<component> <action>" "<why>" "<version output>" "<ready|blocked>"
    (inside a project, omit --log so rows go to .gifisi/decisions.tsv).

Limits: never ask for, print or store a password, token or one-time code;
authentication happens in each tool's own login flow and I complete it.
Do not change any agent client's model, provider, permission mode or
billing. Do not touch project dependencies, lockfiles or data. A blocked
item blocks only its dependents; finish the independent steps and tell me
the exact intervention needed.
```

## Expected result

- The `[GIFISI-HARNESS]` header, then the multi-phase plan setup steps as the todo list.
- An inventory and a written proposal, and no install before your OK.
- The environment manifest outside every project, with `template` set to `false`, a `generated_at` timestamp, and each component marked `ready`, `blocked` or `unsupported` with a reason.
- A private report beside it: previous and final versions, sources, backups with restore commands, fresh-shell verification output, and open interventions (browser login, system password, restart).
- The global harness installed with your OK, a second run reporting `writes=0`, and the Cursor rule marked configured until a new Cursor session shows the router.
- One decision-log row per phase.

## Source

- `docs/prompts/10-development-environment-setup.md` and `docs/03-environment-setup.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Adapted for gifisi-harness: routed through the router header and `playbooks/multi-phase-plan.md`; installs need approval instead of the upstream pre-granted authorization.
