---
name: architect
description: Settle types, signatures, state ownership, and module boundaries before writing code, by tracing every touched system and comparing two sketched shapes. Stays in the loop during implementation and redesigns when workarounds repeat. Load for architect this, design this, or non-trivial work where jumping to code would lock in the wrong shape.
origin: pstack
---

# Architect

Before writing code, trace every system the change touches. Then sketch two different shapes for it (types, signatures, module boundaries) and pick the one where each piece of state has one owner, each task has one way to do it, and callers need to know least. Once code starts, keep checking the shape against reality and redesign instead of patching when workarounds repeat.

## When to use

- The change crosses function or module boundaries, moves ownership of state, or adds a public API.
- A new requirement lands in an existing design (`core/principles/redesign-from-first-principles.md`).
- The user says "architect this", "design this first", or asks to see the design before code.
- Not for a local edit inside one function. Not for a standalone choice such as a name, a format, or an algorithm; run `core/skills/arena/SKILL.md` directly for that.

## Procedure

1. State the requirement in one paragraph, from the caller's point of view: who calls it, with what, and what they get back. For shared code, write the usage example a caller would read first.
2. Trace every system the change touches. Follow `core/skills/how/SKILL.md` for each one you have not traced. List each piece of state involved, its current owner, and every reader and writer, with `file:line`.
3. Settle the foundations first (`core/principles/foundational-thinking.md`): core types, data structures, and what concurrent actors share. Encode stateful or branch-heavy logic as a structure such as a state machine or table (`core/principles/model-the-domain.md`), and make illegal states unrepresentable (`core/principles/type-system-discipline.md`).
4. Sketch shape A and shape B. Each sketch has: the types, the exported signatures, the module boundaries, which module owns each piece of state, and where validation happens (`core/principles/boundary-discipline.md`). The two must differ in a real way (ownership, layering, or data model), not in naming.
5. Score both shapes against the test: one owner per piece of state, one way to do each task, least knowledge required of callers. Count the layers and hidden state a reader must hold (`core/principles/minimize-reader-load.md`). Prefer the smaller API and the cleaner boundary when tied (`core/principles/laziness-protocol.md`).
6. Escalate when the design is large, contested, or expensive to reverse: run `core/skills/arena/SKILL.md` with the requirement and the scoring test as its rubric instead of sketching alone. When an open question can be answered by running something, prototype it instead of debating it (`core/playbooks/prototype.md`).
7. Record the choice. Log it with `node scripts/log-decision.mjs design "<chosen shape>" "<why it beat the other>" "<sketch path or file:line>" "chosen"` (path relative to the harness home). Show the sketch before code when the user asked to review it.
8. Stay in the loop during implementation. Compare each landed unit with the sketch. When the same workaround appears twice (an adapter, a flag, a special case, a second path to the same result), stop patching and redesign from the current requirement, then migrate callers and delete the old path in one wave (`core/principles/migrate-callers-then-delete-legacy-apis.md`).

## Output

- The requirement and the usage example.
- The traced systems with state, owners, readers, and writers.
- Shape A and shape B as code-level sketches (types and signatures), with the score of each against the test.
- The chosen shape, one paragraph on why, and what was rejected.
- A decision row in `.poteto/decisions.tsv`.
- During implementation, any redesign with the repeated workaround that triggered it.

## Source

Adapted from pstack `skills/architect/SKILL.md` and `docs/guide/04-design.md` (Lauren Tan, cursor/plugins, MIT).
