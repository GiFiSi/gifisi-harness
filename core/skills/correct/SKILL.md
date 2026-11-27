---
name: correct
description: Make a repeated agent mistake impossible in this repo. Fix each mistake class at the highest tier that works (1 Architecture, 2 Lint/Test proven to fail on the real past mistake, 3 Text last) and keep the rule table in .gifisi/corrections.md. Load whenever the user corrects you or a mistake class happens twice.
origin: pstack
---

# Correct

The user keeps correcting agents in this repo for the same mistakes. Change the repo so the next agent cannot make them.

Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Shape the repo so a change that looks right from one file is right for the whole repo.

## When to use

- The user corrects you. Every correction runs this skill, even a one-line one.
- A mistake class has happened twice: in commits, reverts, review comments, or `.gifisi/decisions.tsv` supersede rows.
- The correction and quality-gates routes.
- `core/skills/reflect/SKILL.md` hands you a lesson from a session.
- A rule already in `.gifisi/corrections.md` was broken again. That is a repeat and must move up a tier.

## The correction ladder

Fix each class at the highest tier that works. A lower tier is allowed only after you state why every higher tier failed.

1. Architecture. Make the mistake impossible. Give each piece of state one owner and each task one supported way. Hide internals so the wrong import fails to resolve. Replace hand-synced lists with one source of truth. Use types so the bad state cannot be written. Delete the old way and the dead code an agent would copy.
2. Lint or test. If bad code still compiles, add a lint rule, CI check, script, or test whose failure message names the fix: the file, type, or function to use instead. Prove it fails on the real past mistake. If the pattern is already common, fail only when a change adds more. Fix or delete any test that passes when its behavior breaks, or fails when only internals change.
3. Text. Only for judgment calls nothing can check. Add the rule to `.gifisi/corrections.md` with `text only` in the Enforced by column. Nothing fails when an agent skips text, so this tier is last.

Human review is not a tier. A reviewer who must catch the same mistake on every PR is the problem this skill removes.

## Procedure

1. Fix the mistake the user just named in the code first, so the current task is right.
2. Find the mistake classes. Read recent commits, reverts, review comments, `.gifisi/decisions.tsv` rows that supersede earlier rows, `.gifisi/corrections.md`, agent instruction files (`AGENTS.md`, `CLAUDE.md`), and comments that explain workarounds. Group mistakes into classes. A class counts once it has happened twice. A direct user correction counts on its own.
3. Check the rule table. If `.gifisi/corrections.md` already has a rule for the class and its Enforced by cell says `text only`, or the enforcing check did not fire, this is a repeat. The fix must land at a higher tier in this same change.
4. Pick the tier. Start at tier 1 and walk down. For each tier you skip, write one sentence on why it does not work for this class.
5. Implement the fix for the most frequent class first, one commit or one reviewable unit per class.
6. Prove a tier 2 check fails on the real past mistake. Reapply the old bad change in a scratch branch, a worktree, or a copied fixture. Run the check. Capture the failing output, including the message that names the fix. Restore the clean state and run the check again to show it passes. A check you never saw fail proves nothing.
7. Run the same command locally that CI runs. Wire the check into the project's lint or test command so it runs without anyone remembering it. Read `.gifisi/project.json` for the commands.
8. Allow exceptions only on the offending line, with a reason, an expiry date, and the approving human's name.
9. Update the rule table in `.gifisi/corrections.md` (format below). Add the rule, or update its row when it moved up a tier. Delete the row once the mistake can no longer happen because tier 1 removed it, and log the deletion.
10. Log each class: `node scripts/log-decision.mjs correction "<class> fixed at tier N" "<why higher tiers failed>" "<check command or commit>" "<failing-before and passing-after result>"`.

## Rule table format

`.gifisi/corrections.md` holds one markdown table. The installer creates it from `core/templates/gifisi/corrections.md.template`. Keep this exact header:

```markdown
| Rule | Enforced by | Tier | Evidence |
|---|---|---|---|
| Parse cart item prices to numbers at the request boundary | test/cart-total.test.mjs | 2 Lint/Test | fails on reverted commit with "expected 15, got '0105'" |
| Read state only through src/store/index.ts | private module exports; deep imports fail to resolve | 1 Architecture | build error on old import path in fixture |
| Prefer the smallest diff when two designs both pass | text only | 3 Text | user correction 2026-11-20 |
```

- Rule. One imperative line, written through `core/skills/unslop/SKILL.md`.
- Enforced by. The file, check, type, or command that fails when the rule is broken, or `text only`.
- Tier. `1 Architecture`, `2 Lint/Test`, or `3 Text`.
- Evidence. Where the proof lives: the failing output, a commit, a decision row, or the date of the correction.

## Output

For each class:

- The class and its evidence: the commits, comments, or rows where it happened.
- The tier you picked and the enforcing artifact.
- Why each higher tier did not work.
- The failing-before output on the real past mistake and the passing-after run.
- The row added or changed in `.gifisi/corrections.md`.

## Source

Adapted from pstack `skills/correct/SKILL.md` and `docs/guide/09-make-it-yours.md` (Lauren Tan, cursor/plugins, MIT). Check wiring follows Vibe Coding Toolkit `docs/prompts/08-eslint-quality-gates-install.md` and `docs/prompts/15-harness-improvement.md` (Matheus Gomes, MIT).
