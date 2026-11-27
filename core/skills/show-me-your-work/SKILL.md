---
name: show-me-your-work
description: Keep the reviewable decision trail in .gifisi/decisions.tsv (ts phase decision why evidence result), appended with scripts/log-decision.mjs. Owns start rows, the append-only supersede rule, the end-of-run audit of the log against what happened, and the closing Attention section from an independent reviewer. Load for any non-trivial, long, or unattended run.
origin: pstack
---

# Show me your work

Keep one decision trail per project, so a human who stepped away can trust the result by reading rows and following evidence instead of rereading the whole run.

Other skills and playbooks route their audit trail here. They name this skill and let it own the format. They do not restate the columns.

## When to use

- Every non-trivial task. The router requires the signal header row and rows for forks, verifications, and reverts.
- Autonomous, autopilot, multi-phase, and overnight runs, and work a human reviews later.
- Pausing and picking up work, where the log tells the next run what already happened.
- The user asks "what did you do", "catch me up", or "show me your work". Answer from the log, then the audit and the Attention section.

## The format

One TSV file, `.gifisi/decisions.tsv` in the project root. One row per decision. Cells stay on one line. Evidence is a pointer, never prose. The header row is in `core/templates/gifisi/decisions.tsv` and the installer creates the file.

Columns, in order:

- `ts`. UTC timestamp `YYYY-MM-DDTHH:MM:SSZ`, stamped by the script.
- `phase`. One name from the phase vocabulary below. A plan's own unit or workstream goes in `decision`, not here.
- `decision`. What was chosen or done, in one line.
- `why`. The reason in plain words. If a principle drove it, say the reason, not a tag.
- `evidence`. A pointer that proves it: a commit SHA, PR number, `file:line`, a command, or an artifact, trace, or screenshot path.
- `result`. The outcome or predicate state: `tests green`, `reverted`, `pixel-diff 0`, `INCONCLUSIVE`, `open`.

Example, written the way you would tell a teammate:

```
ts	phase	decision	why	evidence	result
2026-11-26T09:02:00Z	signal	Bug fix, playbook bug-fix	cart total returns "0105" for items 10,5	node .gifisi/scripts/classify-task.mjs	route matched
2026-11-26T09:05:00Z	reproduce	ran the cart-total live check before changing code	confirm the bug on the real server	.gifisi/feature-map.json cart-total	FAIL, got "0105"
2026-11-26T09:12:00Z	failing-test	added test for numeric totals	pin the behavior before the fix	test/cart-total.test.mjs	fails as expected
2026-11-26T09:20:00Z	fix	parse prices to numbers at the request boundary	strings reached the sum, root cause is the missing parse	src/cart.mjs:12	tests green, live check PASS
2026-11-26T09:40:00Z	verify	threw out a helper's summary that claimed the UI was fixed	its screenshot was blank	shots/cart.png	superseded by the next row
```

## Phase vocabulary

One act, one phase name, so `core/playbooks/session-pickup.md` can map each playbook step to its rows. Playbooks and skills log only these names. Rename nothing in old rows; new rows use this list.

| Phase | Act | Logged by |
|---|---|---|
| `signal` | The task header: task type, playbook, Done Predicate | Every routed task; autonomous-run step 1, hillclimb step 2 |
| `start` | First row of a new run in a log that already has rows (step 2 below) | This skill only |
| `frame` | The problem as understood: symptom, artifact, scope, chosen frame | `core/skills/figure-it-out/SKILL.md`, runtime-forensics step 1, trace-forensics step 1 |
| `design` | A chosen shape, plan, or variant among alternatives | `core/skills/architect/SKILL.md`, `core/skills/arena/SKILL.md`, feature step 2, multi-phase-plan step 10, prototype step 7 |
| `baseline` | The before state, measured | refactoring step 1, hillclimb step 4, perf-issue step 2, worktree-cleanup step 3, an approved visual-parity baseline change, `core/skills/quality-gates/SKILL.md` |
| `pin` | A characterization capture of current behavior | refactoring step 2 |
| `reproduce` | The bug observed on the user's surface | bug-fix step 1 |
| `root-cause` | The first wrong state, or the proven mechanism | bug-fix step 3, runtime-forensics steps 5 and 7, trace-forensics step 7 |
| `failing-test` | A new test observed failing for the stated reason | bug-fix step 4, feature step 5, `core/skills/tdd/SKILL.md` |
| `fix` | A change that corrects wrong behavior | bug-fix step 5, babysit step 7 |
| `implement` | A change that adds behavior | feature step 6 |
| `refactor` | A behavior-preserving move | refactoring step 6 |
| `attempt-N` | One measured or iterated change, kept or reverted, N counting from 1 | hillclimb step 7, perf-issue step 6, autonomous-run step 5 |
| `verify` | A check run on the real artifact, with its result | bug-fix step 6, feature step 7, refactoring step 7, hillclimb step 9, perf-issue step 8, visual-parity step 6, authoring-a-skill step 7, babysit reruns, `core/skills/tdd/SKILL.md`, `core/skills/blast-radius/SKILL.md`, `core/skills/benchmark-checklist/SKILL.md`, `core/skills/swarm/SKILL.md`, the verification skills |
| `review` | A review verdict: code, security, adversarial, eval, or a dismissed review comment | `core/skills/code-review/SKILL.md`, `core/skills/security-review/SKILL.md`, `core/skills/interrogate/SKILL.md`, eval step 8, babysit step 7 |
| `correction` | A correction-ladder fix at tier 1, 2, or 3 | `core/skills/correct/SKILL.md`, refactoring step 9, `.gifisi/corrections.md` |
| `reflect` | A lesson moved to its destination | `core/skills/reflect/SKILL.md` |
| `revert` | A change undone, with its trigger | Any playbook, outside an `attempt-N` row |
| `blocker` | A dead end or a decision only a human can make | babysit step 7, any unattended run |
| `cleanup` | Resources or dead text removed | worktree-cleanup step 8, `core/skills/no-comments/SKILL.md` |
| `handoff` | A handoff written or resumed from | pause-safely step 7, autonomous-run step 8, session-pickup step 6 |
| `setup` | Machine or project setup and tool installs | `core/skills/machine-setup/SKILL.md`, `core/skills/project-bootstrap/SKILL.md`, `core/skills/project-adoption/SKILL.md` |
| `ship` | A PR opened or merged, with its URL | opening-a-pr step 9, shipping step 8 |
| `investigation` | An answer to a question, with its pointers | investigation step 8 |

## Procedure

1. Append rows only through the script: `node scripts/log-decision.mjs <phase> <decision> <why> <evidence> <result>`. In an installed project run `node .gifisi/scripts/log-decision.mjs ...`. Pass `--log FILE` only for a separate trail. The script stamps `ts`, creates the file and header when missing, turns tabs and newlines into spaces, and prefixes a cell starting with `=`, `+`, `-`, or `@` with a single quote so a spreadsheet does not run it as a formula. A hand-written append must apply the same cleaning.
2. Open the run correctly. A run is one agent conversation, including its later turns and any summary of it. A pickup, a replacement agent, or a new chat is a new run. Before writing, read the last rows of the log. If the log already has rows this run did not write, the run's first row has phase `start`. Its decision names the `ts` range of the earlier rows this run did not write, and its evidence names this run, such as the session or agent id your harness shows. Write another `start` row the first time this run writes after a `start` row from a different run. Use phase `start` for nothing else.
3. Log the signal header as a `signal` row: task type, playbook, and the Done Predicate.
4. Log decision points and checkpoints, not every action: a fork chosen, a unit completed with its verification result, a pivot or revert with its trigger, a blocker found, a gate fixed. In a loop, one row per iteration. Skip the trivial.
5. Write rows in plain words through `core/skills/unslop/SKILL.md`. Prefer evidence produced by committed scripts over one-off commands, per `core/principles/encode-lessons-in-structure.md`.
6. Never edit or delete a row. A wrong call gets a new row that supersedes it, names the `ts` of the row it replaces, and says what actually happened.
7. Audit the log before handing back. Read this run's stretches: each starts at one of this run's `start` rows, or at the first row if this run created the log, and ends at the next `start` row of another run. Compare every row with your conversation history or the transcript your harness exposes for this run. Never read transcripts of other projects or other users.
   - Every row maps to a real decision or action.
   - Every evidence pointer resolves and shows what the row claims. Open the file, run the command, or check the commit.
   - A fork, pivot, or abandoned approach that shaped the work but has no row is a gap. Add a row for it now.
   - Correct the log, not the story. The audit never edits or removes a row. When a row's claim or evidence is wrong, add a superseding row with what happened and a pointer that resolves.
   - Rows outside this run's stretches are not audited. If this run's work shows one is wrong, supersede it like any wrong call.
8. Validate the file: `node scripts/log-decision.mjs --check`. It checks the header, six cells per row, and the timestamp format, prints `rows=N`, and exits 1 on problems. Fix problems by appending, never by rewriting.
9. Get an independent review of the trail. Prefer a subagent on a different model family from the one that did the work, if your harness offers one. Otherwise spawn a fresh-context subagent on the same model. If your harness has no subagents, do a separate pass that rereads only the log and the diff, without your working notes. Self-review in the same context is not a substitute. The reviewer reads the trail and the run's history and flags what the user should look at. It does not redo the work. It looks for:
   - Decisions with weak or missing evidence.
   - Verification steps skipped, or claimed without proof in the history.
   - Choices that look risky in hindsight: premature, scope-creeping, or covering a symptom.
   - Gaps the user would miss on a quick skim.
10. Decide whether to commit the log. It is a working artifact by default. Commit it when the work is large or unattended enough that a reviewer needs the trail to trust the result. The installer does not change `.gitignore`, so follow the project's own choice.

## Reading the trail

Read top to bottom, follow the evidence pointers, spot-check. Git forges render a committed TSV as a table. In a terminal, `column -s "$(printf '\t')" -t .gifisi/decisions.tsv` aligns it.

## Output

- The log path and the `rows=N` line from `--check`.
- A short summary of what the run did, citing rows by `ts`.
- Rows added by the audit, and why.
- Every reply for a run that produced a trail ends with an `Attention` section. Its first line is `reviewed by <reviewer>`: the reviewing model's name as your harness reports it, or `fresh-context review, same model` when no other model was available. Then each flag, pointing at specific rows by `ts` or at specific moments. `No flags` is a valid list. The reviewer line is always present.

## Source

Adapted from pstack `skills/show-me-your-work/SKILL.md`, `skills/show-me-your-work/scripts/log.sh`, `skills/show-me-your-work/references/decision-log-template.tsv`, and `docs/guide/07-overnight.md` (Lauren Tan, cursor/plugins, MIT).
