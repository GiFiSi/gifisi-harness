---
name: laziness-protocol
title: Laziness Protocol
group: Core
applies_when: Refactoring, sizing a diff, or tempted to add a layer. Bias to deletion and the smallest change that solves it.
---

# Laziness Protocol

## Rule

Make the smallest change that solves the problem. Prefer deleting code to adding it. Make each decision once, in one place, and pass the result down as a plain value.

## When it applies

- You are sizing a diff for a bug fix, a feature, or a refactor.
- You feel the urge to add a wrapper, a helper module, an options object, or a new layer "for later".
- The same choice (a feature flag, an environment check, a format rule) is about to appear in a second or third place.
- You are threading a new parameter or signal through several functions that only forward it.

It does not apply to throwaway prototypes, where speed matters more than diff size. See `core/playbooks/prototype.md`.

## How to apply

1. State the problem in one sentence. Every line in the diff must serve that sentence.
2. Look for a deletion first. Ask whether removing code, config, or a branch solves the problem before writing new code.
3. Consolidate repeated decisions. If three call sites each check `process.env.NODE_ENV === "production"`, compute `isProduction` once at startup and pass the boolean.
4. Refuse speculative structure. No interface with one implementation, no generic helper with one caller, no option nobody sets.
5. Count the diff before you finish. If it grew past what the one-sentence problem needs, cut it back.

Worked example. A request asks for a timeout on one HTTP call. The tempting diff adds a `RequestPolicy` class, a retry option, and a config key, about 120 lines. The lazy diff passes `{ signal: AbortSignal.timeout(5000) }` to the one `fetch` call and adds one test, about 10 lines. The second diff solves the stated problem and leaves nothing to maintain.

## Smells

- A new file whose only content is a wrapper around one existing function.
- A parameter that passes unchanged through three functions before anything reads it.
- The same `if` condition, copied, in several modules.
- A diff that touches more files than the problem statement names, with no deletion to justify it.
- Words like "flexible", "future-proof", or "extensible" in your own explanation of a change nobody requested.

## Check

Answer yes or no: could you delete any added line, file, or option and still meet the Done Predicate? If yes, delete it and check again. The principle holds when the answer is no for every addition.

Related: `core/principles/subtract-before-you-add.md`, `core/principles/minimize-reader-load.md`.

## Source

- `skills/principle-laziness-protocol/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
- "Smallest sufficient change" working agreement in `README.pt-BR.md` of Vibe Coding Toolkit (soumatheusgomes/vibe-coding-toolkit, Matheus Gomes), MIT.
