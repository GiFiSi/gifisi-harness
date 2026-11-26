---
name: subtract-before-you-add
title: Subtract Before You Add
group: Core
applies_when: Sequencing an addition, refactor, or rewrite. Remove dead weight first, then build on the simpler base.
---

# Subtract Before You Add

## Rule

Remove complexity first, then build. Default to subtraction. Leave the design a little simpler and more capable than you found it, behind the same or a smaller surface.

## When it applies

- You are about to add a feature, an adapter, or a module next to existing ones.
- You are planning a refactor or rewrite and choosing the order of steps.
- The area holds dead code, unused options, redundant validators, or references that point at nothing.
- A prompt, skill, or doc has grown long with repeated instructions.

## How to apply

1. Inventory what the area holds today. Mark what is dead (no callers), redundant (checked twice), or speculative (handles cases nobody hits).
2. Delete those first, in their own commit, and run the checks. The base is now smaller and the checks prove nothing broke.
3. Cut before you polish. Reach the minimum version that works before investing in quality.
4. Design for observed usage. Add a validator, parser, or guard only when the spec or real data demands it.
5. Then build the addition on the simpler base.
6. When a reference or doc has no content of its own, delete it instead of leaving a stub.

Worked example. A task asks for a fourth storage adapter. The codebase has three, but a search shows one has no callers and another is used only by a test of itself. Delete both and their tests first. Run the suite: green. Now the shared interface has one real implementation, so the fourth adapter reveals what the interface actually needs. The final diff is net negative in lines and the new adapter is simpler.

## Smells

- A plan whose first step is "add" and whose deletions, if any, come last or never.
- Code paths kept "just in case" with no caller and no test that exercises real behavior.
- Validators that re-check data an earlier layer already validated.
- Stub files or sections that only point elsewhere.
- Prompts or docs that repeat the same instruction in several places.

## Check

Answer yes or no: does the change history show the deletions landing before, or in the same unit as, the addition, and is every remaining piece of the touched area used by a real caller? Yes to both means the principle held.

Related: `core/principles/laziness-protocol.md`, `core/principles/migrate-callers-then-delete-legacy-apis.md`.

## Source

- `skills/principle-subtract-before-you-add/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
