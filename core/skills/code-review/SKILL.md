---
name: code-review
description: Multi-lens review of an exact, frozen diff plus its callers, contracts and tests. Each lens reports findings with a concrete failure scenario; every finding is verified against the code before it is reported, deduplicated and ranked. Read-only; applies no fixes. Load for code review, review this diff, review my PR, or audit the change.
origin: vibe-coding-toolkit
---

# Code review

One reviewer pass favors whatever that reviewer looks at by default. A security reader misses a broken hook rule; a framework reader misses an injection sink. This skill runs several narrow lenses over the same frozen diff, then keeps only findings that survive verification. Four lenses that each pad the list produce a longer, less reliable report, so synthesis matters as much as the lenses.

The review is read-only. It changes no source file, commits nothing and publishes nothing. Fixes are a separate task with their own header and playbook.

## When to use

- Before merging any non-trivial change: a branch, a PR, a commit range, or uncommitted work.
- After a refactor that moved code between files, where behavior changes hide.
- At the end of each batch of a file-size refactor or lint burndown.
- Not for a security audit of a whole repository. That is `core/skills/security-review/SKILL.md`. A security lens inside this skill only looks at the diff and what it reaches.
- Runs inside `core/playbooks/investigation.md` (code review mode).

## Procedure

1. Freeze the target. Resolve base and head to commit IDs (`git rev-parse <base>` and `git rev-parse HEAD`) and record whether the comparison is merge-base to head (`git diff <base>...HEAD`) or endpoint to endpoint (`git diff <base> HEAD`). For uncommitted work, record staged (`git diff --cached`), unstaged (`git diff`) and relevant untracked files (`git status --porcelain`) as separate layers. Never guess a base branch; if the user did not name one and the default branch is ambiguous, ask once.
2. Read the exact diff that exists, not the one described in a PR body or commit message. List the changed symbols: functions, types, exported names, routes, schemas, config keys.
3. Widen to connected code. For each changed symbol, find its callers, the contracts it promises (types, API shapes, persisted formats, CLI flags, environment variables) and the tests that exercise it. Run `core/skills/blast-radius/SKILL.md` on the changed symbols when the diff touches shared code. Code you could not reach (missing submodule, generated file, binary) is recorded as a limitation, not skipped silently.
4. Pick lenses by risk. Drop any lens the diff does not touch.
   - General quality: correctness, error handling, dead code, readability, missing or weak tests.
   - Security: input validation at boundaries, authorization on every reachable path, injection sinks, secrets, unsafe deserialization, new dependencies with known advisories.
   - Language and types: unsafe casts, escape hatches around the type system, unhandled promises, async ordering, concurrency.
   - Framework: component and hook rules, server and client boundaries, render cost, accessibility. Only when the diff touches framework-facing code.
   - Project rules: the lint rules, `AGENTS.md` agreements and `.gifisi/corrections.md` rows that apply to the changed files.
5. Run the lenses independently. If your harness can spawn subagents, give each lens its own read-only subagent with the frozen diff, the connected-code list and the finding format, and run them in parallel. Otherwise run the lenses one at a time inline and write each lens's findings down before starting the next, so one lens does not steer another. No lens edits files, commits, or starts shared services; checks that need a port, a build directory or a test database run one at a time.
6. Require the finding format: `file:line | severity | one-sentence claim | failure scenario`. The failure scenario is the concrete input or state that produces a wrong output, a crash, a data loss or a broken caller. A claim with no failure scenario is a hunch; drop it.
7. Verify every finding before it goes in the report. Re-read the cited lines in the frozen diff and the connected code. Where a check can be run cheaply, run it: the failing test, a small script that feeds the failing input, the type checker, the linter. Look for counterevidence: upstream validation, a guard in the caller, a test that already covers the case. Drop findings the code refutes. Do not accept a lens's claim on faith in either direction.
8. Deduplicate. Findings that share one root cause collapse into one entry; keep the sharpest wording and note which lenses raised it.
9. Rank: critical (security or data loss, must fix before merge), high (a real bug or a broken contract), medium (maintainability or a missing test for changed behavior), low (style the project's rules make a defect). Style preferences the project does not enforce are not findings.
10. Log the review: `node scripts/log-decision.mjs review "code review <base>..<head>" "<lenses run>" "<diff command; checks run>" "<N findings: C critical, H high>"`.

## Output

One report, most severe first:

- **Target:** base and head IDs, comparison mode, dirty layers included.
- **Findings:** for each, `file:line`, severity, the claim, the failure scenario, the command or reading that confirmed it, and which lenses raised it.
- **Checked and clean:** the lenses run and the connected code they covered.
- **Limitations:** unreviewed scope, checks that could not run and why, residual risks.
- **Follow-up:** when fixes are warranted, the follow-up task and its playbook (`core/playbooks/bug-fix.md` for a defect, `core/playbooks/refactoring.md` for structure). No fix is applied here.

An empty critical and high list is a valid result. Say so plainly, together with what was checked.

## Source

- `docs/prompts/03-multi-agent-code-review.md`, Vibe Coding Toolkit by Matheus Gomes (MIT): lens panel, finding format with failure scenario, dedupe, filter and rank synthesis.
- `docs/prompts/12-existing-project-setup.md` section 10 (review by risk and evidence), Vibe Coding Toolkit by Matheus Gomes (MIT): frozen revision range, callers, contracts and tests, read-only reviewers.
- Verification-before-report adapted from `skills/interrogate/SKILL.md` in pstack by Lauren Tan (cursor/plugins, MIT).
