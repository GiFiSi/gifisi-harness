---
name: foundational-thinking
title: Foundational Thinking
group: Core
applies_when: Before writing logic. Settle core types, data structures, and what concurrent actors share first.
---

# Foundational Thinking

## Rule

Get the data shape right before writing logic. Define the core types, trace every access pattern, and pick structures that fit the dominant paths. When the data is right, the code that uses it becomes obvious.

## When it applies

- You are starting a feature, module, or service and have not yet written its types.
- You are deciding the order of work: scaffold (CI, tests, shared types) versus feature code.
- Two actors (threads, processes, agents, requests) will read or write the same state.
- Logic keeps needing lookups, sorts, or joins that the current structure makes awkward.

## How to apply

1. List the core entities and write their types before any function body.
2. List each access pattern: who reads what, by which key, how often. Pick the structure that makes the most frequent path cheap and direct.
3. Remove duplication in the structure, not in every line. One normalized record beats three copies kept in sync by code.
4. For shared state, ask: what happens if another actor changes this while I hold it? If the answer is not "nothing", isolate it first. See `core/principles/separate-before-serializing-shared-state.md`.
5. Sequence scaffold first. Delete dead code, then add what every later step needs (test runner, CI, shared types), then build features in small single-purpose commits.

Worked example. A task list feature needs "show tasks for a project" and "move a task between projects". The first draft stores `projects: [{ id, tasks: [...] }]`, so a move means finding, splicing, and pushing across nested arrays. Tracing access patterns shows both operations key on task id and project id. A flat `tasks: Map<taskId, { projectId, ... }>` makes a move a single field write, and the list view a filter. The move function shrinks from 25 lines to 3.

## Smells

- Functions that start with a loop to find the record they need, in several places.
- Two structures that hold the same fact and need code to keep them in sync.
- Types added after the logic, shaped to fit whatever the logic happened to do.
- A race condition fixed with a lock when the shared state did not need to be shared.
- Feature commits that also add test setup or CI, because scaffolding was skipped.

## Check

Answer yes or no: before the first function body in this change, did you write the core types and list the access patterns they serve, and does each shared mutable value have a stated answer to "what if another actor changes it"? Yes to both means the principle was applied.

## Source

- `skills/principle-foundational-thinking/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
