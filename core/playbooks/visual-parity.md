---
name: visual-parity
title: Visual parity
summary: Migrate or restyle UI with pixel-exact equivalence, proven by an image-diff check against an untouched baseline wired into the Feature Map.
skills: [create-verification-skill, maintain-verification-skill, benchmark-checklist, blast-radius]
principles: [prove-it-works, separate-before-serializing-shared-state, sequence-verifiable-units, build-the-lever, test-behavior-not-implementation]
---

# Visual parity

You own pixel-exact equivalence. The baseline is the spec, and you do not touch it. Equivalence is verified by image diff, not by eye.

The harness does not diff pixels itself. `scripts/verify-feature-map.mjs` runs HTTP and CLI checks. The project supplies the screenshot and diff script, authored with `core/skills/create-verification-skill/SKILL.md`, and the Feature Map runs it as a `cli` check that must exit 0.

## When to use

- Migrating components to a new framework, design system, or CSS approach where the result must look the same.
- Matching an implementation to a design mock or a reference implementation.
- Fixing a visual regression report with a known-good reference.
- Not for a deliberate redesign (`core/playbooks/feature.md`) or for a behavior bug that happens to be visible (`core/playbooks/bug-fix.md`).

## Done Predicate

The project's image-diff check, run through `node scripts/verify-feature-map.mjs`, reports zero differing pixels for every migrated component state against a baseline captured before migration and left unmodified.

Template for the signal header:

```
Done Predicate: <project>/scripts/visual-diff.mjs <component> exits 0 with 0 differing pixels across <states> against baseline <dir> captured at <commit>; the baseline files are unchanged (git diff --stat <baseline dir> is empty).
```

A nonzero diff is a failure. A diff threshold above zero is allowed only when the user set it, and the reply states it.

## Steps

1. Build the baseline harness before any migration: a project script that renders each component in each state, screenshots it at fixed size, and diffs against stored images; capture the baseline and commit it.
2. Register one `cli` check per component in `.poteto/feature-map.json` that runs the diff script and expects exit code 0, run `node scripts/verify-feature-map.mjs`, and confirm all pass on the unmigrated code.
3. State the anti-shortcut rules and hold them: no harness edits, no baseline edits, no restructuring a component to make a diff pass; if the baseline looks wrong, stop and ask.
4. Migrate shared primitives first as a blocking phase, rerun every check, and land them before any component that uses them.
5. Migrate one component at a time, one owner per component; if your harness can spawn subagents, give each its own worktree and component, otherwise work through them in sequence.
6. Run the component's diff check after each change; on a nonzero diff, inspect the diff image, find the cause in the new code, and rerun until zero, logging phase `verify` with the result.
7. Confirm the baseline is untouched with `git diff --stat <baseline dir>`, run project lint and tests from `.poteto/project.json` and `node scripts/quality-gate.mjs`, and check callers with `core/skills/blast-radius/SKILL.md`.
8. Ship per component or per safe batch through `core/playbooks/opening-a-pr.md`, with the diff results in the Verification section.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the repository root here. Log a row with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`.

**Step 1.** No baseline, no parity claim; the harness is a blocking prerequisite (`core/principles/build-the-lever.md`). Pin everything that makes screenshots nondeterministic: viewport, device scale factor, fonts loaded, animations disabled, a fixed clock, fixed data, and the same browser build. Prove determinism before trusting the harness: capture twice on the same commit and require a zero diff between the two runs (`core/skills/benchmark-checklist/SKILL.md` covers noise checks). The script lives in the project, for example `<project>/scripts/visual-diff.mjs`, and may use whatever browser automation and image library the project already has; adding one is a dependency decision to state and log. When matching a mock or a second implementation instead of the current code, the reference images are the baseline.

**Step 2.** A check entry shaped like `{ "id": "button-parity", "surface": "cli", "checks": [{ "name": "all states match", "run": ["node", "scripts/visual-diff.mjs", "button"], "expect": { "exitCode": 0 } }] }`. `core/skills/create-verification-skill/SKILL.md` describes authoring the check, and `core/skills/maintain-verification-skill/SKILL.md` describes keeping it current as components change. All checks pass before migration; a check that fails on unmigrated code means the harness is not deterministic yet.

**Step 3.** These rules exist because the cheapest way to turn a diff green is to change what it compares against. Editing the baseline, loosening the threshold, or reshaping the component's DOM to dodge the comparison all fake the result. A change to the baseline needs the user's explicit approval, logged as a `baseline` row whose evidence names the approval.

**Step 4.** Shared primitives (tokens, typography, buttons, layout grids) change every component that uses them. Migrating them first means later component diffs isolate the component's own changes.

**Step 5.** One owner per component removes write conflicts instead of managing them (`core/principles/separate-before-serializing-shared-state.md`). A worktree per owner: `git worktree add ../<repo>-<component> -b parity/<component>`. Clean them up afterwards with `core/playbooks/worktree-cleanup.md`.

**Step 6.** A pixel delta has a cause: a different default margin, a font fallback, subpixel rounding, a missing state style. Find it in the new code. The diff asserts what users see, not how the component is built (`core/principles/test-behavior-not-implementation.md`). Repeat per component until the diff is zero (`core/principles/prove-it-works.md`).

**Step 7.** An empty `git diff --stat` on the baseline directory is part of the predicate. Run the full suite of parity checks, not only the touched component's, because shared styles leak.

**Step 8.** Small batches keep each PR reviewable and each diff result attributable (`core/principles/sequence-verifiable-units.md`).

## Reply

- Components migrated and the diff result for each state.
- Baseline location, the commit it was captured at, and proof it is unchanged.
- The determinism check result for the harness.
- Any threshold the user approved, and what remains to migrate.

## Source

- `skills/poteto-mode/playbooks/visual-parity.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `skills/create-verification-skill/SKILL.md` from pstack (Feature Map verification), MIT.
- Verification agreements from `README.pt-BR.md` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
