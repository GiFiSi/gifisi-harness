---
name: build-the-lever
title: Build the Lever
group: Core
applies_when: Any non-trivial work. Build the script, codemod, or check that does or proves it, so a reviewer can rerun it.
---

# Build the Lever

## Rule

When work is not trivial, build the tool that does it or proves it: a codemod, a script, a generator, or a rerunnable check. Do not do it by hand. The bar is triviality, not repetition. The tool is the artifact a reviewer can rerun.

## When it applies

- Edits across many files: renames, API migrations, import rewrites.
- Analyses: counting usages, measuring sizes, comparing outputs.
- Verification: proving a behavior holds across inputs, or that a migration left nothing behind.
- Fan-out work given to several agents or people.

Skip the tool only for a couple of obvious edits a reviewer can check by reading the diff.

## How to apply

1. Do the first unit by hand so you know exactly what the change is.
2. Write the smallest script that repeats that change or proves it. Rerun it on the first unit and confirm it produces the same result.
3. Make it safe to rerun: a second run must change nothing. See `core/principles/make-operations-idempotent.md`.
4. Run it on the rest. Read a sample of the output, and run the project checks.
5. Prefer one deterministic tool over fan-out. When you do fan out, write the recipe, the verification contract, and the limits as one skill the delegates read and cannot edit. See `core/skills/swarm/SKILL.md`.
6. Commit the tool when the work outlives the session. Build a small script, never a framework.

This repository follows the rule: `scripts/quality-gate.mjs` proves the line limit, and `scripts/verify-feature-map.mjs` proves features on the live surface. Both rerun the same way every time.

Worked example. A task renames `getUser` to `fetchUser` in 60 files. Hand edits miss call sites in strings and re-exports. The lever is a short Node script that rewrites the identifier, then a check that searches for the old name and exits 1 if it finds any:

```sh
node <project>/scripts/rename-get-user.mjs
git grep -n "getUser" -- src && exit 1 || echo "no stale references"
```

The reviewer reruns both and sees the same result.

## Smells

- A large diff with no script, codemod, or check in it that explains how it was made.
- A claim like "I checked every file" with no command that repeats the check.
- Several agents given the same manual instructions in prose instead of a shared recipe.
- A script that breaks or duplicates work when run twice.
- A generic tool framework built for a one-time job.

## Check

Answer yes or no: does this change include, or point to, the script or check that produced or proves it, and does rerunning it produce the same result with no further changes? If the work was not trivial and the answer is no, the principle was skipped.

## Source

- `skills/principle-build-the-lever/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
- `scripts/` and `templates/eslint/verify.mjs` in Vibe Coding Toolkit (soumatheusgomes/vibe-coding-toolkit, Matheus Gomes), MIT.
