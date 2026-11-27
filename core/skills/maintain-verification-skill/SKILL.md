---
name: maintain-verification-skill
description: Periodic upkeep pass that keeps .gifisi/feature-map.json and the project verify notes true to the app. Read every feature from source, drive every feature live with scripts/verify-feature-map.mjs, fix drift in the map, report product regressions, and ship at most one change of proven corrections. Load for auditing or refreshing the feature map.
origin: pstack
---

# Maintain a verification skill

A feature map goes stale the moment the app changes. A stale map is worse than none: its checks keep passing on behavior nobody uses, or keep failing on behavior that changed on purpose. This skill is the upkeep loop for the Feature Map that `core/skills/create-verification-skill/SKILL.md` produces: `.gifisi/feature-map.json` plus `<project>/.gifisi/verify/README.md`.

The unit of rigor is the feature, not the sentence. Cover every feature from source and drive every feature live. Do not hand-check every bullet of the notes.

## When to use

- On a schedule, for example once a day or before a release, so drift is caught while it is small.
- After merges, refactors, or route and command renames that did not update the map.
- When `node scripts/verify-feature-map.mjs` fails and you do not yet know whether the map or the app is wrong.
- Not when the project has no map yet. Stop and use `core/skills/create-verification-skill/SKILL.md` instead of inventing a target.

## Procedure

1. Pick the outcome vocabulary before you start, and report exactly one at the end: **clean** (every feature got source and live coverage and nothing needs to change; no branch, no PR), **changed** (one change ships proven corrections to the map, notes, or launcher), or **blocked** (coverage could not finish or a proven fix could not ship safely; name the blocker).
2. Fix the scope. Edit only `.gifisi/feature-map.json`, `<project>/.gifisi/verify/`, and launcher scripts the map owns, such as `<project>/scripts/verify-launch.mjs`. Never edit product code in this pass. A behavior the map describes that the app no longer has is either drift (fix the map) or a regression (report it; do not paper over it in the map).
3. Index hygiene. Parse the map. Every feature has a unique `id`, a user-terms `description`, a `surface` of `http` or `cli`, and at least one check. Every per-feature section in the notes matches a map entry and the reverse. Fix missing, extra, duplicate, or dead entries.
4. Source wave. For each feature, read how it works in the current source: the route or command handler, its inputs, its observable outputs, and the commit history since the map last changed (`git log --oneline -- <handler paths>`). Note likely drift with a `file:line` citation and one live recipe. If your harness can spawn subagents, give each feature to a read-only subagent in parallel and have it return: summary, source entry points, likely drift or none, one recipe. Subagents never drive the app and never edit files. Otherwise do the wave inline, one feature at a time.
5. Reconcile. Confirm every feature has a returned summary. Merge overlapping recipes. Spot-check each cited drift; do not re-prove clean claims. Sweep recent changes for user-visible surfaces the map does not list, and call one missing only with a concrete source path.
6. Live pass, required even when the source looks clean. Run `node scripts/verify-feature-map.mjs --json` and keep the output as evidence. Drive by hand only what the map cannot express, following the notes' Launch section. Hold three invariants the whole pass: run the Doctor check before the first drive and again after any failed drive; evidence captured so far survives every cleanup and is checked at its named location; nothing a drive started outlives the drive (kill by PID, never by name).
7. Triage each failing or suspect row. A wrong or missing user-terms description is drift: fix the map or notes. Working behavior the checks cannot reach is a harness gap: fix the launcher or add a check. App behavior that is really broken is a product regression: record it with the failing row and keep it out of this change. A feature that cannot be reached is `verified-unreachable` only with the concrete prerequisite (auth, entitlement, OS, external service) and the route attempted; a prerequisite the map omits is drift.
8. Re-prove every correction live. Each changed or new check must be seen failing on the wrong behavior and passing on the right one, on the real surface. A Doctor failure caused by drift gets fixed under the scope in step 2 and retried once before the pass is called blocked. Final teardown runs after the last re-proof.
9. Ship or stop. For **changed**, re-read every changed file, then ship one change of corrections only and log it with `node scripts/log-decision.mjs verify "feature map maintained" "<drift found>" "verify-feature-map passed=P failed=F" "changed"`. For **clean** or **blocked**, ship nothing and log the outcome the same way.

## Output

- The outcome: clean, changed, or blocked, with the blocker named when blocked.
- Coverage: every feature id with its source summary status and its live result.
- Each drift fixed, with the source citation and the before and after check result.
- Each product regression, with the failing row and the commit that likely introduced it. These are reported, not fixed.
- Each `verified-unreachable` feature with its prerequisite and the route attempted.
- The final `verify-feature-map` summary line and the `.gifisi/decisions.tsv` row.

Keep working notes in the OS temp directory or the session scratch area. Do not commit them.

## Source

Adapted from pstack `skills/maintain-verification-skill/SKILL.md` and `docs/guide/06-verify-and-ship.md` (Lauren Tan, cursor/plugins, MIT). The JSON Feature Map and `scripts/verify-feature-map.mjs` are gifisi-harness additions.
