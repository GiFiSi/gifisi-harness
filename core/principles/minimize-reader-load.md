---
name: minimize-reader-load
title: Minimize Reader Load
group: Core
applies_when: Code is hard to trace. Count layers and hidden state, collapse one-caller wrappers, shrink mutable scope.
---

# Minimize Reader Load

## Rule

Reader load is the work a reader does to understand code. It has two separate axes: the layers between a question and its answer, and the hidden or mutable state the reader must hold in mind. Keep both small.

## When it applies

- You are reviewing or shaping code that is hard to follow.
- Answering "where does this value come from?" takes jumps through several files.
- A value is written from many places, or lives at module or global scope.
- You are about to add a wrapper, adapter, or pass-through method.

## How to apply

1. Count the layers. Start at a question ("why is `total` wrong?") and count the hops to the code that answers it.
2. Collapse layers that only forward: wrappers with one caller, adapters with no second implementation, methods that pass arguments through. Inline them.
3. Shrink state scope in this order: return values over mutation, locals over fields, fields over module state, module state over globals.
4. Derive values instead of syncing copies. A computed `isEmpty` beats an `isEmpty` field updated in three setters.
5. Name an invariant once, at the boundary, not in every consumer.

Worked example. `getUserName()` calls `UserService.name()`, which calls `UserRepo.fetchName()`, which calls `db.get("user").name`. Each of the first three has one caller. A reader asking "where does the name come from?" opens four files. Inlining the three forwarders leaves one function that reads the record. The question is answered in one file and one hop.

## Smells

- A class or function with one caller whose body is a single call to something else.
- An interface with exactly one implementation and no test double that needs it.
- Mutable module-level variables written from more than one function.
- A boolean field that must be kept consistent with another field by hand.
- The same validation repeated in every consumer of a value.

## Check

Answer yes or no: can a new reader answer "where does X come from?" and "what can change X?" for each value this change touches, in under 30 seconds, by following at most two hops? If no, cut a layer or cut state, then ask again.

Related: `core/principles/laziness-protocol.md`, `core/principles/boundary-discipline.md`.

## Source

- `skills/principle-minimize-reader-load/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
