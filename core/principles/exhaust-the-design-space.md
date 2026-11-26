---
name: exhaust-the-design-space
title: Exhaust the Design Space
group: Core
applies_when: A novel interaction or architecture with no precedent. Build 2-3 competing prototypes, then compare.
---

# Exhaust the Design Space

## Rule

When a decision has no precedent in the codebase, do not commit to the first idea. Build two or three competing prototypes, compare them side by side against the same criteria, then choose one and discard the rest.

## When it applies

- A novel UI interaction: a new editor gesture, a new navigation pattern, a dense data view.
- An architecture decision with no existing example in the codebase: a new sync model, a plugin system, a caching layer.
- A product decision where the result depends on feel, not logic: animation timing, information density, wording of a key flow.

It does not apply when the codebase already has a pattern for the problem. Follow the pattern.

## How to apply

1. Write the decision the prototypes exist to make, in one sentence. No decision means no prototypes.
2. Write the comparison criteria before building: what the user must be able to do, how fast, with what feel or cost.
3. Build two or three variants that differ in approach, not in detail. Keep them throwaway, in a scratch directory, with the lightest stack that shows the idea.
4. For a visual decision, put the variants behind one switcher (buttons or a key) so they can be compared in place. For a behavioral decision, run the same script against each variant.
5. Observe each variant on the real surface: screenshots, timings, output. Score each against the criteria.
6. Choose one, record why in `.poteto/decisions.tsv`, and delete the others. Build the chosen direction properly through `core/playbooks/feature.md`.

If your harness can spawn subagents, `core/skills/arena/SKILL.md` runs the variants in parallel and compares them. Otherwise build them one after another inline.

Worked example. A board needs a way to reorder cards on touch screens. Variant A is drag with a long press. Variant B is up and down buttons on a selected card. Variant C is a "move to" menu. Criteria: reorder five cards in under 10 seconds, no accidental moves while scrolling. Timed runs show A at 6 seconds with two accidental moves, B at 14 seconds, C at 9 seconds with none. C wins. A and B are deleted.

## Smells

- One design built and defended without any alternative tried.
- Alternatives compared only in prose, never built or observed.
- Variants that differ only in color or naming, not in approach.
- Prototype code kept and shipped as production code.
- Criteria written after the results, shaped to fit the favorite.

## Check

Answer yes or no: for this novel decision, were at least two variants built and observed against criteria written before building, and is the choice with its evidence recorded? If the decision had a precedent, answer whether you followed it instead.

## Source

- `skills/principle-exhaust-the-design-space/SKILL.md`, `skills/poteto-mode/playbooks/prototype.md`, and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
