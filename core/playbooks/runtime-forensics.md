---
name: runtime-forensics
title: Runtime forensics
summary: Diagnose a live or intermittent failure by capturing a real runtime artifact, reducing it to the mechanism, proving that mechanism cheaply, and citing the source line.
skills: [how, why, benchmark-checklist]
principles: [prove-it-works, fix-root-causes, explain-the-number, guard-the-context-window, attack-the-premise]
---

# Runtime forensics

You own the diagnosis. Instrument the running process; do not theorize from source. The deliverable is a cited diagnosis, not a fix. Once the cause is known, hand the work to `core/playbooks/bug-fix.md` (wrong behavior) or `core/playbooks/perf-issue.md` (slow, spinning, or leaking).

If the capture already exists (someone handed you a profile, heap snapshot, trace, or log bundle), use `core/playbooks/trace-forensics.md` instead. This playbook is for when you still need to catch the signal.

## When to use

- A crash, hang, spin, leak, or glitch that shows up only at runtime, only in production, or only intermittently.
- A stack trace or crash report that does not explain itself from reading the code.
- A flaky test whose failure you cannot yet reproduce on demand.
- Not for a bug with a deterministic local repro (`core/playbooks/bug-fix.md`) or a measured slowdown with a benchmark already in hand (`core/playbooks/perf-issue.md`).

## Done Predicate

A captured runtime artifact on disk points to one mechanism, that mechanism was confirmed by a targeted instrumentation run, and the diagnosis cites the source `file:line` that allocates, schedules, or throws.

Template for the signal header:

```
Done Predicate: <artifact path> captured from <process/surface> shows <mechanism>; an instrumented run (<command>) confirms it; the cause maps to <file:line>.
```

A hypothesis that no instrumented run confirmed is reported as the strongest hypothesis, labeled as such, never as the cause.

## Steps

1. Write down the symptom, where it was seen, how often, and what changed recently (`core/skills/why/SKILL.md`), then log phase `frame` with the evidence pointer.
2. Capture the live signal on the surface where it happens: CPU profile for a spin, heap snapshot for a leak, diagnostic report or core for a crash, structured logs for a race; save the artifact path.
3. Make the failure fire on demand: tighten timing, loop the flaky test, raise load, or replay the input until the capture contains the event, and record the trigger.
4. Reduce the artifact to the smoking gun: the hot function, the retainer chain to a GC root, the loop firing without input, or the interleaving that breaks an invariant.
5. Prove the mechanism with a cheap targeted change: add one log line, counter, or assertion at the suspected point, rerun the trigger, and confirm the prediction; log phase `root-cause`.
6. Map the finding to source with `file:line` and symbol, and check whether the first wrong state is upstream of where the symptom appears.
7. Log phase `root-cause` with the artifact path and source location, remove temporary instrumentation, and hand off to `core/playbooks/bug-fix.md` or `core/playbooks/perf-issue.md` if a fix is wanted.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the repository root here. Log a row with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`. This playbook is read-only on product code except for temporary instrumentation, which step 7 removes.

**Step 1.** Collect what exists before touching anything: the stack trace, error rate, first-seen time, the deploys or commits around it (`git log --since`), and the environment where it happens. `core/skills/why/SKILL.md` finds the history of the suspect code. `core/skills/how/SKILL.md` maps an unfamiliar subsystem.

**Step 2.** Generic capture tools, picked by symptom:

- Node CPU: `node --cpu-prof <entry>` writes a `.cpuprofile`; open it in browser devtools or reduce it with a script.
- Node memory: `node --heapsnapshot-signal=SIGUSR2 <entry>` then send the signal twice, minutes apart, and compare the two snapshots. On Windows, take snapshots through `node --inspect` and the devtools Memory panel.
- Node crash or hang: `node --report-on-fatalerror --report-uncaught-exception <entry>`, or `process.report.writeReport()` from a debug hook; the report holds stacks, handles, and resource use.
- Browser: the devtools Performance and Memory panels, or the console and network logs saved to a file.
- Other runtimes: the platform profiler, a core dump, or the service's own tracing.

Save every artifact under a path you can cite, such as `<project>/.poteto/forensics/<date>-<name>.cpuprofile`. Never attach to a production process without the user's go-ahead; prefer a staging or local copy of the same build and data shape.

**Step 3.** An intermittent failure becomes tractable once it fires on demand. Loop a flaky test (`for i in $(seq 1 200); do <test command> || break; done`), add artificial delay at a suspected await, or replay the recorded request. If it will not fire, say what you tried and keep capturing; do not jump to a fix.

**Step 4.** Large artifacts do not belong in the main context (`core/principles/guard-the-context-window.md`). If your harness can spawn subagents, give one the artifact path and the question ("which function holds the most self time", "what retains the growing objects"), and keep only its reduced answer. Otherwise write a small Node script that reads the artifact and prints the top entries. Before trusting a number, rule out measuring the wrong thing: warmup, a debug build, the profiler's own cost (`core/principles/explain-the-number.md`, `core/skills/benchmark-checklist/SKILL.md`).

**Step 5.** State the prediction before the run: "if X retains the cache, the counter at `file:line` grows by one per request". A confirmed prediction is the proof. A refuted one means the reduction was wrong; go back to step 4. If two hypotheses built on the same premise fail, test the premise itself (`core/principles/attack-the-premise.md`).

**Step 6.** The symptom site and the cause site often differ (`core/principles/fix-root-causes.md`). A crash in a serializer may start with a null written three calls earlier. Cite the first wrong state. A frame with no source mapping is not yet a diagnosis: resolve the symbols or say plainly that the artifact lacks them.

**Step 7.** Leave the code as you found it. Keep the artifacts; they are the evidence for whoever fixes it. If a Feature Map check could have caught this, note it so the fixing playbook can add one with `core/skills/create-verification-skill/SKILL.md`.

## Reply

- The signal captured: tool, command, artifact path.
- The reduced finding in one or two sentences.
- How the mechanism was proven: the prediction, the instrumented run, and its output.
- The source location (`file:line`, symbol) of the first wrong state.
- Confirmed cause or strongest hypothesis, labeled. No fix unless asked; name the playbook that takes it next.

## Source

- `skills/poteto-mode/playbooks/runtime-forensics.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `docs/guide/` (verification and evidence chapters) from pstack, MIT.
- Evidence and verification agreements from `README.pt-BR.md` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
