# Prompts

The router classifies ordinary requests on its own, so you never need these to get work done. A prompt here is for a task a person starts on purpose and wants run the same way every time: setting up a machine, starting or adopting a project, a review, a refactor batch, a lint burndown. Each one is paste-ready. Copy its `## Prompt` block into the agent conversation (not the terminal), then add the input its `## When to use` section asks for, if any.

Every prompt makes the agent follow the router: print the `[POTETO-HARNESS]` header, open the named playbook and copy its steps into the todo list, load skills by path when a step needs them, and log to `.poteto/decisions.tsv`. Prompts refer to the installed harness generically: `.poteto/` in a project install, `~/.poteto-harness/` in a global install.

## Catalog

| Prompt | Purpose | Task type | Playbook | Skills loaded |
|---|---|---|---|---|
| [01 Machine setup](01-machine-setup.md) | Inventory, propose, then install and verify a development baseline on one machine | Machine setup | Multi-phase plan | machine-setup, context-tools |
| [02 New Next.js project](02-new-next-project.md) | `PRODUCT.md` first, then a Next.js TypeScript foundation with the harness, docs and quality gate | New project | Multi-phase plan | project-bootstrap, quality-gates, context-tools |
| [03 Existing project adoption](03-existing-project-adoption.md) | Baseline, coverage matrix, harness install and verified improvements in a brownfield repo | Project adoption | Multi-phase plan | project-adoption, quality-gates, context-tools |
| [04 Code review](04-code-review.md) | Multi-lens, read-only review of a frozen diff with verified findings | Code review | Investigation | code-review, blast-radius |
| [05 Security review](05-security-review.md) | Read-only repository or diff security review with a private redacted report | Security review | Investigation | security-review, blast-radius |
| [06 File size refactor](06-file-size-refactor.md) | Split files over 350 lines by responsibility, one commit per file, behavior pinned | Refactoring | Refactoring | architect, blast-radius, no-comments |
| [07 Quality gates install](07-quality-gates-install.md) | Copy the ESLint gate, self-check it, and measure per-rule baselines without fixing anything | Quality gates | Refactoring | quality-gates, correct |
| [08 Brainstorm to plan](08-brainstorm-to-plan.md) | Clarify a vague request, write a plan with a check per unit, stop for go | Multi-phase plan | Multi-phase plan | interrogate, architect, figure-it-out |
| [09 Lint warning burndown](09-lint-warning-burndown.md) | Decision gate, file-disjoint waves and a rerun-only final checklist for lint warnings | Quality gates | Refactoring | quality-gates, blast-radius, correct |

## Order of use

- New machine: 01, then 02 for a new application or 03 for an existing one.
- Quality: 07 installs and measures; 06 splits oversized files; 09 clears the rest of the warnings.
- Before a merge: 04, and 05 when the change touches authentication, authorization, input handling, secrets or dependencies.
- An unclear request of any size: 08.

## Rules every prompt keeps

- No prompt grants extra authority. Installs outside the project, publishing, pushing, outbound messages, paid services and destructive actions still need your explicit OK.
- Review prompts (04, 05) are read-only. Fixes become a new task with its own header and playbook.
- Every number in a report comes from a command run in that session.

## Source

- `docs/prompts/README.md`, Vibe Coding Toolkit by Matheus Gomes (MIT): catalog layout and prompt selection. Prompts 01 to 09 adapt upstream prompts 10, 11, 12, 03, 13, 09, 08, 04 and 02 respectively.
