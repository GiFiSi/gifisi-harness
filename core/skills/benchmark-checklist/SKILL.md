---
name: benchmark-checklist
description: Vet a performance number before you report it or act on it. Name the limiter, confirm both sides were tuned, check the number against hardware limits, count errors, repeat interleaved runs, measure the end-to-end path, and confirm the work happened. Load whenever you run a benchmark or claim a speedup or regression you measured.
origin: pstack
---

# Benchmark checklist

A performance number is a claim. Most wrong claims come from measuring the wrong thing: a cache, a no-op, an untuned side, or noise. Answer each question below with evidence from a run, not a guess about the code.

## When to use

- A PR's before and after numbers, a regression claim, or a library or config choice.
- The baseline of `core/playbooks/perf-issue.md` before the plan builds on it, and every number after it.
- The harness of `core/playbooks/hillclimb.md` before it is frozen. Once the frozen harness prints error and work counts, every keep-or-revert decision answers steps 7 and 10 for free.
- A quick ballpark the user asked for: one run is enough, but still answer steps 7 and 10 and say that it is one run. A choice between options is never a ballpark.

## Procedure

1. Write down the claim you expect to make, in the words you would ship, for example "export is 30% faster at p50 on the 60k-row dataset". The questions test that sentence.
2. Read the measurement script. Note what it times, what it counts, and what it ignores.
3. Check the machine. On Linux and macOS, `uptime` gives the load average and `nproc` (Linux) or `sysctl -n hw.ncpu` (macOS) gives the core count. On Windows, run `Get-Counter '\Processor(_Total)\% Processor Time'` and `(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors` in PowerShell. If the machine is busy, find out what is running. If you cannot stop it, interleave the sides so both see the same noise, and say so.
4. **Why not double?** Name the limiter. Profile in a run you do not report, because profilers slow the work. Use CPU per process (`top` or `pidstat` on Linux, Task Manager or `Get-Process` on Windows), a runtime profiler (`node --cpu-prof`, `py-spy`, `perf` on Linux), I/O wait, and syscall counts (`strace -c` on Linux). Map the hot spot to source. Watch the load generator: if it saturates first, you measured the load generator. If a change did not move the number, the limiter explains why.
5. **Was it tuned?** Run every side the way production runs it: release builds, production flags and env, batching and transaction settings, connection pools, caches as warm or cold as production sees them, the same versions and data. A limiter that is a setting (a commit per row, a debug build, a missing index) means that side is untuned: tune it and measure again before picking a winner. When the user is choosing what to adopt, narrowing the claim to "as configured today" does not fix an untuned side.
6. **Did it break limits?** Do the arithmetic. Compare bytes per second with disk and network bandwidth, and operations per second times cost per operation with your cores. Removing a piece that takes 10% of the run makes the run at most about 11% faster. A result past a limit measured something else: a cache, a no-op, or a bug.
7. **Did it error?** Count failures and non-success responses, and check that outputs are correct, not just present. Rejections are fast; timeouts and retries are slow. If the script does not count errors, add the count.
8. **Does it reproduce?** Run each side at least 5 times, alternating A, B, A, B, so warmup, lazy initialization, caches, and drift favor neither side. Report the median and the range. A gap smaller than the run-to-run spread is no measurable difference. When the call is close, use a rank-sum test or the harness's own statistics.
9. **Does it matter?** Next to any micro result, measure the end-to-end path a user waits on, with realistic data sizes and concurrency, and report the micro result as a share of the whole. A helper that takes 1% of a request can make the request at most 1% faster.
10. **Did it even happen?** Confirm the work ran inside the timed region: the request reached the server, the rows were written, the bytes were read, the result was used. Generators nobody iterates, promises nobody awaits, results the JIT can discard, and timeouts all produce numbers for work that never happened.
11. Log the verdict with `node scripts/log-decision.mjs verify "<claim>" "<limiter>" "<median, range, run count>" "<verdict>"` so the number has a trail.

## Output

- The verdict first: faster, slower, no measurable difference, or inconclusive.
- The number with its unit, the run count, the range, and the limiter. Example: "p50 41 ms to 33 ms, median of 7 runs per side, range 32 to 35 ms after, bound by JSON parsing on one core."
- Inconclusive, with the gap named, when you claim a difference but cannot name the limiter, when a side ran untuned, or when you could not answer steps 7 and 10.
- In a PR body, one primary number. The runs, range, and limiter evidence go in a linked notes file or the `.gifisi/decisions.tsv` row.

See `core/principles/explain-the-number.md` for why a number without a limiter is not yet a result.

## Source

Adapted from pstack `skills/benchmark-checklist/SKILL.md` (Lauren Tan, cursor/plugins, MIT). Windows equivalents and decision logging are gifisi-harness additions.
