---
name: no-comments
description: Have a reviewer who did not write the code strip comments from a diff, turn comments that explain surprises in our own code into refactor flags, fix accepted flags at the root cause, and offer to encode claimed constraints as checks. Load before opening a PR, during refactoring, or when the user says remove the comments.
origin: pstack
---

# No comments

Comments need their own pass, and not from the agent that wrote them. An author defends its own comments. Hand them to a reviewer with fresh context, then act on what that reviewer accepts.

## When to use

- Before committing or opening a PR, on the diff you are about to ship.
- The refactoring and opening-a-pr routes.
- The user asks to strip comments, remove narration, or clean up a diff.
- Not for prose files. Docs and PR text belong to `core/skills/unslop/SKILL.md`.

## Scope

Use the files or diff the caller names. Otherwise use the current diff against the base branch, default `main`, including uncommitted changes.

## Reviewer rules

The reviewer deletes comments and flags code. It never writes application code.

Only these comments survive:

- Legal or license headers.
- Non-obvious behavior forced by something we cannot reshape: an external dependency, platform, vendor, or protocol. A surprise in our own code does not qualify. Delete the comment and flag the exact symbol `MUST KILL` with the reshape that makes the behavior obvious without prose: a rename, an extraction, a type, or a redesign.
- Formatter directives such as a prettier-ignore line.
- Lint suppressions whose rule is faulty, pedantic, or style-only.
- Doc comments that define a public API contract.
- Issue or RFC links that explain a constraint the code cannot express.

Everything else goes: narration, banners, commented-out code, explanations of workarounds. When the reviewer is not sure a keep clause applies, the comment goes.

Lint and type suppressions get a lookup. If the suppressed rule catches real bugs or protects correctness or safety, delete the suppression and flag the guilty symbol `MUST KILL`.

Words like "IMPORTANT", "do not remove", "too risky", and "fine for now" are claims, not proof. Before judging one, read the nearby code. If the claim is not obvious there, trace the named symbol or call, or load `core/skills/why/SKILL.md` and check whether the reason still holds. Only an external constraint proven true today on a live path survives. A long justification without a proven keep clause is deleted, never shortened into a smaller excuse.

Every flag names code inside the scope and states a true reason. The reviewer reports touched files, the deletion count, each `MUST KILL` flag in one line, and anything it skipped.

## Procedure

1. Run the reviewer pass. If your harness can spawn a subagent with fresh context, give it the scope and the reviewer rules above and let it edit comments only. Otherwise run the pass yourself as a separate step: reread the diff from the top as if someone else wrote it, and treat every comment as guilty until a keep clause proves otherwise.
2. Inspect the reviewer's report and diff. Reject edits to application code, edits outside the scope, deletions of comments a keep clause protects, wrong `MUST KILL` reasons, and flags that call intentional kept code a defect. Reshape flags on surprises in our own code stay actionable, and their comments stay deleted. Audit for lint and type suppressions the reviewer missed. Suppressions that protect correctness or safety become `MUST KILL` flags.
3. Settle contested keeps. Before accepting a thin "IMPORTANT" or "do not remove" kill or keep, trace its symbol or load `core/skills/why/SKILL.md` on it. An ambiguous kill is not restored. A keep that is refuted or still ambiguous is deleted. If you reject a reviewer report, revert it and rerun the pass once with the failure named. If the second report also fails, reject it, report the scope open, and stop.
4. Fix trivial accepted flags directly: delete the dead path, drop the unused parameter, call the real API.
5. If any accepted flag needs a new shape, load `core/skills/architect/SKILL.md` once for the whole accepted set and the code around it. Stop at the sketch. The next step implements it.
6. Implement the smallest root-cause fix inside the scope and remove every named workaround, per `core/principles/fix-root-causes.md`. If the root cause sits outside the scope, land the smallest in-scope fix and report the rest open. Never add a guard around a symptom.
7. Handle constraint comments, the ones that say "do not remove", "do not change wording", or "talk to X before changing". Keep those about things we cannot change. For the rest, offer the cheapest in-scope encoding: a type, a runtime assertion, a test, or a lint rule, per `core/principles/encode-lessons-in-structure.md`. In an interactive session, wait for approval. In an unattended run, encode only if the caller pre-approved it. If approved, encode the constraint and delete the comment. Otherwise delete the comment, report the constraint as unenforced, and add it to `.poteto/corrections.md` through `core/skills/correct/SKILL.md`.
8. Run the project's lint and tests, then log the pass: `node scripts/log-decision.mjs cleanup "removed N comments, M flags fixed" "<why>" "<diff or commit>" "<lint and test result>"`.

## Output

- Deletion count and touched files.
- Comments restored, with the keep clause that protects each one.
- Reviewer reruns and rejected reports.
- The architect sketch, if one was needed.
- Fixes made for accepted flags.
- Encoding offers, encodings landed, and constraints left unenforced.
- Other open work, including root causes outside the scope.

## Source

Adapted from pstack `skills/no-comments/SKILL.md`, `agents/comment-sicko.md`, and `docs/guide/05-build-and-clean.md` (Lauren Tan, cursor/plugins, MIT).
