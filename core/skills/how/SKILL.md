---
name: how
description: Explain how a subsystem works today (runtime flow, key types, ownership, layering) so a senior engineer new to it can work in it with confidence. Load for "how does X work", walkthroughs before a change, and "where should this live" questions. For the reasons behind a design, load the why skill instead.
origin: pstack
---

# How

Answer "how does X work?" from the code as it runs today. The goal is a mental model the reader can act on, not a tour of files.

## When to use

- "How does X work", "walk me through Y", "what happens when Z".
- Before changing code you have not traced. A traced model is cheaper than the second bug from a fix at the first plausible spot.
- Placement and ownership questions: "where should this live", "which module owns this", "is this the right layer".
- Onboarding onto an unfamiliar area.
- Not for "why is it built this way". That is `core/skills/why/SKILL.md`. The two compose: run why first when you suspect history explains the shape.

## Procedure

1. Restate the question in one sentence. If the scope is ambiguous, state your interpretation and proceed; the user can redirect.
2. Pick where the exploration runs. If your harness can spawn a read-only subagent, delegate the exploration to one with the question and the brief below, so file dumps stay out of the main thread. Otherwise explore inline and keep only notes, not raw file contents.
3. Find the entry points: the route, command, event, exported function, or UI action where the behavior starts. Use search (`git grep`, the editor's symbol search) before opening files.
4. Follow one real request or call end to end. Record each hop as `file:line` with the function name and what it does to the data.
5. Name the core types and the state each module owns. Note who writes each piece of state and who only reads it.
6. Collect the non-obvious parts: caches, retries, background jobs, feature flags, implicit ordering, error paths, and anything that differs between environments.
7. For placement questions, list the layers the change could live in and apply the test from `core/skills/architect/SKILL.md`: one owner per piece of state, one way to do each task, callers know least.
8. Write the explanation to the Output contract. Present a subagent's explanation with light edits for clarity or conversation context; do not rewrite its substance.

### Brief for the explorer

> You are writing an architectural explanation for a senior engineer. Explore the codebase read-only and write an explanation that someone unfamiliar with this area could read and walk away with a solid mental model, enough to start working in it confidently. Cite `file:line` for every claim about behavior. Mark anything you inferred without reading the code as inferred.

## Output

- One-paragraph answer to the question as asked.
- The runtime flow as numbered hops with `file:line` citations. A small diagram when there are three or more moving parts.
- Core types and state ownership: what owns what, who mutates it.
- Non-obvious behavior and sharp edges.
- For placement questions, the recommended home and the reason, in one or two sentences.
- Open questions the code alone did not answer, with a pointer to `core/skills/why/SKILL.md` when history would answer them.

Every behavioral claim is either cited or labeled inferred.

## Source

Adapted from pstack `skills/how/SKILL.md` and `docs/guide/03-understand.md` (Lauren Tan, cursor/plugins, MIT).
