---
name: migrate-callers-then-delete-legacy-apis
title: Migrate Callers Then Delete Legacy APIs
group: Architecture
applies_when: A new internal API while old callers exist. Migrate every caller and delete the old API in one wave.
---

# Migrate Callers Then Delete Legacy APIs

## Rule

When a new internal API replaces an old one, move every caller to the new API and delete the old one in the same wave. Do not keep a compatibility layer that nobody outside the codebase needs.

## When it applies

- No external user depends on the old API's backward compatibility.
- The project can absorb a coordinated breaking change across its own code.
- The new API is part of a refactor or simplification.
- Two ways to do the same thing already exist and agents keep copying the old one.

It does not apply to a published package, a public HTTP API, or a stored data format that other systems read. Those need a versioned deprecation path.

## How to apply

1. **List every caller.** Search for the old name, its re-exports, and dynamic lookups. Load `core/skills/blast-radius/SKILL.md` when callers span packages or the search is not obviously complete.
2. **Decide the new contract first.** Write the new signature and its tests before touching callers.
3. **Migrate callers in verifiable units.** Each unit moves a group of callers and ends with the type checker and tests passing.
4. **Update tests to the new contract.** Rewrite tests that assert the old API's behavior so they assert the new API. Delete tests that only protect the old implementation's internals.
5. **Delete the old API in the same wave.** Remove the function, its adapter, its re-export, and its documentation. A search for the old name returns nothing.
6. **Guard against return.** If the old name could come back by copy-paste, add a lint rule or a failing check that names the replacement.

Worked example. `fetchUser(id, callback)` is replaced by `getUser(id): Promise<User>`. The tempting path wraps `fetchUser` around `getUser` and leaves 31 callers alone. Instead:

```text
rg -n "fetchUser\(" src         -> 31 call sites in 12 files
migrate 12 files, 4 commits    -> tsc and tests green after each
delete src/api/fetchUser.ts    -> rg "fetchUser" src returns 0 matches
```

One API remains. An agent reading the code later cannot copy the old pattern because it no longer exists.

## Smells

- A function marked deprecated in a comment that still has internal callers.
- An adapter whose only job is to translate the old signature into the new one.
- "We will migrate the rest later" with no list and no owner.
- New code that calls the old API because it was the nearest example.
- Tests that only pass because they mock the old API's internals.

## Check

Answer yes or no: after this change, does a search for the old API's name across the repository return zero callers and zero definitions, with tests asserting the new contract? Yes means the principle held.

Related: `core/principles/outcome-oriented-execution.md`, `core/principles/subtract-before-you-add.md`, `core/principles/sequence-verifiable-units.md`.

## Source

- `skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
