---
name: prove-it-works
title: Prove It Works
group: Verification
applies_when: Before declaring done. Verify against the real artifact on the real surface, not a proxy.
---

# Prove It Works

## Rule

Verify every output by checking the real thing directly: run the feature, read the actual value, inspect the diff. Proxies do not count. "It compiles", "the tests pass", a file timestamp, cached output, and a subagent's self-report are evidence that something ran, not that it works.

## When it applies

- Before writing "done", "fixed", or "works" in any reply.
- Before checking off the Done Predicate of a playbook.
- After a subagent, script, or tool reports success.
- When a check fails and the cause is not yet clear.

## How to apply

1. **Name the real artifact and surface.** The page a user opens, the endpoint a client calls, the file a downstream tool reads, the row in the database. Write it into the Done Predicate before starting.
2. **Exercise it the way a user would.** Start the app and hit the route. Run the CLI with real arguments. Read the written record back. For a project with `.gifisi/feature-map.json`, run `node scripts/verify-feature-map.mjs` and read each feature's PASS or FAIL against the live surface.
3. **Compare against the expected value, not against "no error".** Print the actual value next to the expected one.
4. **Script the check when you can.** A deterministic command that reruns the comparison beats a one-time look. A reviewer can rerun it.
5. **Suspect the observation first.** When a check fails, confirm you looked at the right process, port, build, file, and environment before changing the system.
6. **Record the evidence.** Put the command and its output in the reply. Log the result with `node scripts/log-decision.mjs verify "<what>" "<why>" "<command and output>" pass` so `.gifisi/decisions.tsv` keeps the trail. Load `core/skills/show-me-your-work/SKILL.md` when the reader needs the full trace.

Worked example. A fix makes the cart total include tax. The unit test passes. That proves the helper, not the page:

```text
node --test test/                          -> 14 pass, 0 fail   (proxy)
curl -s localhost:3000/api/cart/total      -> {"total":108.00}  (real surface)
expected: 100.00 subtotal + 8% tax         -> 108.00            (match)
node scripts/verify-feature-map.mjs        -> cart-total PASS
```

Only the last three lines prove the user-facing result. If the curl had returned 100.00, the next step would be to check that the server was restarted on the new build, before touching the code again.

## Smells

- "Should work now" with no command output in the reply.
- A green type check or build offered as proof of behavior.
- Trusting a subagent's "all tests pass" without rerunning the command.
- Verifying against a dev server that never reloaded the change.
- Reading the source to confirm a value instead of reading the value.

## Check

Answer yes or no: does the reply include output from a command or observation on the real artifact, on the surface a user or caller touches, that matches the Done Predicate's expected value? Yes means the principle held.

Related: `core/principles/explain-the-number.md`, `core/principles/sequence-verifiable-units.md`, `core/skills/create-verification-skill/SKILL.md`.

## Source

- `skills/principle-prove-it-works/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
- "Separate file present, configured, and integration tested" working agreement from `README.pt-BR.md` of Vibe Coding Toolkit (soumatheusgomes/vibe-coding-toolkit, Matheus Gomes), MIT.
