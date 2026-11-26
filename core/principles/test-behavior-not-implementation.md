---
name: test-behavior-not-implementation
title: Test Behavior, Not Implementation
group: Verification
applies_when: Writing or keeping a test. Assert what users observe, so it fails only when behavior breaks.
---

# Test Behavior, Not Implementation

## Rule

A test is a claim about what users of the code can observe through its interface: return values, errors, state they can read back, and effects on outside systems. Private helpers, internal call order, and intermediate data are implementation. A good test fails when behavior breaks and keeps passing when only the internals change.

## When it applies

- Writing a new test, including the failing test in a TDD cycle.
- Changing code and deciding which existing tests to keep, rewrite, or delete.
- Reviewing a test that mocks heavily or inspects private state.
- A refactor that breaks many tests while behavior stays the same.

## How to apply

Judge each test against two imagined edits:

- **Break the behavior.** Return a wrong value, skip an effect, or perform it twice. If the test still passes, it proves nothing. The usual causes are a loose assertion, an expected value computed by the code under test, and an assertion on data the test built itself.
- **Change the internals.** Rename a private helper, reorder internal calls, change an intermediate structure, and keep every observable result. If the test fails, it is pinned to the implementation.

Keep a test that catches the first edit and survives the second. Rewrite or delete the rest. Then:

1. Drive the code through its public interface with a concrete input.
2. Derive the expected value from the requirement, written as a literal, not from the code under test.
3. Treat what an external service receives as behavior. A call to an internal helper is not.
4. Pair "this never happens" with a case where it would happen, so the test can fail.
5. Assert the error type or code that callers branch on, not the message text.

Worked example. A test for `applyCoupon` spies on the internal `computeDiscount` helper:

```js
// pinned to implementation
const spy = mock.method(pricing, "computeDiscount");
applyCoupon(cart, "SAVE10");
assert.equal(spy.mock.callCount(), 1);

// behavior
const result = applyCoupon({ items: [{ priceCents: 5000, qty: 2 }] }, "SAVE10");
assert.equal(result.totalCents, 9000);
assert.throws(() => applyCoupon(cart, "EXPIRED"), { code: "COUPON_EXPIRED" });
```

The first test passes even if the discount is wrong and fails if `computeDiscount` is inlined. The second fails on a wrong total and survives any internal rewrite.

## Smells

- A mock of a module that lives inside the same package.
- Assertions on call counts or call order of internal functions.
- Snapshot tests of large internal structures.
- `expected = sut(input)` followed by `assert.equal(sut(input), expected)`.
- A refactor PR that rewrites more test lines than source lines.

## Check

Answer yes or no: for each test this change adds or keeps, would a wrong observable result make it fail, and would an internals-only refactor with identical observable results leave it passing? Yes to both means the principle held.

Related: `core/principles/prove-it-works.md`, `core/skills/tdd/SKILL.md`, `core/skills/correct/SKILL.md`.

## Source

- `skills/principle-test-behavior-not-implementation/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
