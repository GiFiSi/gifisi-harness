---
name: refactoring
title: Refactoring
summary: Change structure without changing behavior, pinned by a characterization check, split by responsibility under the 350-line gate, and proven equivalent on the real artifact.
skills: [architect, blast-radius, no-comments, quality-gates, correct, reflect, tdd]
principles: [laziness-protocol, subtract-before-you-add, minimize-reader-load, model-the-domain, migrate-callers-then-delete-legacy-apis, prove-it-works, sequence-verifiable-units, encode-lessons-in-structure]
---

# Refactoring

You own the contract. The structure changes. The behavior does not. Feature adds behavior and Bug fix corrects it; this playbook does neither. If the cleanup uncovers a real bug or a missing capability, write it down, finish the structural change against the pinned contract first, then route the bug to `core/playbooks/bug-fix.md` and the capability to `core/playbooks/feature.md`.

This playbook also serves two neighbouring routes. Quality gates (lint warnings, `max-lines`, files over 350 lines) use it with `core/skills/quality-gates/SKILL.md`. Corrections ("you keep doing X") use it with `core/skills/correct/SKILL.md` and `core/skills/reflect/SKILL.md`, because the fix for a repeated mistake is a structural change. Large or cross-cutting reshapes that need several PRs belong to `core/playbooks/multi-phase-plan.md`.

## When to use

- Code is hard to read, duplicated, tangled, or badly named, and the behavior is correct.
- A file exceeds the 350-line gate, or `node scripts/quality-gate.mjs` or the project's ESLint `max-lines` rule reports a violation.
- A lint warning class needs a burndown (paste-ready form in `core/prompts/09-lint-warning-burndown.md`).
- The user corrected the same mistake class twice and it needs a lint, test, type, or structure that prevents it.
- Not for wrong behavior (`core/playbooks/bug-fix.md`), new behavior (`core/playbooks/feature.md`), or a migration across many modules (`core/playbooks/multi-phase-plan.md`).

## Done Predicate

The characterization output captured before the first structural edit is identical after the last one, and the quality gate reports zero violations for the touched files.

Template for the signal header:

```
Done Predicate: <characterization command> prints output identical to the pre-refactor capture; node scripts/quality-gate.mjs reports no file over 350 lines among <touched files>; <project test command> passes with the same count as before.
```

For a correction route, the artifact is the new guard: the lint rule, test, or type that fails on the old mistake and passes on the corrected code, plus a row in `.gifisi/corrections.md`. "It compiles" and "lint is clean" are not a pin. They do not show that callers see the same results.

## Steps

1. Run the ground truth now: project lint and tests from `.gifisi/project.json` and `node scripts/quality-gate.mjs`; record file sizes, test count, and violations, and log phase `baseline`.
2. Pin the behavior contract with a characterization test, snapshot, or script that records every public export's output for representative inputs, save the capture, and log phase `pin`.
3. Name the target shape: the responsibility of each module, its public exports, and the seam you will cut on; use `core/skills/architect/SKILL.md` when the shape crosses a function boundary.
4. Subtract first: delete dead code, one-caller wrappers, duplicated branches, and orphan references, rerun the pin, and commit the subtraction on its own.
5. Split by responsibility, never by line count, keeping every original export name and signature; stop and report "no natural seam" for a cohesive file instead of inventing a module.
6. Move in small behavior-preserving steps, one file per commit, rerunning the pin, typecheck, tests, and lint after each, and log phase `refactor`; migrate every caller and delete the old API in the same wave.
7. Prove equivalence: rerun the characterization capture, diff it against the saved one, require zero difference, and log phase `verify` with the diff command and result.
8. Run `node scripts/quality-gate.mjs` and the project lint and tests; confirm no file exceeds 350 lines and no new violation appeared anywhere, and check callers with `core/skills/blast-radius/SKILL.md`.
9. When a mistake class repeated, climb the correction ladder in `core/skills/correct/SKILL.md`: structure first, then a lint or test, then a row in `.gifisi/corrections.md`, and log phase `correction`.
10. Check the diff lowers reader load somewhere, revert any change that does not, then run `core/playbooks/opening-a-pr.md` with subtraction, reshape, and cleanup as separate commits.

## Step notes

Script paths are relative to the harness home: `.gifisi/` in an installed project, the repository root here. Log a row with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`. Evidence is a pointer (path, command, commit), never a paragraph.

**Step 1.** Use the commands recorded in `.gifisi/project.json`; do not guess them. If a wrapper truncates lint output, run the linter directly until you have the full per-file list. Sort oversized files largest first. Numbers come from this run, never from memory or an earlier message. If the project has an ESLint config with a `max-lines` rule (`.gifisi/project.json` field `eslint.maxLinesRule`), its count is authoritative; `node scripts/quality-gate.mjs` applies the same counting (blank and comment lines skipped) for projects without one.

**Step 2.** Trace the affected subsystem first (`core/skills/how/SKILL.md` if it is unfamiliar). The pin covers what callers observe: return values, thrown errors, HTTP responses, CLI output, written files. For a module of pure functions, a script that imports every export, calls it with a fixed input set, and prints JSON lines is enough; save that output to a file outside the edit set. If the area has no tests, the pin is a prerequisite, not a follow-up. Follow `core/skills/tdd/SKILL.md` for test shape and assert behavior, not internals.

**Step 3.** State what the layout would be if the code were written today with what you now know (`core/principles/redesign-from-first-principles.md`). Look for the structure the code is missing (`core/principles/model-the-domain.md`): many near-identical functions often collapse into one function driven by a table. The reshape must delete branches or invalid states. Adding indirection with no deletion is not a refactor worth shipping.

**Step 4.** The smallest change that reaches the target ships (`core/principles/laziness-protocol.md`, `core/principles/subtract-before-you-add.md`). A speculative cleanup that "might help" gets reverted.

**Step 5.** The four seams worth cutting on, in this order:

- business logic inside a UI or route file becomes a domain service or use-case module;
- a repeated block of UI becomes a sub-component;
- data access (queries, ORM calls, raw SQL) becomes a repository or adapter;
- a cluster of helpers serving one concept becomes a module named for that concept.

A file named `helpers`, `utils`, `misc`, or `common` holding whatever was left over is a failure, not a result. Prefer leaving the original file as a thin module that re-exports from the new ones over editing every importer. Rewrite import sites only when the original file is meant to disappear, and say so before you do it. For a backlog of oversized files, work in batches of three, largest first, and stop after each batch with a report; `core/prompts/06-file-size-refactor.md` is the paste-ready version.

**Step 6.** One file per commit gives one recovery point per extraction (`core/principles/sequence-verifiable-units.md`). Watch two traps: an extracted function can push its new home over 350 lines, and an extraction can change an inferred return type, which surfaces as a type error rather than a lint error. Both belong in the same commit. Spot-check every rename against the actual files; renames miss usages in strings, docs, and config. No compatibility shims and no parallel old and new paths (`core/principles/migrate-callers-then-delete-legacy-apis.md`). If your harness can spawn subagents, delegate mechanical edits with an exact scope (files, names to move, the pin as success criterion) and review the diff yourself; otherwise do them inline and review as a separate pass. Remove comments that narrate the move (`core/skills/no-comments/SKILL.md`).

**Step 7.** The diff is the proof (`core/principles/prove-it-works.md`): `diff before.txt after.txt` or a script that exits non-zero on any difference. For a surface with live behavior, also run `node scripts/verify-feature-map.mjs` and compare pass counts with the baseline. A non-empty diff means behavior changed: find the cause and fix the refactor, never the capture.

**Step 8.** "No new violation anywhere" matters: extraction often trades one warning for another. Blast radius covers importers, dynamic lookups, and re-exports that the type checker cannot see.

**Step 9.** The ladder from `core/skills/correct/SKILL.md`, strongest first: change the architecture so the mistake cannot be expressed; else add a lint rule or test that fails on it; else write the rule as text in `.gifisi/corrections.md`. Text is the last resort (`core/principles/encode-lessons-in-structure.md`). Use `core/skills/reflect/SKILL.md` to name the mistake class from the session's evidence before choosing a rung.

**Step 10.** Success is reduced reader load (`core/principles/minimize-reader-load.md`): fewer layers, less hidden state, shorter call paths, smaller files with one job. Record the delta you measured (lines, functions, branches, files over the gate). Commit order: subtraction, reshape, follow-on cleanup. Each commit ends in a check you ran.

## Reply

- The structure that changed and the seam each split used.
- The pin: command, capture path, and the equivalence diff result.
- Before and after numbers from real runs: largest file lines, quality-gate violations, test count.
- Files deliberately left alone ("no natural seam") and why.
- Any correction rung added and where it lives.
- What shipped and what got reverted. No new behavior.

## Source

- `skills/poteto-mode/playbooks/refactoring.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `skills/correct/SKILL.md` from pstack (correction ladder), MIT.
- `docs/prompts/09-file-size-refactor.md` and `docs/tools/06-eslint-biome-quality-gates.md` from Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
