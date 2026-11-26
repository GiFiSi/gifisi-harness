---
name: model-the-domain
title: Model the Domain
group: Architecture
applies_when: Stateful or branch-heavy logic. Encode the domain in a structure (state machine, table, typed model).
---

# Model the Domain

## Rule

Encode the domain in a data structure instead of scattering it across conditionals. The right structure makes invalid states impossible to represent and deletes branches.

## When it applies

- Stateful logic: a request lifecycle, an upload, a checkout, an agent run.
- Code that branches a lot on the same kind of value (status, type, mode).
- The same shape assumption repeated across several files.
- A new feature that would add one more branch to an existing if/else chain.

## How to apply

Pick the structure that matches the domain:

- a state machine instead of scattered booleans or phase checks;
- a typed model instead of loose parameters;
- a map, registry, or discriminated union instead of branching spread across files;
- a reducer instead of ad hoc mutations;
- an index, queue, or normalized collection where the access pattern calls for it.

Then move the rules into the structure, delete the branches it replaces, and test the structure directly.

Worked example. An upload has `isUploading`, `isDone`, and `error`. Code checks `if (isUploading && !error)` in five places, and a bug shows both `isDone` and `isUploading` true. A discriminated union removes the bad states:

```ts
type Upload =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done"; url: string }
  | { status: "failed"; error: string };
```

A `transition(upload, event)` function holds every legal move. The five checks become one `switch` on `status`, and the bug can no longer be written.

Do not force it. Keep plain code when the shape is clear, local, and unlikely to grow. Distrust an abstraction that adds indirection without removing branches or invalid states.

## Smells

- A feature that grows an if/else chain by one more branch.
- A second boolean that must stay in sync with the first.
- The same `switch` on a type or status repeated in several files.
- Optional fields that are only valid in some states.
- A bug report that describes a state the system should never reach.

## Check

Answer yes or no: in the code this change touches, is each domain rule written in one structure (type, table, state machine) rather than repeated in conditionals, and can no combination of fields represent an invalid state? Yes to both means the principle held.

Related: `core/principles/type-system-discipline.md`, `core/principles/foundational-thinking.md`.

## Source

- `skills/principle-model-the-domain/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
