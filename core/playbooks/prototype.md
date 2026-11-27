---
name: prototype
title: Prototype
summary: Answer one open design or approach question with throwaway variants observed side by side, then hand the chosen direction to Feature.
skills: [arena, interrogate, architect]
principles: [exhaust-the-design-space, experience-first, prove-it-works, never-block-on-the-human, foundational-thinking]
---

# Prototype

## When to use

Use this playbook when a decision is open and running something would settle it faster than debating it: which layout, which interaction, which density, which algorithm, which timing, which library approach. You own the design decision, not the code. The prototype is a throwaway instrument; the real build follows `core/playbooks/feature.md`.

This is the one playbook where the usual bar inverts. Speed beats polish, code quality does not matter, and there are no tests. The rigor is in picking the right design cheaply. Propose variants the user did not ask for. Throw an approach away and try another.

## Done Predicate

Each variant was run and observed on the surface the decision is about, the evidence (screenshots, printed output, or timings) is saved under the scratch directory, and a recommendation with a tradeoffs table names the chosen direction.

Template:

- Artifact: the scratch directory outside the source tree with the variants behind one switcher, plus the saved observations.
- Observation: for a visual decision, one screenshot per variant and the interaction driven; for a behavioral decision, the output or timing of each variant from the same command.
- The production source tree is unchanged by the prototype.

## Steps

1. Name the one decision the prototype exists to make; if no decision is open, re-route with a new header to `core/playbooks/feature.md`.
2. When the design space is open, gather prior art and summarize two or three directions for the user to steer; when the direction is set, skip this.
3. Create a scratch directory outside the source tree (the OS temp directory or a gitignored folder) and build with the lightest stack that exercises the question.
4. Build two or three labeled variants behind one switcher (a button, a key, or a CLI flag), including at least one the user did not ask for.
5. Observe every variant on the matching surface: screenshots and a driven interaction for visual decisions, printed output or timings from one command for behavioral ones.
6. When the choice is expensive to reverse, run `core/skills/interrogate/SKILL.md` against the leading variant to try to break it before recommending it.
7. Compare the variants in a tradeoffs table, recommend one, and log the choice as a `design` row with `scripts/log-decision.mjs` citing the scratch path.
8. Hand the chosen direction to `core/playbooks/feature.md` (or `core/skills/architect/SKILL.md` for the shape) and state that the prototype is throwaway.

## Step notes

Script paths are relative to the harness home: `.gifisi/` in an installed project, the global harness home (for example `~/.gifisi-harness/`) when only a global install exists, the repository root here. Run them as `node "<harness-home>/scripts/<name>.mjs"` from the project root, so `.gifisi/decisions.tsv` lands in the project.

**Step 1.** No decision means no prototype. "Build the settings page" is a feature. "Should settings be one long page or tabs?" is a prototype question. Write the decision as a question with the options you know of.

**Step 2.** Gather references only when they change what you build: comparable products, existing patterns in this codebase, published approaches. Show the directions and proceed with the most promising ones if the user does not answer (`core/principles/never-block-on-the-human.md`).

**Step 3.** Keep production source untouched. For a visual decision, plain HTML, CSS, and JavaScript with a small static server is usually enough. For a behavioral or timing decision, the smallest script that exercises the question. No production framework, no abstractions, no tests. Record the scratch path; it is the evidence.

**Step 4.** One switcher makes comparison cheap and fair: same data, same viewport, same inputs (`core/principles/exhaust-the-design-space.md`). When a design is contested or large, `core/skills/arena/SKILL.md` produces independent attempts at the same brief and grafts the best parts. Include a variant that questions the premise of the request.

**Step 5.** The observation is the test. Capture screenshots with whatever browser control your harness has, or ask the user to look when none exists. For timing, run each variant with the same command and inputs and report medians. Judge by what the user would feel, not by implementation convenience (`core/principles/experience-first.md`).

**Step 6.** Adversarial review works on things that run, so aim it at the leading variant, not at an abstract description.

**Step 7.** The table rows are the variants. Columns: what the user experiences, what it costs to build properly, risks, and the evidence path. Log example: `node scripts/log-decision.mjs design "tabs over single page for settings" "users scan 40+ options" "<scratch>/settings/screens/*.png" "recommended B"`.

**Step 8.** The real build starts from the decision and the evidence, not from the prototype code. Settle the real types and boundaries before writing production code (`core/principles/foundational-thinking.md`). Leave the scratch directory in place until the user has seen it; it is safe to delete afterwards.

## Reply

The decision, the variants explored, the evidence for each (screenshot paths, observed output, or timings), the tradeoffs table, your recommendation, and the scratch path. Say plainly that the prototype is throwaway.

## Source

Adapted from `skills/poteto-mode/playbooks/prototype.md` and `docs/guide/04-design.md` in pstack by Lauren Tan (cursor/plugins, MIT).
