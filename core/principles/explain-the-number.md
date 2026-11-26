---
name: explain-the-number
title: Explain the Number
group: Verification
applies_when: Before trusting or reporting a measurement. Find what limits it and rule out measuring the wrong thing.
---

# Explain the Number

## Rule

A measured number is not a result until you can say what limits it and have ruled out that it measured something other than the work you think. Keep the run count, the spread, and the limiter next to the number wherever it is reported.

## When it applies

- Before running a benchmark, load test, or eval.
- Before trusting, reporting, or acting on a speedup, regression, throughput, latency, memory figure, or eval score.
- When a result looks too good, too bad, or suspiciously round.
- When two runs of the same thing disagree.

## How to apply

1. **Write the decision before you run.** Name the result that would change what you do, and the noise floor. If the run-to-run spread is larger than the effect, stop and report that the effect is not measurable yet.
2. **Ask "why not double?"** Name the resource or code path that bounds the number (CPU, I/O, a lock, the network, a single hot function), from a profile or counters taken during a run. A guess from reading the code is not a limiter.
3. **List what else the number could be measuring.** Errors that returned early, skipped or cached work, code that never ran, an untuned baseline, warm versus cold state, noise, or a piece too small to matter in the whole.
4. **Rule out each alternative with evidence.** Count errors, check cache hit rates, confirm the new code path executed, compare against a tuned baseline.
5. **Report the number with its context.** Runs, median and spread, the limiter, and what was ruled out.

For a performance number, load `core/skills/benchmark-checklist/SKILL.md` and answer its questions from real runs. For an eval result, ask whether every run did the task, whether the gap holds across trials and configurations, and whether the scenario matters to users.

Worked example. A change reports "API latency down 60%".

```text
runs: 5 per side, median before 250 ms, after 100 ms, spread 8 ms
why not double?   profile after: 70% of time waiting on the database
what else?        error rate after = 38% (before 0%), errors return in 2 ms
```

The speedup is mostly fast failures. Excluding errored requests, the median is 240 ms, a 4% change inside the noise. The real finding is a regression that breaks 38% of requests.

## Smells

- A single run reported as a result.
- A percentage with no absolute values, run count, or spread.
- A speedup nobody can attribute to a specific limiter.
- A benchmark that never checked error counts or output correctness.
- An eval score that improved while the number of completed tasks dropped.

## Check

Answer yes or no: for the number this work reports, can you name its limiter from a profile or counter, have you ruled out errors, caching, and skipped work with evidence, and is the effect larger than the run-to-run spread? Yes to all means the principle held.

Related: `core/principles/prove-it-works.md`, `core/skills/benchmark-checklist/SKILL.md`, `core/playbooks/perf-issue.md`, `core/playbooks/eval.md`.

## Source

- `skills/principle-explain-the-number/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
