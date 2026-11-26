---
name: investigation
title: Investigation
summary: A read-only, cited answer to a question about the code, a recommendation between options, or a code or security review of a diff.
skills: [how, why, teach, context-tools, code-review, security-review, blast-radius, unslop]
principles: [prove-it-works, fix-root-causes, attack-the-premise, minimize-reader-load, explain-the-number, test-behavior-not-implementation, guard-the-context-window]
---

# Investigation

## When to use

Use this playbook when the deliverable is understanding, not a code change. You own the answer. Four modes share it:

- **Explanation.** How does X work, where is Y, why is Z shaped this way, what happens when W.
- **Decision.** Which of these options should we take, and why.
- **Code review.** Review a diff, a branch, or a PR for defects, contract breaks, and missing tests.
- **Security review.** Audit a change or a surface for vulnerabilities, secret exposure, and broken trust boundaries.

Every mode is read-only. If the user asks to fix what you find, that is a new task with a new header (`core/playbooks/bug-fix.md`, `core/playbooks/feature.md`, or `core/playbooks/refactoring.md`).

## Done Predicate

The reply answers the stated question with every claim backed by a `file:line`, commit, or command-output pointer that was read or run in this session, and no source file changed.

Template by mode:

- Explanation: the five-part output below, each section citing where the code lives. Unverified claims are labeled inferred.
- Decision: a recommendation plus a tradeoffs table whose rows come from traced code or a run, not from memory.
- Code review: findings ranked by severity, each with `file:line`, the failure scenario, and the command or reading that confirms it. An empty list is a valid result and says what was checked.
- Security review: a report following `core/templates/security-review.md.template`, each finding with severity, location, exploit path, and the evidence.
- `git status --porcelain` shows no source change made by the investigation. The only writes are rows in `.poteto/decisions.tsv` and, for a security review, the report file.

## Steps

1. Restate the question in one sentence and pick the mode (explanation, decision, code review, or security review); state that this task changes no code.
2. Trace the code the question touches with `core/skills/how/SKILL.md`; add `core/skills/why/SKILL.md` for motivation questions, `core/skills/teach/SKILL.md` for a walk-through, and `core/skills/context-tools/SKILL.md` when the project has a code graph or docs lookup.
3. For code review, load `core/skills/code-review/SKILL.md` and read the exact diff from `git diff <base>...HEAD` plus its callers, contracts, and tests.
4. For security review, load `core/skills/security-review/SKILL.md`, map the trust boundaries the change touches, and fill `core/templates/security-review.md.template` as you go.
5. For either review mode, run `core/skills/blast-radius/SKILL.md` on the changed symbols to list what the change can break beyond its diff.
6. Back every claim with a pointer (`file:line`, commit, command output) and rerun a command to confirm each reported defect; label anything you could not confirm as inferred or drop it.
7. Check the premise of the question; if the code shows it is wrong, say so with the evidence instead of answering the question as asked.
8. Write the output for the mode, apply `core/skills/unslop/SKILL.md`, and log it with `scripts/log-decision.mjs` as phase `investigation` with the key pointers as evidence.
9. If the findings call for a code change, stop and propose the follow-up task with its own header and playbook instead of editing here.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the global harness home (for example `~/.poteto-harness/`) when only a global install exists, the repository root here. Run them as `node "<harness-home>/scripts/<name>.mjs"` from the project root, so `.poteto/decisions.tsv` lands in the project.

**Step 1.** A question that hides a fix request ("why is checkout broken, and fix it") is two tasks. Run this one first, then re-route. Keep the restated question in view; it is what the reply must answer.

**Step 2.** Trace runtime flow, key types, and the non-obvious parts. Read only what the question needs (`core/principles/guard-the-context-window.md`). If your harness can spawn subagents, send broad searches to one and keep its summary. `core/skills/why/SKILL.md` answers from the record (commits, PR discussion, issues) and says plainly when the record is silent; "nobody wrote down why" is an answer.

**Step 3.** Review the diff that exists, not the one described. Check each changed function's callers, the contracts it promises (types, API shapes, persisted formats), and whether a test would fail if the change regressed (`core/principles/test-behavior-not-implementation.md`). Skip style nits unless the project's lint rules make them defects. Findings need a failure scenario: concrete input or state leading to a wrong output or crash.

**Step 4.** Cover input validation at boundaries, authentication and authorization paths, injection sinks, secret handling, dependency risk, and what the change exposes. A finding without an exploit path is a hardening note, not a vulnerability. Never run an exploit against a system you do not own; prove it with a local test or a code path trace.

**Step 5.** Blast radius turns "the diff looks fine" into a list of callers and consumers with a verdict for each. A change that is correct locally but breaks a caller is a finding.

**Step 6.** This is `core/principles/prove-it-works.md` applied to claims. For a number, find what limits it before reporting it (`core/principles/explain-the-number.md`). For a defect, the confirming command or the exact reading goes in the finding.

**Step 7.** `core/principles/attack-the-premise.md`. "Why does the cache miss on login?" may have the answer "it does not; the slow call is the token refresh". Push back with evidence.

**Step 8.** Output shapes:

- Explanation: Overview, Key Concepts, How It Works, Where Things Live, Gotchas. Keep it as short as the question allows (`core/principles/minimize-reader-load.md`).
- Decision: the recommendation first, then a tradeoffs table (option, what it costs, what it buys, evidence), then what would change the call.
- Code review: findings most severe first; then what was checked and found clean.
- Security review: the filled template, findings most severe first.

Log example: `node scripts/log-decision.mjs investigation "recommend option B for retry policy" "A double-sends on timeout" "src/queue/retry.ts:41; test run of retry.spec" "answered"`.

**Step 9.** If the root cause is now known, the follow-up is `core/playbooks/bug-fix.md` and it starts from your evidence (`core/principles/fix-root-causes.md`). Do not slip a "small fix" into a read-only task.

## Reply

The output for the mode. For "are we sure?" questions, give your real judgment with reasons. Push back if the premise is wrong. End with the follow-up task and its playbook when a change is warranted.

## Source

Adapted from `skills/poteto-mode/playbooks/investigation.md` and `docs/guide/03-understand.md` in pstack by Lauren Tan (cursor/plugins, MIT). Review modes adapted from `docs/prompts/03-multi-agent-code-review.md` and `docs/prompts/13-security-review.md` in Vibe Coding Toolkit by Matheus Gomes (MIT).
