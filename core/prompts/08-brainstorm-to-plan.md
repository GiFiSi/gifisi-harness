# 08 Brainstorm to plan

## When to use

Use this prompt when a request is open enough that an agent could build three different things from it, for example "add a notification system" with no channel, audience or trigger named. The agent clarifies intent, lays out competing readings side by side, writes a plan where every unit ends in an executable check, and stops for your go before touching code.

Write the request after the prompt exactly as it reached you, loose wording included. When the request is already small and clear, the agent skips the questions and goes straight to the plan.

## Prompt

```text
Turn the request I write after this prompt into a verified plan by following
the poteto-harness router. Do not write code until I say go. The harness
files are under `.poteto/` in this project (or `~/.poteto-harness/` for a
global install); paths below are relative to that home.

1. Before reading code, print the task-start signal exactly in this shape:
   [POTETO-HARNESS] Task Type: Multi-phase plan | Playbook: Multi-phase plan
   Reason: <one sentence on why this request needs clarifying and planning>
   Done Predicate: <`.poteto/plans/<slug>.md` exists, every unit in it has a
   runnable verification, and I have answered go or given corrections>
2. Open `core/playbooks/multi-phase-plan.md`, take the plan branch, and copy its
   numbered Steps verbatim into your todo list. Execute them in order.
3. Load `core/skills/interrogate/SKILL.md` to test the readings and the draft
   plan, `core/skills/architect/SKILL.md` to settle types and boundaries, and
   `core/skills/figure-it-out/SKILL.md` if the work is large or no narrower route
   fits.
4. Clarify intent first. Read the code the request touches, then ask a short
   set of pointed questions: what done looks like, what is in and out of
   scope, and unstated constraints (patterns to follow, things not to
   touch, performance or compatibility needs). Skip questions the code
   already answers. If the request has more than one reasonable reading,
   show the readings side by side with what each would build; do not pick
   one silently.
5. Settle what a run can settle by running it (a spike or a quick check)
   instead of asking me. Ask me only about product calls no run can decide.
6. Write the plan to .poteto/plans/<slug>.md: what changes, units in landing
   order, the dependency graph, and the files each unit may touch. Each unit
   ends in a verification: a command to run, a test to pass, or a behavior
   to observe on the real surface, never "should work". A unit with no
   check is too vague; split it.
7. For units that change user-visible behavior, add a check to
   .poteto/feature-map.json so `node .poteto/scripts/verify-feature-map.mjs`
   can run it.
8. Log the plan with `node .poteto/scripts/log-decision.mjs design "<slug>"
   "<chosen reading>" ".poteto/plans/<slug>.md" "awaiting go"`.
9. Show me the plan and stop. A correction updates only the parts it
   touches; re-confirm only those.
10. After I say go, implement unit by unit. Each unit starts with its own
    task-start signal and playbook (feature, bug fix, refactoring), runs its
    verification, and shows the result before it is checked off. A failing
    check stops the line until it passes.
```

## Expected result

- The `[POTETO-HARNESS]` header and the plan-branch steps as the todo list.
- Pointed questions, or competing readings shown side by side, before any plan when the request is ambiguous.
- A plan at `.poteto/plans/<slug>.md` with units in landing order, files per unit, and a runnable verification per unit.
- A `design` row in `.poteto/decisions.tsv`, then a stop until you say go.
- After go: one header per unit and each unit's verification output shown before it is marked done.

## Source

- `docs/prompts/04-brainstorm-to-plan.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- Plan file shape and verification-per-unit from `skills/poteto-mode/playbooks/multi-phase-plan.md` in pstack by Lauren Tan (cursor/plugins, MIT), via `playbooks/multi-phase-plan.md`.
