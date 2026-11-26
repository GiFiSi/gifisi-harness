---
name: eval
title: Eval
summary: Measure whether a variant (skill, prompt, playbook, model setting) changes agent behavior, with blinded candidates, a blinded judge, and evidence read from what candidates actually did.
skills: [benchmark-checklist, create-verification-skill, arena]
principles: [explain-the-number, prove-it-works, test-behavior-not-implementation, guard-the-context-window]
---

# Eval

You own the experiment design: plan, blind, run, synthesize. The result is a recommendation backed by outputs you read yourself, not a score you trust blind.

## When to use

- The user wants to know whether a change to a skill, playbook, prompt, router rule, or agent setting improves behavior.
- Two variants need a fair comparison, or a golden set needs grading.
- Not for measuring code speed (use `core/playbooks/perf-issue.md`) or pushing a known metric up over many iterations (use `core/playbooks/hillclimb.md`).

Blinding rules, all mandatory:
- No word in any directory, file, or prompt the candidate sees that reveals the experiment: eval, test, judge, experiment, rubric, score, compare, benchmark, candidate, arena.
- The candidate prompt reads like an organic user request. State the goal, not the meta.
- No cues that elicit the chain: do not ask candidates to list the skills, principles, or files they applied.
- Directory and slug names are project-shaped names a user might pick.
- Candidates are not told other candidates exist.
- The judge knows it is judging but sees outputs only by sanitized label, never by model or variant name.
- Comparing two variants: one judge scores both sets in a single pass on one scale, blind to which set each came from.

## Done Predicate

A synthesis exists that cites each candidate's actual output, the blinded judge's scores on the rubric frozen before the run, and your own read of every output, and it ends in a promote, reject, or rerun recommendation.

Template for the signal header:

```
Done Predicate: <N> candidates per variant ran the same organic prompt; the blinded judge scored all outputs on the frozen <K>-criterion rubric; the synthesis recommends promote, reject, or rerun with evidence per criterion.
```

## Steps

1. Frame the experiment: name the variant under test, the behavior that counts as success, and a 3-6 criterion rubric that only the judge will see.
2. Build one sanitized working directory per candidate with the variant in place and the context an organic task would have, using project-shaped names.
3. Write one organic prompt a user would type, stating the goal without experiment words or cues to list applied skills.
4. Run N candidates in parallel per `core/skills/arena/SKILL.md`, each in its own directory with the same prompt, on different models when your harness allows.
5. Have one blinded judge score every output by sanitized label against the rubric in one pass, on a different model family when available.
6. Grade chain-following from evidence: the files each candidate actually opened and the shape of its code, never its self-report.
7. Read every candidate output yourself end to end, compare with the judge, and vet any numeric result with `core/skills/benchmark-checklist/SKILL.md`.
8. Log the rubric, verdict, and recommendation with `node scripts/log-decision.mjs` (phase `review`), then recommend promote, reject, or rerun.

## Step notes

**Step 1.** Each criterion is concrete and observable in the output: "the fix adds a failing test before the code change", not "good engineering". Freeze the rubric before any candidate runs; a rubric edited after seeing outputs measures the outputs, not the variant.

**Step 2.** Plant what a real task would have: a project skeleton, the harness files the candidate would naturally read, the bug or feature request. Use names like `invoice-service`, never names that mention the experiment. If the behavior under test touches a running app, give each directory a `.poteto/feature-map.json` (see `core/skills/create-verification-skill/SKILL.md`) so the grader can run `node scripts/verify-feature-map.mjs --root <dir>` instead of judging by eye.

**Step 3.** Write it the way the user would type it, including their usual terseness. Hold back anything that hints at what is measured.

**Step 4.** If your harness can spawn subagents or separate sessions, run each candidate as one and give each only its own directory. Without that, run candidates one after another in fresh sessions; never let one candidate see another's output. Pick N so the result can separate signal from noise; three per variant is the floor for a behavior claim. An agent that only dispatches, polls, or packs results can run at a lower reasoning level than the candidates.

**Step 5.** The judge sees the rubric and the outputs under labels like A, B, C. It does not see model names, variant names, or your hypothesis.

**Step 6.** If your harness keeps session logs, read only the logs for this run's candidates; never read logs or chats from unrelated projects or workspaces. Check which files each candidate opened and what it ran. When logs are unavailable, grade from the code shape and the commands in the output, and say in the synthesis that file access was not observed.

**Step 7.** Disagreement between your read and the judge means a biased model or an ambiguous rubric criterion; name which. For a pass rate or score, explain what limits it (`core/principles/explain-the-number.md`): run count, spread, and whether a candidate errored or never did the work.

**Step 8.** Script path is relative to the harness home. Evidence is the output directory and the judge's score file. Recommend rerun when N was too small or a criterion proved ambiguous, and say what to change.

## Reply

- Variant under test and the success behavior.
- The rubric as frozen.
- Per-candidate notes by sanitized label, with what each actually did.
- The judge's verdict, your read, and where they disagree.
- Synthesis and the promote, reject, or rerun recommendation.

## Source

- `skills/poteto-mode/playbooks/eval.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `docs/guide/06-verify-and-ship.md` from pstack, MIT.
