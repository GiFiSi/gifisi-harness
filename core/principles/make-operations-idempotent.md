---
name: make-operations-idempotent
title: Make Operations Idempotent
group: Architecture
applies_when: Commands, lifecycle steps, or loops that face crashes and retries. Converge to the same end state.
---

# Make Operations Idempotent

## Rule

Every state-changing operation converges to the correct end state no matter how many times it runs and no matter where the previous run stopped. Derive each step from the state that exists, not from what an earlier run meant to do.

## When it applies

- Installers, setup scripts, migrations, and sync commands.
- Lifecycle steps: start, stop, deploy, provision, clean up.
- Job loops and queue consumers that can crash mid-item and restart.
- Any command a person or agent might rerun after a failure.
- Writers that append to a file, insert rows, or create resources.

## How to apply

1. **Read, compare, apply the difference.** Read the current state, compare it to the goal, and change only what differs. A second run finds nothing to do.
2. **Mark what you own.** Wrap generated content in managed markers or stable keys, so a rerun replaces its own block instead of adding a second one.
3. **Write atomically.** Write to a temporary path in the same directory, then rename it into place. A crash leaves either the old file or the new one, never half of each.
4. **Make leftovers recognizable.** A lock, temporary file, half-written record, or claimed job must carry enough evidence (owner process id, timestamp, checksum) for the next run to tell that it is stale.
5. **Use natural keys for creation.** Create-if-absent by a stable key, or upsert. Do not generate a new id on every attempt.
6. **Test the rerun.** Run the operation twice and diff the result. Then kill it at each step and run it again.

Worked example. An installer appends a router block to `AGENTS.md`. Run twice, the file holds two copies. The fix wraps the block in markers and replaces between them:

```js
const START = "<!-- gifisi-harness:start -->";
const END = "<!-- gifisi-harness:end -->";
const block = `${START}\n${router}\n${END}`;
const text = existsSync(file) ? readFileSync(file, "utf8") : "";
const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
const next = pattern.test(text) ? text.replace(pattern, block) : `${text.trimEnd()}\n\n${block}\n`;
if (next !== text) { writeFileSync(`${file}.tmp`, next); renameSync(`${file}.tmp`, file); }
```

Run 1 adds the block. Run 2 finds an identical file and writes nothing. A crash between write and rename leaves the original file intact, and the next run overwrites the stale `.tmp`.

## Smells

- "Run this only once" in a README or comment.
- A script that fails on the second run with "already exists".
- `appendFileSync` with no check for what is already there.
- A step that trusts a flag file written by the previous run instead of checking the real state.
- Cleanup code that assumes the previous run finished its setup.
- A retry that creates a duplicate record, charge, or message.

## Check

Answer yes or no: if this operation runs twice in a row, or is killed at any step and run again, does it end in the same state as one clean run, with no duplicates and no manual cleanup? Yes means the principle held.

Related: `core/principles/separate-before-serializing-shared-state.md`, `core/principles/prove-it-works.md`.

## Source

- `skills/principle-make-operations-idempotent/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
