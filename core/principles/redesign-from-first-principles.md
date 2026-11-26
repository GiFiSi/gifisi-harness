---
name: redesign-from-first-principles
title: Redesign from First Principles
group: Core
applies_when: A new requirement lands in an existing design. Redesign as if it had been there from day one.
---

# Redesign from First Principles

## Rule

Do not bolt a new requirement onto the old design. Ask what you would build if the requirement had been known from the start, design that, and deliver it in increments.

## When it applies

- A requirement arrives that the current design did not anticipate: multi-tenancy, offline mode, a second payment provider, a new output format.
- The first idea for integrating it is a special case, a flag, or an `if (newThing)` branch in several places.
- A design doc, type, or example now describes a world that no longer exists.

## How to apply

1. Read every file the requirement touches. Understand the current design and why it took that shape.
2. Ask the question in writing: "If we wrote this from scratch with this requirement, what would we build?" Sketch that design in a few lines.
3. Compare the sketch to the current design. The differences are the real change.
4. Propagate the change through every reference: types, function signatures, docs, examples, tests, and rationale sections. A stale doc is part of the old design.
5. Plan the whole redesign, then deliver it in verifiable units. See `core/principles/sequence-verifiable-units.md`.

Worked example. An app stores one `currency: "USD"` constant and formats every price with it. A new requirement adds EUR accounts. The bolt-on path adds `if (user.currency === "EUR")` in the checkout, the invoice, and the email template. The redesign asks what a day-one design would have: a `Money` type with `amount` and `currency`, formatted by one function. The constant disappears, every price carries its currency, and the three branches never exist.

## Smells

- A new boolean or mode flag checked in many places to switch between old and new behavior.
- Comments or docs that say "except when X" next to code written before X existed.
- A type with optional fields that only make sense for the new case.
- Tests for the new requirement that live apart from, and contradict the setup of, the existing tests.
- The design doc still describes the old world after the change merges.

## Check

Answer yes or no: if a new engineer read only the final code and docs, would they be unable to tell which requirement came later? Yes means the redesign was done. If the new requirement shows up as a special case, it was bolted on.

## Source

- `skills/principle-redesign-from-first-principles/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
