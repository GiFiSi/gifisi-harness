---
name: blast-radius
description: Find what a change could break outside its own diff before it ships, and prove the one fact that makes it safe by running real code. Load for "what could this break", "blast radius of X", a small diff you do not trust, PR review, shipping, or a refactor that touches shared code.
origin: pstack
---

# Blast radius

Find what a change breaks somewhere else, before it ships. Listing callers is not the job. Any agent can search for callers in a second. The job is the breakage a symbol search will not show.

`core/skills/how/SKILL.md` explains what the code does. `core/skills/why/SKILL.md` explains why it has that shape. This skill finds what the change breaks elsewhere.

## When to use

- "What could this break", "blast radius of X", "is this safe to merge".
- A small diff you do not fully trust, including your own.
- A refactor, rename, or deletion that touches code other modules read.
- The verify step of the bug-fix, refactoring, shipping, babysit, code review, and security review routes.
- Not for explaining current behavior. That is `core/skills/how/SKILL.md`.

## Do not trust your own writeup

A blast-radius writeup that sounds right is worth nothing. It reads as convincing whether or not it is true. Find the one or two facts the change's safety depends on and prove them by running code.

Proof levels, weakest first. Push each load-bearing fact as far down this list as is cheap, and say where it stopped.

1. Asserted. You said so. Worthless on its own.
2. Pointed. You cited a real `file:line`, or the library's own source.
3. Argued. You walked the failure step by step and showed it does not reach.
4. Ran. A script or test calls the real code and fails loudly if you are wrong.
5. Reproduced. You observed it in the running app on the surface the user uses.

Level 4 is usually one small script that imports the same library version the app ships and calls the exact function you worry about.

## Procedure

1. Read the change whole: the diff, every symbol it adds, changes, or deletes, and what it now does differently, including behavior the diff does not spell out. Read the commits and the PR description if there is one.
2. Find the one fact the change is safe because of. Most risky-looking changes are safe because of a single fact, such as "this call only drops cache entries that are already dead". If that fact holds, most risks clear at once. Spend your time here, not on a long list of maybes.
3. Look where a symbol search stops. Read the source of the libraries you call at their pinned version, including local patches. Work out when code runs: microtasks, timers, teardown, framework render and cleanup order. Follow what grep misses: JSON an API returns, a database column, a wire format, another language reading the same bytes, a feature flag, a config key, code three hops downstream, `.gifisi/feature-map.json` features that exercise the path.
4. Rate each risk honestly. Give it a real likelihood and a real cost. Keep confirmed risks. List the ones you checked and cleared separately. Cite a real `file:line`. A search that finds nothing is still an answer. Never invent a caller or an API.
5. Prove the load-bearing fact. Write a script or test that runs the real code, run it, and paste the command and its output. If the project has a live check for the path, run `node scripts/verify-feature-map.mjs` (installed as `.gifisi/scripts/verify-feature-map.mjs`) and paste the rows that cover it.
6. For a large or cross-cutting change, get independent answers. If your harness can run several models or several fresh-context subagents, load `core/skills/arena/SKILL.md`, ask each the same question, and merge the answers. Different reviewers catch different real bugs. Otherwise do one more pass yourself from a clean read of the diff, without your earlier notes.
7. Log the verdict with `node scripts/log-decision.mjs verify "<one fact>" "<why it matters>" "<proof command or file:line>" "<proven at level N | unproven>"` so the trail shows what the safety claim rests on.
8. Write the result through `core/skills/unslop/SKILL.md`. Strip anything private before it goes anywhere public.

## Output

- What it does. What changed, including the part that is not obvious.
- The one fact it is safe because of. State it, give the proof level it reached, and paste the proof. If you could not prove it, write `unproven`.
- Risks. Each names how it breaks, the `file:line`, likelihood and cost, and how to check. Paste the proof for the ones that matter.
- Cleared. What you checked and why it is fine.
- Before you merge. The cheapest test or repro that catches the real bug, including the script you wrote.

## Source

Adapted from pstack `skills/blast-radius/SKILL.md` and `docs/guide/06-verify-and-ship.md` (Lauren Tan, cursor/plugins, MIT).
