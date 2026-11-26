---
name: sharpen
description: Make a task deeper, not bigger. Say what a top professional would do that the request does not ask for, which raw material they would start from, which methods and tools they would use, and what outside evidence would show the result is right, then rewrite the prompt to ask for exactly that. Load before a non-trivial task whose prompt feels shallow, or when the user asks to sharpen it.
origin: pstack
---

# Sharpen

A shallow prompt gets a shallow result, and adding scope does not fix it. Sharpening keeps the scope and raises the standard: the same task, done the way the best person in the field would do it, with a check that does not depend on the agent's own opinion.

## When to use

- A task prompt asks for an output but not for evidence that it is right.
- The prompt starts from digested material (a summary, a dashboard, a screenshot) when raw material exists (logs, traces, source, the data).
- Before a run with no human in the loop, where a vague prompt compounds.
- When authoring a skill or playbook, to cut lines that change no decision.
- Not for learning the vocabulary of a problem class. That is `core/skills/reframe/SKILL.md`.

## Procedure

1. Say what a top professional in this field would do here that the prompt does not ask for. Name the practice, not a quality ("bisect the regression to a commit", not "be thorough").
2. Name the rawest material they would start from instead of what has already been digested: source over docs, traces over dashboards, the failing input over the bug title, the user's data over a fixture.
3. Name the specific methods and tools they would use: a profiler, `git bisect`, a property test, a model checker, a live check in `.poteto/feature-map.json` run by `scripts/verify-feature-map.mjs`.
4. Say what, other than the agent or the user, would show the result is right: a failing-then-passing check, a measurement vetted with `core/skills/benchmark-checklist/SKILL.md`, a counterexample trace, a reviewer who did not write it.
5. Rewrite the prompt to ask for exactly that, at the same scope. Do not add features, phases, or deliverables the user did not want.
6. In the rewritten prompt, ask the agent to prototype any choice an experiment can settle and recommend an option from what it observed. Leave product and preference choices that no experiment can settle to the user, and list them.

## Output

- The four answers from steps 1 to 4, one short paragraph or list each.
- The rewritten prompt in one fenced block, ready to paste.
- The list of choices left to the user because no experiment can settle them.

## Source

Adapted from pstack `skills/sharpen/SKILL.md` (Lauren Tan, cursor/plugins, MIT).
