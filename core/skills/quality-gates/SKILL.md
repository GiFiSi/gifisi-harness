---
name: quality-gates
description: Install and run code-quality gates. ESLint flat config with a 350-line max-lines ceiling and local quality rules, a self-check for those rules, a dependency-free fallback gate, measured severities, warning burndown and a ratchet that only tightens. Load for lint setup, oversized files, or warning cleanup.
origin: vibe-coding-toolkit
---

# Quality gates

A gate is only useful if it starts green and only gets stricter. This skill copies tested rule files instead of writing rules on the fly, measures existing violations before choosing severities, and ratchets the baseline down as code improves. Fixing violations is separate work; installing and measuring the gate is this skill's job.

## When to use

- A JavaScript or TypeScript project has no lint gate, or one without a file-size ceiling.
- Files exceed 350 lines, warnings have piled up, or a reviewer keeps flagging the same pattern.
- A correction keeps recurring and should become a lint rule per `core/skills/correct/SKILL.md` and `core/principles/encode-lessons-in-structure.md`.
- The harness installer never touches lint configs, so adopting gates in a project always goes through this skill.
- Projects without JavaScript use their native linter; do not install ESLint only to satisfy a checklist.

## Files

| Harness template | Project destination | Role |
|---|---|---|
| `core/templates/eslint/eslint.config.mjs` | `<project>/eslint.config.mjs` | Flat config: recommended presets, the 350-line ceiling, local `quality/*` rules, test-file overrides, global ignores |
| `core/templates/eslint/eslint-rules/index.cjs` | `<project>/eslint-rules/index.cjs` | Local plugin: file-size ceiling that exempts pure re-export barrels and gives tests their own budget, a ban on direct `console` outside the log adapter, a ban on presentation code importing the data client |
| `core/templates/eslint/verify-quality-rules.mjs` | `<project>/scripts/verify-quality-rules.mjs` | Self-check that runs ESLint's RuleTester against the copied rules |
| `scripts/quality-gate.mjs` | `.poteto/scripts/quality-gate.mjs` (installed) | Zero-dependency gate: counts non-blank, non-comment lines per source file against 350 and flags `debugger` |

Read `core/templates/eslint/eslint-rules/index.cjs` before wiring it and use the rule ids it actually exports.

## Procedure

1. Read the project first. Record package manager, ESLint version, existing config file and its rules, TypeScript and path aliases, source root, presentation directories, the module that exports the data client and its binding name, and the log adapter. Read `.poteto/project.json` for detected commands. ESLint 8 or older cannot load a flat config with `defineConfig`; stop and report that instead of upgrading silently.
2. Run the fallback gate for an immediate baseline that needs no install: `node .poteto/scripts/quality-gate.mjs --root .` in a project install; with only a global install, `node "<global-harness-home>/scripts/quality-gate.mjs" --root .`; inside the harness repo, `node scripts/quality-gate.mjs --root <project>`. Record `files`, `violations` and `largest`.
3. Copy, do not rewrite. Place the three templates at their destinations. Copy the rule file byte for byte: no reformatting, no ESM conversion, no edits to rule logic. If an `eslint.config.mjs` already exists, merge the `quality` plugin and its rules into it and keep every existing rule and severity.
4. Install dev dependencies with the project's package manager, pinned to matching majors: `eslint@^9 @eslint/js@^9`, plus `typescript-eslint` for TypeScript and `globals` if the config imports it. Never use `--force` to hide a peer conflict.
5. Adapt the config to the real project: `files` globs for the actual source root; `max` set to 350; the data-boundary rule's modules, binding and presentation layers set to what step 1 found, or the rule removed when there is no data module; the console exception pointed at the real log adapter, or removed; build output directories in the global ignores. A block that turns a rule off must come after the block that turns it on, or flat config silently overrides it.
6. Prove the copy works: run the project's own copy, `<project>/scripts/verify-quality-rules.mjs`, with `node scripts/verify-quality-rules.mjs` from the project root (this `scripts/` is the project's folder, not the harness home's). It must exit 0. Its last line also reports `config=`: `PASS` means a JSX sample was linted through the project's `eslint.config.*` and parsed; `FAIL` means the config cannot load or cannot parse JSX; `SKIP` means no config exists or no `.jsx` path matches its `files` globs, which is acceptable only when the project has no JSX. A broken copy makes every later count meaningless.
7. Wire scripts without removing existing ones: `lint` (`eslint .`), `lint:fix` (`eslint . --fix`), `lint:rules` (the self-check). Keep any existing typed lint tier separate from the fast lint.
8. Measure per rule. Run the lint command with full output (no summarizing wrapper) and count violations per new rule. Zero violations: the rule is `error`. Any violations: set it to `warn` and write the count beside it as the baseline, for example `// baseline 2026-11-26: 11 files over 350 lines`. Preserve the severity of every pre-existing rule.
9. Log the baseline (with only a global install, run `log-decision.mjs` from the global harness home): `node .poteto/scripts/log-decision.mjs baseline "max-lines at warn" "11 legacy files exceed 350" "npm run lint" "11 warnings, 0 errors"` (use the real counts).
10. Burn down in batches when asked. List files over the ceiling largest first from a fresh run. Take a small batch. Split each file on a real responsibility seam (logic out of a route, repeated UI into a component, data access into an adapter, one-concept helpers into a named module) per `core/playbooks/refactoring.md`. Keep the old module's public exports, re-exporting from the new modules if needed. After each file run typecheck, tests and lint, and confirm no new violation appeared elsewhere. A file with no natural seam is reported, not chopped at an arbitrary line.
11. Ratchet. When a rule's count drops, lower the recorded baseline in the same change. When it reaches zero, flip the rule back to `error`. If the project uses `--max-warnings`, lower it to the new count. A baseline only moves down.

## Guardrails

- Never raise the 350 ceiling, add broad ignores, add generic disable comments, or delete tests to make a gate pass.
- Loosening or re-scoping a rule is a config change. Say so in the change description; never present it as cleaner code.
- Do not fix violations while installing the gate. Installation and burndown are separate changes with separate reviews.
- Do not add Git hooks to run the gate.

## Output

- Rules installed, rules removed and why, and the self-check result.
- Violation count per rule with its severity and baseline comment.
- Files over 350 lines, largest first, from both the ESLint run and the fallback gate.
- The exact commands to run the gate and the self-check, and the decision rows logged.

## Source

- `docs/prompts/08-eslint-quality-gates-install.md`, `docs/prompts/07-eslint-complete-setup.md`, `docs/prompts/09-file-size-refactor.md` and `docs/prompts/02-eslint-warning-burndown.md`, Vibe Coding Toolkit by Matheus Gomes (MIT).
- `docs/tools/06-eslint-biome-quality-gates.md`, `templates/eslint/eslint.config.mjs.example`, `templates/eslint/eslint-rules/` and `templates/eslint/verify.mjs`, Vibe Coding Toolkit by Matheus Gomes (MIT).
