---
name: separate-before-serializing-shared-state
title: Separate Before Serializing Shared State
group: Architecture
applies_when: Concurrent actors might write the same file, branch, or key. Remove the sharing before adding locks.
---

# Separate Before Serializing Shared State

## Rule

When concurrent actors might write the same file, branch, key, or object, first ask whether they need one shared object at all. Usually each actor publishes an independent fact. Give each actor its own target and merge where the state is read. Serialize access only when one shared write target is a real invariant.

## When it applies

- Parallel subagents, workers, or processes that write results.
- Two attempts at the same task that would commit to one branch.
- Jobs that update one status file, one cache key, or one config object.
- Any plan that contains the words "add a lock" or "retry on conflict".

## How to apply

1. **Name the facts each actor produces.** If actor A's output never depends on actor B's output, the facts are independent.
2. **Separate the write targets.** One file per actor, one key per actor, one branch or worktree per attempt, one state directory per run. Two workers writing their own field into one shared `state.json` is still shared mutation.
3. **Merge on read.** The reader lists the per-actor outputs and combines them. The merge is a pure function that can run as often as needed.
4. **Serialize only real invariants.** When a single shared target is required (one ledger, one sequence number), enforce it with structure: a single writer, sequential phases, a lockfile with owner evidence, or compare-and-swap.
5. **Never rely on instructions.** "Please do not write at the same time" in a prompt is not concurrency control.

Worked example. Three subagents review a diff in parallel and each appends findings to `review.md`. Two runs interleave lines and one finding is lost. Adding a lock would serialize the reviewers. Separating removes the conflict:

```text
before: reviewer-1, reviewer-2, reviewer-3 -> append review.md (lost write)
after:  reviewer-N -> write findings/reviewer-N.md
        main thread -> read findings/*.md, dedupe, write review.md once
```

No reviewer waits for another. The only shared write happens once, in one actor, after all reviewers finish.

## Smells

- A lock, mutex, or retry loop introduced to fix a race that separation would remove.
- One JSON file that several workers read, modify, and write back.
- Parallel attempts sharing one git branch or working tree.
- A prompt that tells agents to "take turns" or "check first".
- Intermittent lost writes that disappear when run serially.

## Check

Answer yes or no: in this design, does every concurrent actor write only to a target no other actor writes, with any remaining shared write enforced by structure rather than instructions? Yes means the principle held.

Related: `core/principles/make-operations-idempotent.md`, `core/principles/guard-the-context-window.md`, `core/skills/swarm/SKILL.md`.

## Source

- `skills/principle-separate-before-serializing-shared-state/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
