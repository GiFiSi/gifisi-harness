# Contributing to gifisi-harness

Every file in this repository is loaded by an agent at some point, so every file follows a fixed shape. `node scripts/validate-harness.mjs` enforces the rules below. Run it before you hand back any change.

## Sources of truth

| What | Source | Generated from it |
|---|---|---|
| Canonical lists of playbooks, principles, skills, prompts, templates, scripts | `core/harness/manifest.json` | validator checks |
| Task routes (task type → playbook → skills, plus classifier signals) | `core/harness/routes.json` | router table, `scripts/classify-task.mjs` |
| Router prose | `core/harness/router.md` | `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/gifisi-harness.mdc`, installed copies |

Never edit a generated block by hand. Edit the source, then run `node scripts/sync-harnesses.mjs --repo`.

## Path convention inside harness content

Content in `core/playbooks/`, `core/principles/`, `core/skills/`, and `core/prompts/` refers to other harness files by repo-relative path written in backticks, for example `core/skills/tdd/SKILL.md`, `core/principles/fix-root-causes.md`, `core/playbooks/opening-a-pr.md`, `scripts/log-decision.mjs`, `core/templates/task-handoff.md.template`. The installer copies the tree under one harness home, so these paths stay valid relative to it. Every such path must resolve to a real file.

A path that only exists in a target project, not in this repository, starts with `<project>/`, for example `<project>/scripts/verify-quality-rules.mjs`. The validator skips paths that contain `<`.

Project artifacts are written with their `.gifisi/` prefix: `.gifisi/decisions.tsv`, `.gifisi/feature-map.json`, `.gifisi/project.json`, `.gifisi/corrections.md`.

## Changing routes and signals

The classifier is a ranked keyword match, so it is only as good as its checks. A signal added to fix one prompt is a patch, not a design. Follow this order:

1. Add the prompt that failed, with the route a person would pick, to `core/harness/golden-prompts.json`. Run `node scripts/run-tests.mjs` and watch the golden test fail.
2. Prefer a stem over a list of inflections: a `*` inside a signal matches any letters at that spot, so `renom*` covers renomear, renomeie and renomeia. Portuguese verbs can change stem (trocar, troque), so give each stem its own entry.
3. Add the signal to `core/harness/routes.json` and confirm the golden test and every older test still pass. A signal that fixes one prompt and breaks another is rejected by the same test.
4. Only the user's own words are classified: quoted lines (`> ...`), HTML comments and image references are dropped by `ownText` in `scripts/classify-task.mjs`.

When no route matches, or two routes tie, the gate hook tells the agent the confidence is low so the agent picks the playbook itself and says why, instead of obeying a weak guess.
## Playbook format (`core/playbooks/<name>.md`)

```markdown
---
name: bug-fix
title: Bug fix
summary: One line on what this playbook delivers.
skills: [why, tdd, blast-radius, architect]
principles: [fix-root-causes, prove-it-works, sequence-verifiable-units]
---

# Bug fix

## When to use
## Done Predicate
## Steps
1. One imperative line per step, ready to paste into a todo list.
## Step notes
## Reply
## Source
```

- `name` equals the file name. `skills` and `principles` list only names from `core/harness/manifest.json`.
- `## Steps` is a numbered list of 3 to 12 items, each a single line of at most 320 characters. Detail goes in `## Step notes`, keyed by step number.
- `## Done Predicate` gives the template for this task type's predicate: what artifact, what command or observation.
- `## Source` credits the upstream file the playbook adapts.

## Principle format (`core/principles/<name>.md`)

```markdown
---
name: fix-root-causes
title: Fix Root Causes
group: Verification
applies_when: Debugging. Trace each symptom to the first wrong state and fix it there.
---

# Fix Root Causes

## Rule
## When it applies
## How to apply
## Smells
## Check
## Source
```

`group` is one of `Core`, `Architecture`, `Verification`, `Delegation`, `Meta`. `applies_when` is copied verbatim from the principle's entry in `core/harness/manifest.json`; the router index prints the manifest line, and the validator requires both to match.

## Skill format (`core/skills/<name>/SKILL.md`)

```markdown
---
name: tdd
description: What the skill does and when to load it, in one line.
origin: pstack
---

# TDD

## When to use
## Procedure
1. Numbered steps.
## Output
## Source
```

- `origin` is `pstack`, `vibe-coding-toolkit`, or `gifisi-harness`.
- Supporting files live in `skills/<name>/references/` or `skills/<name>/scripts/`. Every file a skill names must exist.

## Prompts and templates

- Prompt files (`core/prompts/` plus a two-digit number and a kebab-case name, such as `core/prompts/01-machine-setup.md`): a paste-ready prompt for a task that a person starts on purpose. It has `## When to use`, `## Prompt` (one fenced block), and `## Expected result`.
- `core/templates/`: files the installer or a skill copies into a project. Only these tokens are allowed, and only in `core/templates/`: `{{PROJECT_NAME}}`, `{{HARNESS_HOME}}`, `{{PACKAGE_MANAGER}}`, `{{TEST_COMMAND}}`, `{{LINT_COMMAND}}`, `{{BUILD_COMMAND}}`, `{{DEV_COMMAND}}`, `{{DATE}}`. The installer substitutes each of them.

## Harness-agnostic content

Content must work in Claude Code, Codex, and Cursor without slash commands. The validator rejects:

- slash-command invocations such as a slash followed by a skill name; load skills by path instead;
- vendor model slugs and vendor-only agent knobs (subagent type names, vendor plugin names, vendor-only commands);
- unfinished-work markers and filler text.

Describe a capability, not a product: "spawn a subagent if your harness has one, otherwise do the step inline".

## Writing style

Short declarative sentences. Lead with what changes for the reader. Evidence or a label (measured, inferred, guess) for every claim. No filler, no hype. See `core/skills/unslop/SKILL.md`.

## Attribution

Content in `core/playbooks/`, `core/principles/`, `core/skills/`, `core/prompts/` and `docs/` adapted from pstack (Lauren Tan, MIT) or Vibe Coding Toolkit (Matheus Gomes, MIT) names its upstream file in `## Source`. Templates carry no `## Source` section because they are copied into projects as they are; `THIRD_PARTY_NOTICES.md` lists their upstream paths. Both licenses are reproduced in `THIRD_PARTY_NOTICES.md`.
