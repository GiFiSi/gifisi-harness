---
name: create-verification-skill
description: Build the project's Feature Map, .gifisi/feature-map.json, plus a verify notes file, so any agent can launch the real app, drive each user-visible feature, and prove it with scripts/verify-feature-map.mjs. Load when a project has no scripted way to prove UI, CLI, or service behavior, or when a new feature needs a live check.
origin: pstack
---

# Create a verification skill

A test proves what a function returns. A user does not call functions. They open a page, send a request, or run a command. This skill gives the project a scripted way to drive the real app the way a user does and to keep the evidence.

The deliverable has two parts:

- **The Feature Map**, `.gifisi/feature-map.json`. One entry per user-visible feature. `node scripts/verify-feature-map.mjs` launches the app, runs every check against the live surface, and exits 1 on any failure.
- **The verify notes**, `<project>/.gifisi/verify/README.md`. Launch, Doctor, Drive, Evidence, and Cleanup instructions for the parts a JSON check cannot express, written for an agent who reads them cold, mid-task, and has never seen the app.

A complete worked example lives in [the feature-map example](references/feature-map-example.md). The starter shape the installer ships is `core/templates/gifisi/feature-map.example.json`.

## When to use

- The project has no `.gifisi/feature-map.json`, or the map is missing a feature a user can reach.
- A bug-fix or feature playbook step says "add a live check". The check you add here is the one that fails before the fix and passes after it.
- A plan unit has a live verification box that needs to become a runnable check.
- Not for keeping an existing map honest after the app changed. That is `core/skills/maintain-verification-skill/SKILL.md`.
- Not for proving a property over every order of events or every input. That is `core/skills/create-formal-verification-skill/SKILL.md`.

## Procedure

1. Interview the repo, not the user. Answer from the code and ask the user only what you cannot observe: **Surface** (what a user touches: HTTP API, web UI, CLI, desktop, library), **Run** (the documented start command, port variable, env vars, seed data, auth), **Drive** (existing harnesses first: browser test specs, curl-able routes, CLI entry points), **Observe** (status codes, JSON bodies, stdout, exit codes, files, rows), and **Isolate** (can two instances run side by side without sharing a port or data directory).
2. Make the checkout start as-is. If it does not build or start, fix that first or report the exact failure. A map written against a broken base teaches wrong steps. If an unrelated missing asset blocks startup, create it in a launcher script and mark it as verification scaffolding.
3. Write the `app` block. `start` is the argv that starts the server (`node` as the first element runs with the same Node binary as the script). `cwd` is relative to the project root, and `cli` checks inherit it (step 5). `portEnv` names the env var the app reads for its port; the script picks a free port and sets it. `readyPath` must answer 2xx only when the app is usable, not merely listening. If the app needs more env than the port, or seed data, add a small `<project>/scripts/verify-launch.mjs` that sets them, seeds a disposable data directory under the OS temp dir, and then starts the server; point `start` at it.
4. List the user-visible features from routes, commands, menus, and docs. Start with the top 3 to 5 a user would miss most. Give each a stable kebab-case `id`, a one-line `description` in user terms, and a `surface` of `http` or `cli`.
5. Write the checks for each feature with the keys `scripts/verify-feature-map.mjs` reads; it ignores any other key, so a typo silently checks nothing. Every check has `name` and optional `timeoutMs`. An `http` check has `request` (`method`, default `GET`; `path` with its query string; `headers`, an object such as `{"authorization": "Bearer <test token>"}`; `body`, sent as is when it is a string, otherwise sent as JSON with `content-type: application/json` unless you set one) and `expect` with any of `status`, `json` (each key is a dotted path such as `results.0.title`, compared deep-equal), `bodyIncludes`, and `bodyExcludes`; its `timeoutMs` defaults to 5000. A `cli` check has `run` (an argv array), optional `cwd`, and `expect` with any of `exitCode` (default 0), `stdoutIncludes`, and `stderrIncludes`; its `timeoutMs` defaults to 30000. A `cli` check runs in its own `cwd`, else in `app.cwd`, else in the project root, each resolved against the project root (the folder that holds `.gifisi/`, or `--root`), so write `run` paths relative to that folder. Put only test credentials in `headers`, never real secrets, because the map is committed. For a browser UI, add a `cli` check that runs the project's own browser test command for that journey and expects exit code 0. Start tools through their JavaScript entry with `node`, not a package-manager shim, because `.cmd` shims do not start without a shell on Windows.
6. Assert what a user observes. Pin exact values (`"total": 15`), not just presence. Cover the happy path, one rejected input, and every entry point the map lists. Each check must stand alone: never rely on the order features run in or on state another check left behind.
7. Run `node scripts/verify-feature-map.mjs` and read every row. A check that passes on code you know is broken is not a check. Break the behavior on purpose (revert the fix, stub the handler, change the expected value) and confirm the row turns FAIL with a detail that names the wrong value, then restore it. For new work, record the FAIL row before the fix and the PASS row after it.
8. Write `<project>/.gifisi/verify/README.md` with these sections, each from what you observed, naming scripts by the path installed in this project (`.gifisi/scripts/verify-feature-map.mjs` for a project install): **Launch** (the exact command, the ready signal, teardown), **Doctor** (one read-only check that the instance is worth driving: process up, expected build, port owned by this run), **Drive** (real routes, commands, and stable handles such as ARIA names, never coordinates), **Evidence** (what to keep and where, for example `<project>/.gifisi/verify/evidence/<feature-id>/`), **Cleanup** (kill only what this run started, never by process name; keep the evidence), and **Gotchas** per feature.
9. Prove the whole thing once end to end, as the next agent would: launch, doctor, run the map, capture evidence for one feature, clean up. Then confirm the evidence still exists and no process or port from the run survives. Run cleanup after every failed attempt too. A map that was never executed is a draft.
10. Log the result with `node scripts/log-decision.mjs verify "feature map covers <feature ids>" "no scripted live proof existed" "verify-feature-map passed=P failed=F" "pass"` (arguments: phase, decision, why, evidence, result). If you proved it in a stand-in (a local stack for a remote one), list every setup step the stand-in did that the real target will not; those stay unverified.

## Output

- `.gifisi/feature-map.json` with one entry per user-visible feature, every check run at least once.
- `<project>/.gifisi/verify/README.md` with Launch, Doctor, Drive, Evidence, Cleanup, and Gotchas sections, every command and path real.
- The `verify-feature-map` summary line from the final run, and for new work the FAIL row from before the change and the PASS row after it.
- A `.gifisi/decisions.tsv` row for the run.
- The features you left out and why, and the unverified stand-in steps, if any.

Rules that hold for every check:

- Exercise the real user path, not internal setters or test-only endpoints.
- Mock only where a production boundary already isolates an external system.
- When a dry-run or test mode is the safe path, observe what it really skips (files, network, git refs) instead of trusting its name.
- If seed data lacks a precondition a journey needs, the check fails and the reason goes in Gotchas. Never weaken a check to make it pass.

## Source

Adapted from pstack `skills/create-verification-skill/SKILL.md`, `skills/create-verification-skill/references/feature-map-example/`, and `docs/guide/06-verify-and-ship.md` (Lauren Tan, cursor/plugins, MIT). The JSON Feature Map and `scripts/verify-feature-map.mjs` are gifisi-harness additions.
