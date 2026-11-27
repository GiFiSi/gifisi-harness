---
name: authoring-a-skill
title: Authoring a skill
summary: Write or edit a skill or playbook so every line changes a decision, every path resolves, and the validator plus one real run prove it works.
skills: [technical-writing, unslop, sharpen, no-comments]
principles: [encode-lessons-in-structure, laziness-protocol, guard-the-context-window, build-the-lever]
---

# Authoring a skill

You own the skill's voice. A skill is loaded into an agent's context on demand, so every line costs tokens on every load. Keep only prose that changes a decision.

## When to use

- The user asks for a new skill, or to change an existing skill, playbook, principle, or prompt file.
- A workflow keeps recurring and is not captured anywhere: propose a skill for it.
- A correction keeps recurring and `core/skills/correct/SKILL.md` placed it at the text tier: the text belongs in a skill or in `.gifisi/corrections.md`.
- Not for agent instructions that a lint, test, or type could enforce. Encode those as checks instead (`core/principles/encode-lessons-in-structure.md`).

## Done Predicate

The validator for the repository that holds the skill exits 0 with the new or edited file in place, and one real run of the skill produced the output its `## Output` section promises.

Template for the signal header:

```
Done Predicate: node scripts/validate-harness.mjs exits 0 with core/skills/<name>/SKILL.md present; one run on <real task> produced <the promised output>.
```

For a skill that lives in a target project instead of this harness, replace the validator with the project's own checks plus a check that every path the skill names exists.

## Steps

1. Name the decision the skill changes and the prompt that should load it; if an existing skill or playbook already covers it, edit that file instead of adding one.
2. Write the file in the format from `docs/CONTRIBUTING.md` in the gifisi-harness repository: frontmatter `name`, a one-line `description`, `origin`, then When to use, Procedure, Output, and Source.
3. Cut every line that changes no decision with `core/skills/unslop/SKILL.md` and `core/skills/sharpen/SKILL.md`, and point at structural sources (types, config, scripts) instead of restating them.
4. Put supporting files under the skill's own `references/` or `scripts/` folder and make every path the skill names resolve.
5. Register a new harness skill in `core/harness/manifest.json`, add a route to `core/harness/routes.json` if prompts should reach it, and run `node scripts/sync-harnesses.mjs --repo`.
6. Run `node scripts/validate-harness.mjs` and fix every problem in your files until it exits 0.
7. Run the skill once on a real task, compare the result with its Output section, and log phase `verify` with `node scripts/log-decision.mjs`.
8. Run `core/playbooks/opening-a-pr.md`.

## Step notes

Script paths are relative to the harness home: `.gifisi/` in an installed project, the global harness home (for example `~/.gifisi-harness/`) when only a global install exists, the repository root here. Run them as `node "<harness-home>/scripts/<name>.mjs"` from the project root, so `.gifisi/decisions.tsv` lands in the project.

**Step 1.** One skill, one job. Write the trigger as the words a user would type, because the router and `node scripts/classify-task.mjs` match on them. A skill nobody's prompt would reach is dead weight.

**Step 2.** Tell the agent to do the thing; skip the reason unless the rule is confusing without one. Number the procedure steps. Delegate to other skills by path (for example `core/skills/tdd/SKILL.md`) rather than restating them. Never write an invocation as a slash followed by a name; the harness has no slash commands. Describe capabilities generically: "if your harness can spawn subagents, delegate X; otherwise do it inline". Name no vendor models or vendor-only tools. Content adapted from upstream credits its source in `## Source`.

**Step 3.** Apply `core/skills/technical-writing/SKILL.md` for structure: lead with what changes for the reader, short declarative sentences, a label (measured, inferred, guess) for claims. When in doubt, delete. Match tone to scope: a narrow skill gets a short file. Code examples inside a skill follow `core/skills/no-comments/SKILL.md`.

**Step 4.** Every file a skill names must exist. Scripts are Node 18 ESM with zero npm dependencies, at most 350 lines, and work on Windows and POSIX. A script that does the work beats prose that describes it (`core/principles/build-the-lever.md`).

**Step 5.** The manifest is the canonical list; the validator rejects a skill folder that the manifest does not name. Routes hold the classifier signals and the playbook each task type loads. Never edit generated router blocks in `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules/gifisi-harness.mdc` by hand.

**Step 6.** The validator checks frontmatter, required sections, path references, slash invocations, vendor terms, unfinished-work markers, and the router line budget. Do not weaken a check to make it pass; fix the content.

**Step 7.** Skip the run only for a purely subjective skill (tone, style), and say so. For a structural skill (fixed procedure, scripts, a promised artifact), the run is the proof. If the run shows the agent misreading a step, rewrite the step and run again. Keep the skill small enough to load without crowding the task (`core/principles/guard-the-context-window.md`).

## Reply

- What the skill does and the prompt that loads it.
- Key design decisions: what you cut, what you pointed at instead of restating.
- Validation: validator output and the result of the real run.

## Source

- `skills/poteto-mode/playbooks/authoring-a-skill.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- Skill hygiene rules from `README.pt-BR.md` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
