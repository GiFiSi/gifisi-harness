---
name: fix-root-causes
title: Fix Root Causes
group: Verification
applies_when: Debugging. Trace each symptom to the first wrong state and fix it there; a guard is not a fix.
---

# Fix Root Causes

## Rule

Fix the fault, not the place where it surfaced. The root cause is the first place the system did something it should not do, or failed to handle a state it should handle. A guard at the symptom is a fix only when the state it handles is legitimate.

## When it applies

- Any bug report, failing test, crash, or wrong value.
- A regression that a guard, retry, or try/catch would make go away.
- A flaky test or an intermittent production error.
- A second report of a bug that was "fixed" before.

## How to apply

1. **Reproduce first.** Write the smallest command or test that shows the bug. Without a reproduction you cannot prove the fix.
2. **Trace back to the first wrong state.** Ask "why" until the answer is a wrong decision in the code, not a description of the symptom. When reasoning stalls, instrument and read the actual state at each step.
3. **Ask whether the triggering state is legitimate.** If a null, empty list, or out-of-range value is a valid input, handle it where the code broke. If it should never exist, a check at the symptom hides the bug; find what produced it.
4. **Fix the pattern, not the instance.** Search for every place with the same fault and fix them together.
5. **Prove it.** The reproduction fails before the fix and passes after it. Keep it as a regression test.
6. **Add the cheap signal.** If finding the cause took a deep dig, propose the always-on log line, assertion, or type that would have shown it at first look.

The usual ways to hide a bug: guards, retries, swallowed errors, clamped values, default fallbacks, and discarded state. Each is acceptable only for a state the system should legitimately handle.

Worked example. The checkout page crashes with `Cannot read properties of undefined (reading 'price')`. The quick patch is `item?.price ?? 0`. That turns a crash into a wrong total. Tracing back:

```text
render: item is undefined at cart.items[3]
cart.items built by removeItem(): uses splice(index) instead of splice(index, 1)
splice(index) removes every item after index, then a stale index reads past the end
```

The fix is `splice(index, 1)` in `removeItem`, plus a test that removes the middle item and checks the remaining three. A search finds the same `splice(index)` in the wishlist code, fixed in the same change.

## Smells

- Optional chaining or a default value added at the line in the stack trace.
- A retry added around a call that fails for a deterministic reason.
- An empty catch block or an error logged and ignored.
- A fix with no reproduction and no test.
- The commit message describes the symptom, not the cause.

## Check

Answer yes or no: can you name the first wrong state, is the fix at that point (or the triggering state shown to be legitimate), and does a reproduction fail before and pass after the fix? Yes to all means the principle held.

Related: `core/principles/attack-the-premise.md`, `core/principles/prove-it-works.md`, `core/skills/why/SKILL.md`, `core/skills/tdd/SKILL.md`.

## Source

- `skills/principle-fix-root-causes/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
