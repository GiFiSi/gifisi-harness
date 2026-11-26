# Setup

## Requirements

- Node 18 or newer. Check with `node --version`. `install.sh` stops with a clear error on older versions.
- bash. On Windows, use Git Bash. If bash is missing, run the installer script directly: `node scripts/sync-harnesses.mjs --project <path>`.
- git is optional for the harness itself. Some playbooks (opening a PR, shipping, worktree cleanup) need it in the target project.
- No npm install. The repository has no dependencies.
- `npm test` runs `node scripts/run-tests.mjs`, which passes the test files to `node --test` by name. It works on Node 18 and newer in Git Bash, `cmd.exe` and PowerShell, which do not all expand a `*.test.mjs` glob.

## Install into a project

```bash
./install.sh --project /path/to/project            # install or update
./install.sh --project /path/to/project --dry-run  # print actions only
```

The target directory is created if it does not exist. The installer copies the harness to `.poteto/`, detects the stack into `.poteto/project.json`, creates `.poteto/decisions.tsv` and `.poteto/corrections.md`, splices the router into `AGENTS.md`, makes sure `CLAUDE.md` imports `@AGENTS.md`, writes `.cursor/rules/poteto-harness.mdc`, and creates `PRODUCT.md` and the five `docs/` files only when they are missing. It never edits `package.json`, lockfiles, tests, lint configs, source files or `.gitignore`.

To update, pull this repository and run the same command again. Only files whose bytes changed are rewritten.

Commit `.poteto/` with the project if you want teammates and CI to share the decision trail and the Feature Map. Nothing in the harness requires it.

## Install globally

```bash
./install.sh --global                       # under your home directory
./install.sh --global --home /some/dir      # under another directory
./install.sh --global --dry-run
```

This copies the run-time part of the harness to `<home>/.poteto-harness/`: `core/` (playbooks, principles, skills, prompts, templates, harness data), the runtime scripts with all of `scripts/lib/`, LICENSE and `docs/THIRD_PARTY_NOTICES.md`. It leaves out `README.md`, the rest of `docs/`, `install.sh`, `package.json`, `scripts/tests/`, `scripts/smoke/` and the repository-only scripts (`validate-harness.mjs`, `check-install.mjs`, `run-autonomous-smoke-test.mjs`, `run-tests.mjs`), so run those proof commands from a checkout of this repository. It then splices the router into `<home>/.claude/CLAUDE.md` and `<home>/.codex/AGENTS.md`, and writes `<home>/.cursor/rules/poteto-harness.mdc`. Your own text in those files is kept. Cursor may only load user-level rules that you add in its Settings; the file is written, but loading it is not verified.

With only a global install, a project has no `.poteto/project.json`. The router then tells the agent to read the project's commands from its own manifest (`package.json` scripts, Makefile) and to create `.poteto/decisions.tsv` and `.poteto/corrections.md` from `<home>/.poteto-harness/core/templates/poteto/` the first time it needs them.

A project install and a global install can coexist. Instructions in the project's own files outside the managed block take precedence over the router.

## Windows and Git Bash notes

- Git Bash maps `/tmp` to your user temp directory (`%TEMP%`). Node on Windows resolves a bare `/tmp/x` to `C:\tmp\x`, a different place. `install.sh` converts path arguments with `cygpath -m` before passing them to Node, so `./install.sh --project /tmp/test-harness-target` writes to the same directory bash sees.
- The repository scripts compute their temp directory from the operating system (the `tmpRoot()` helper in `scripts/lib/paths.mjs`), so `check-install.mjs` and the smoke test use the same `/tmp` as Git Bash.
- `.gitattributes` forces LF for `*.sh`, `*.mjs`, `*.md`, `*.json` and `*.tsv`. If `install.sh` fails with `$'\r': command not found`, the checkout converted it to CRLF; run `git add --renormalize .` or check out again.
- Existing CRLF files in your project stay CRLF. The installer writes the managed block with the file's own line endings.
- Run `install.sh` from Git Bash, not from `cmd.exe` or PowerShell. From PowerShell you can call `bash ./install.sh --project C:/path/to/project`.

## Verify an install

```bash
node <project>/.poteto/scripts/validate-project.mjs --root <project>
```

It checks the managed blocks, the Cursor rule, the copied playbooks, principles and skills, `.poteto/project.json`, `.poteto/decisions.tsv`, `.poteto/corrections.md`, `PRODUCT.md`, the five docs and the router size, and exits 1 on any failure.

## Uninstall

The harness writes only inside managed markers, its own directories and files it created. Remove them in this order.

Project install:

1. In `AGENTS.md`, delete everything from the line that starts with `<!-- poteto-harness:begin` through the line `<!-- poteto-harness:end -->`, inclusive. If the installer created `AGENTS.md` from the template and you never edited it, delete the file instead.
2. In `CLAUDE.md`, delete the managed block the same way. If the installer created the file (a source comment plus `@AGENTS.md`), delete the file.
3. Delete `.cursor/rules/poteto-harness.mdc`.
4. Delete `.poteto/`. It contains project data: `.poteto/decisions.tsv`, `.poteto/corrections.md` and `.poteto/feature-map.json`. Copy them elsewhere first if you want to keep the decision trail or the Feature Map.
5. Keep `PRODUCT.md` and `docs/`. They were created from templates, but they are your documents now.

Global install:

1. Delete the managed block from `<home>/.claude/CLAUDE.md` and `<home>/.codex/AGENTS.md`. Delete either file if it held nothing else.
2. Delete `<home>/.cursor/rules/poteto-harness.mdc`, and remove the rule from Cursor Settings if you added it there.
3. Delete `<home>/.poteto-harness/`.

Running the installer again after an uninstall recreates everything from scratch.

## Source

- `docs/01-installation.md`, `docs/03-environment-setup.md` and `templates/project-docs/setup.md.template`, Vibe Coding Toolkit by Matheus Gomes (MIT): setup document layout and installation steps.
- `pstack/docs/guide/01-setup.md`, pstack by Lauren Tan (MIT): installing the harness and choosing where it loads.
