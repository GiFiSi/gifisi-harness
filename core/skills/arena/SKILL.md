---
name: arena
description: Produce N independent candidates for the same task, score them on a rubric (with a cross-judge from another model vendor when the harness offers one), pick a base, graft the strongest parts of the others into it, and verify the result. Works with parallel subagents or sequentially. Load for arena this, or when one attempt at a non-trivial artifact would lock in the wrong shape.
origin: pstack
---

# Arena

One attempt at a hard design locks in the first shape that came to mind. Arena runs several independent attempts at the same brief, picks the strongest as a base, and grafts in the best ideas from the rest.

Open a todo list with one entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before producing anything.

## When to use

- A design or code artifact where the first idea is likely not the best: an API shape, a data model, a module layout, an algorithm, a naming scheme, a file format.
- `core/skills/architect/SKILL.md` escalates here for large or contested designs.
- Not for coverage of independent slices or a race with a declared selection rule. That is `core/skills/swarm/SKILL.md`.
- Not for trying to break a finished change. That is `core/skills/interrogate/SKILL.md`.

## Procedure

1. **Frame.** Write the task once; every candidate gets the same prompt, so the prompt is the contract. State the artifact each candidate produces and the shared grounding (files to read, constraints).
2. **Rubric.** Derive 3 to 6 concrete, gradeable criteria for success on this task. The rubric is for the picker. Candidates see only the task.
3. **Runners.** Choose N, default 3. Raise N when the decision is expensive to reverse; lower it when it is cheap. When the harness offers models from different vendors or families, give each runner a different one, since diverse models fail differently. When the work is generation-bound rather than judgment-sensitive, repeating one model is fine.
4. **Isolate outputs.** Give each candidate its own output location: a git worktree per candidate where possible (`git worktree add <dir> -b arena/<slug>-<n>`), otherwise a directory per candidate under the OS temp directory. Nothing is shared (`core/principles/separate-before-serializing-shared-state.md`).
5. **Fan out.** Run the candidates as described under Parallel and sequential modes. Each produces the artifact plus a short rationale naming the alternatives it considered and what it rejected. If a candidate produces nothing, continue with N-1 and note the dropout.
6. **Cross-judge.** When the harness offers a model from a vendor other than the one running this session, give it read-only access to every candidate and the rubric, labeled by path only. It scores each candidate on each criterion and recommends a base. If no other-vendor model is available, skip the judge and say so in the synthesis note.
7. **Pick a base.** Read every candidate end to end. Score each against the rubric criterion by criterion, not on overall feel. Compare with the judge: agreement confirms the pick; disagreement means bias or an ambiguous rubric, so read both rationales before deciding. Pick the base a future maintainer can extend most easily without breaking invariants. When tied, prefer the cleaner boundary or smaller API (`core/principles/laziness-protocol.md`).
8. **Graft.** Walk each losing candidate once more for what is worth porting, usually one or two things each. Fold each graft in by hand so the result stays coherent under one mental model (`core/principles/redesign-from-first-principles.md`). Do not paste mechanically. If all candidates converge on one shape, note the agreement and ship it with no graft. If they diverge wildly, the frame was under-specified: reframe and rerun rather than averaging.
9. **Verify.** Verify the synthesized artifact on the real surface (`core/principles/prove-it-works.md`). If verification finds a problem, either the frame was wrong (reframe and rerun) or a candidate caught it and the graft missed it (return to step 8). Do not paper over it.
10. **Record and clean up.** Log the pick with `node scripts/log-decision.mjs design "<base>" "<rubric result>" "<candidate paths>" "<verification result>"` (path relative to the harness home). Remove candidate worktrees and directories once the synthesis is verified.

## Parallel and sequential modes

**Parallel.** If your harness can spawn subagents, start all N in one batch, each in the background if supported, with the task, the grounding paths, its own output path, and the rationale requirement. Pass file pointers, not pasted context. Wait for all of them before step 6.

**Sequential.** Without subagents, produce the candidates yourself, one at a time, keeping them independent:

- Freeze the frame and rubric before candidate 1. Do not edit them between candidates.
- Before each candidate, commit to a different starting premise and write it down (for example: state lives in the caller; state lives in a store; event-driven).
- Produce each candidate from the frame alone. Do not reread earlier candidates until all N exist.
- Write each candidate to its own worktree or directory, exactly as in parallel mode.
- Skip the cross-judge unless another model is reachable, and say the judge was skipped. Score the rubric only after all candidates exist.

## Output

One synthesized artifact, plus a short synthesis note:

- The base and why it won, with rubric scores per candidate.
- The cross-judge verdict, or that the judge was skipped and why.
- Each graft with its source candidate.
- What was rejected and why.
- Convergence or divergence, and any dropouts.
- The verification command and its result.

## Source

Adapted from pstack `skills/arena/SKILL.md` and `docs/guide/04-design.md` (Lauren Tan, cursor/plugins, MIT). Vendor model configuration was replaced with harness-neutral runner selection and a sequential mode.
