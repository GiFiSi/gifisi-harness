---
name: create-formal-verification-skill
description: Find the code where a bug costs the most and tests reach the least, usually a core state machine, retry loop, or parser, and check one property over every case in a stated scope. Use TLA+/TLC or Alloy when installed, otherwise an exhaustive state exploration or seeded property test with node:test. Leaves notes the next agent can rerun. Load to model-check a race or prove an invariant.
origin: pstack
---

# Create a formal verification skill

A test checks the cases someone thought to write. Formal verification checks every case in a stated scope: every order of steps in a model, every input up to a bound, or every input. This skill picks the part of the repo where that matters most, verifies one property of it, and leaves notes that let the next agent check a change against that property without learning the verification language.

## When to use

- Concurrency, retries, idempotency, ordering, or a state machine where a bad interleaving harms users and tests rarely produce it.
- A parser, encoder, or data-structure invariant that must hold for every input up to a size.
- A bug report that says "sometimes" about stateful logic.
- Not for proving a user-visible feature works on the live app. That is `core/skills/create-verification-skill/SKILL.md`.
- Not for bringing an existing check back in line after code changes. That is `core/skills/maintain-formal-verification-skill/SKILL.md`.

## Procedure

1. Choose the target from the code. If the user named an area or a bug, start there. Otherwise find a promise the code makes where a break harms users and tests rarely reach the breaking case: a state machine with several actors, a retry or resume path, a counter that must never go negative, a lock or lease. Pick the strongest such target, not the easiest one to verify.
2. Write the property and the harm, one plain sentence each, in the repo's own names. For example: "An order is never both `refunded` and `shipped`" and "a customer is charged for goods that never ship".
3. Detect tools before choosing one. Never assume a tool is installed. Run `java -version`; look for `tla2tools.jar` (repo, `TLA2TOOLS_JAR` env var, or a `tlc` command on PATH) and for an Alloy jar. Record what you found, with versions, in the notes.
4. Let the question choose the tool. Bad orderings of events in a design suit a model checker: TLA+ with TLC is the default when Java and `tla2tools.jar` are present, Alloy when its jar is present and the question is about relational structure. Whether the real code behaves for every input suits an enumeration or property test that calls the real exported functions. When no model checker is installed, use the node:test fallback in step 5 rather than installing tools without the user's approval.
5. Build the check. With TLC, write `<project>/.poteto/verify/formal/<Area>.tla` and `<Area>.cfg`, model one indivisible code step as one action, and run `java -cp <path to tla2tools.jar> tlc2.TLC -config <Area>.cfg <Area>.tla`. Without a model checker, write `<project>/test/formal/<area>.test.mjs` that explores every reachable state of the real transition function breadth first up to a stated depth, checks the invariant in every state, and fails with the shortest trace (pattern below). For input properties, generate inputs from a seeded PRNG, print the seed on failure, and run a fixed count.
6. Keep it true to the code. Every action in the model or the explorer points to a function a reviewer can open at `file:line`. What the check treats as one step is one step in the code: an `await` between a read and a write is two steps. Use the repo's names for states and actions.
7. Prove it can fail. Make a scratch change to the real code that breaks the property (remove a guard, reorder two steps, drop an idempotency key) and run the check. It must fail with a trace that names the broken step. Drop the scratch change and confirm the check is back to passing, or failing only on the findings you will report. If it misses the break, fix the check, not the scratch change.
8. Keep findings as findings. When the current code breaks the property, report the counterexample as numbered steps in the code's own words. Do not weaken the property, shrink the bound, or edit product code to make it pass unless the user asks.
9. Write `<project>/.poteto/verify/formal-<area>.md` for an agent who reads it cold: property and harm; tool, version, and why it was chosen; the one command to run it; bounds and assumptions; a coverage list of the files and functions each action maps to; the sync commit (`git rev-parse HEAD` at the time you confirmed the check describes the code); how to tell a real bug from a modeling error (replay the trace against the code); and how to update the check when the promise changes on purpose. Every command and path in it must be real.
10. Follow the notes once yourself, as the next agent would, on a fresh scratch break. Then log it with `node scripts/log-decision.mjs verify "formal check for <area>" "<property>" "<command> fails on scratch break, passes on HEAD" "pass"`.

The exhaustive explorer for the node:test fallback. `actions` maps each action name to a function that calls the real transition code and returns the list of next states (empty when the action is disabled):

```js
export function explore(initial, actions, invariant, maxDepth) {
	const key = (state) => JSON.stringify(state);
	const parent = new Map([[key(initial), null]]);
	const traceTo = (k) => {
		const steps = [];
		for (let at = parent.get(k); at; at = parent.get(at.from)) steps.unshift(at.action);
		return steps;
	};
	if (!invariant(initial)) return { ok: false, trace: [], state: initial };
	let frontier = [initial];
	for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
		const next = [];
		for (const state of frontier) {
			for (const [name, step] of Object.entries(actions)) {
				for (const after of step(state)) {
					const k = key(after);
					if (parent.has(k)) continue;
					parent.set(k, { from: key(state), action: name });
					if (!invariant(after)) return { ok: false, trace: traceTo(k), state: after };
					next.push(after);
				}
			}
		}
		frontier = next;
	}
	return { ok: true, states: parent.size, exhausted: frontier.length === 0 };
}
```

The test asserts `result.ok` and prints `result.trace` on failure. Report `states` and whether the space was `exhausted` or cut at `maxDepth`: a pass covers only what was explored.

## Output

- What was verified: the property and the harm in plain words.
- The tool, its version, and why it was chosen, or that no model checker was installed and the node:test fallback was used.
- Bounds and assumptions, and the state count or input count the run covered.
- The scratch break you used and the trace the check printed for it.
- Findings on the current code, each as numbered steps in the code's words with the harm.
- The command to rerun, the path of `<project>/.poteto/verify/formal-<area>.md`, the sync commit, and what the check does not cover.
- A `.poteto/decisions.tsv` row. Suggest a second target only if you found a close one.

## Source

Adapted from pstack `skills/create-formal-verification-skill/SKILL.md` (Lauren Tan, cursor/plugins, MIT). The node:test explorer, tool detection step, and `.poteto/verify/` layout are poteto-harness additions.
