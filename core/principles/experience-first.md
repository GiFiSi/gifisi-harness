---
name: experience-first
title: Experience First
group: Core
applies_when: Product, UX, or scope tradeoffs. Choose what the user feels over implementation convenience.
---

# Experience First

## Rule

When implementation convenience conflicts with the user's experience, choose the experience. Ship fewer features, finished well, over more features left rough.

## When it applies

- A product, UX, or scope tradeoff: which features to build, cut, or polish.
- An easier implementation would leave a visible rough edge: a flash of empty content, a vague error, a lost input.
- You are designing an API, CLI, or library surface. Its user is the engineer who calls it.

The user is whoever consumes the work. For a UI, that is the end user. For a library or internal API, it is the colleague who imports it. The engineer who maintains the code next is a user too.

## How to apply

1. Name the user of this change and the central workflow they came to do.
2. Justify every feature, control, and option against that workflow. Cut what does not serve it.
3. Get the details right: loading and empty states, error messages that say what to do next, focus and keyboard flow, spacing, feedback after an action.
4. Prototype a design decision before building it in production code. Throwaway HTML is cheaper than a rewrite. See `core/playbooks/prototype.md`.
5. Explain the impact of the change from the user's side, not from the code's side.

Worked example. A form save fails on a network error. The convenient fix shows `Error: 500` and clears the form. The experience-first fix keeps the typed values, shows "Could not save. Your changes are kept. Try again.", and focuses the retry button. It costs about 15 more lines and the user loses nothing.

Foundations still matter. `core/principles/foundational-thinking.md` governs the order of work. This principle governs the target.

## Smells

- Settings or options added so the team does not have to decide.
- Error states that show raw codes or stack traces to the user.
- A feature list that grows while the core workflow still has rough edges.
- A public function whose signature mirrors the internal implementation instead of the caller's need.
- A summary of a change that only describes code, never what the user sees.

## Check

Answer yes or no: for this change, can you name its user, show the state they see in each path (success, empty, loading, error), and justify every added option against their central workflow? Yes means the principle held.

## Source

- `skills/principle-experience-first/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
- `PRODUCT.md` guidance in `docs/06-project-defaults.md` of Vibe Coding Toolkit (soumatheusgomes/vibe-coding-toolkit, Matheus Gomes), MIT.
