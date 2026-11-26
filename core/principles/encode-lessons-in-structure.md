---
name: encode-lessons-in-structure
title: Encode Lessons in Structure
group: Meta
applies_when: Writing the same instruction twice. Encode it as a lint, test, type, or script instead of more text.
---

# Encode Lessons in Structure

## Rule

When you write the same instruction a second time, or receive the same correction twice, stop adding text. Encode the lesson where breaking it fails: the architecture, a type, a lint, a test, or a script. Text is the last resort, kept for judgment calls that no check can make. If a structural fix exists, use only the structural fix; the instruction was the symptom.

## When it applies

- The human corrects the same mistake for the second time.
- An agent rule, README note, or review comment repeats an earlier one.
- A class of bug comes back after a fix.
- A playbook step says "remember to" or "be careful to".

## How to apply

Climb the correction ladder from the top. Stop at the first tier that makes the mistake impossible or loud.

1. **Tier 1, Architecture.** Remove the possibility. Give each piece of state one owner and each task one supported way. Hide internals so the wrong import fails. Replace hand-synced lists with one source of truth. Delete the old way an agent would copy. Types that make the bad state unrepresentable belong here.
2. **Tier 2, Lint and test.** If the bad code still compiles, add a lint rule or CI check whose error message names the file, type, or function to use instead. If the pattern is already common, fail only when a change adds more. Add a behavior test that fails on the real past mistake.
3. **Tier 3, Text.** Only for lessons that need judgment. Make the rule prominent, keep it short, and add an example of the failure. Nothing fails when an agent skips text, so it is the weakest tier.

Prove each tier 1 or tier 2 fix by showing the new check fails on the real past mistake. Record the class, the tier chosen, and why a higher tier did not work in `.poteto/corrections.md`, and log the decision with `node scripts/log-decision.mjs`. For a full repository pass, load `core/skills/correct/SKILL.md`, which finds the recurring mistake classes and applies this ladder to each.

Worked example. Agents twice added files over 350 lines after being told not to.

```text
correction 1: "keep files under 350 lines"           -> text in AGENTS.md (tier 3)
correction 2: same mistake again                      -> repeat: climb the ladder
tier 1? file size is not an architecture property     -> no
tier 2: lint rule max-lines 350, error names the fix  -> "split by responsibility; see core/skills/quality-gates/SKILL.md"
proof:  rule run on the old 512-line commit           -> 1 error, exit 1
```

The AGENTS.md line is removed. The lint is the rule now.

## Smells

- The same sentence in two instruction files.
- "IMPORTANT", "ALWAYS", or "NEVER" in capitals added after a repeat mistake.
- A rule table entry with nothing that enforces it.
- A post-mortem whose only action item is "be more careful".
- A lint exception with no reason, no expiry, and no owner.

## Check

Answer yes or no: for each lesson this change records, is it enforced by architecture, a type, a lint, a test, or a script that was shown to fail on the real past mistake, with text used only where judgment is required? Yes means the principle held.

Related: `core/skills/correct/SKILL.md`, `core/skills/reflect/SKILL.md`, `core/skills/quality-gates/SKILL.md`, `core/principles/build-the-lever.md`.

## Source

- `skills/principle-encode-lessons-in-structure/SKILL.md`, `skills/correct/SKILL.md`, and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
- ESLint quality gates (`MAX_LINES=350`) in `docs/` and `templates/eslint/` of Vibe Coding Toolkit (soumatheusgomes/vibe-coding-toolkit, Matheus Gomes), MIT.
