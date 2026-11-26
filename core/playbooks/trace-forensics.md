---
name: trace-forensics
title: Trace forensics
summary: Diagnose from an existing capture (profile, heap snapshot, trace, transcript, log bundle) by turning it into a queryable shape, narrowing to the cause, and attributing it to source.
skills: [how, benchmark-checklist, why]
principles: [explain-the-number, guard-the-context-window, prove-it-works, fix-root-causes, build-the-lever]
---

# Trace forensics

You own the diagnosis from the artifact. The capture already exists; treat it as a fixed dataset. Read it, do not re-run it. When you still need to catch the signal from a running process, use `core/playbooks/runtime-forensics.md` instead.

Keep the tooling generic: browser devtools or a small parser for `.cpuprofile` and Chrome trace JSON, a text editor for a spindump or diagnostic report, heap tooling for a `.heapsnapshot`, a JSON-lines reader for agent transcripts and structured logs.

## When to use

- Someone handed you a profile, flame graph, heap snapshot, trace file, telemetry export, or agent transcript and asks what it shows.
- A before and after pair of captures needs comparing.
- An agent run went wrong and its transcript or decision log is the only record.
- Not for live capture (`core/playbooks/runtime-forensics.md`) or for fixing what you find (`core/playbooks/bug-fix.md`, `core/playbooks/perf-issue.md`).

## Done Predicate

A query over the artifact names the frames, objects, or events that account for the symptom, and each one is attributed to a source `file:line` or explicitly marked as unsymbolized.

Template for the signal header:

```
Done Predicate: <query script> over <artifact path> shows <finding with its share of time, memory, or events>; it maps to <file:line>; confirmed by <paired capture diff> or labeled strongest hypothesis.
```

## Steps

1. Identify the artifact format, size, origin, and capture conditions (build, flags, load, duration), and log phase `frame` with its path.
2. Load it with the right tool; if it is large, parse it in a subagent or a script and keep only the reduced finding in the main thread.
3. Transform the raw artifact into a queryable shape (JSON lines, TSV, or a sqlite table with one row per sample, frame, node, or event) before reading conclusions from it.
4. Narrow to the cause: rank frames by self and total time, follow retainer chains to a GC root, find the blocked thread and its wait reason, or locate the first wrong event in the transcript.
5. Attribute each finding to source via the artifact's own symbols or source maps; resolve missing symbols or state plainly that the artifact does not carry them.
6. Confirm with a paired capture if one exists by diffing before and after on the same query; otherwise label the finding as the strongest hypothesis the artifact supports.
7. Log phase `root-cause` with the query script, artifact path, and source location, and hand off to `core/playbooks/bug-fix.md` or `core/playbooks/perf-issue.md` if a fix is wanted.

## Step notes

Script paths are relative to the harness home: `.poteto/` in an installed project, the repository root here. Log a row with `node scripts/log-decision.mjs <phase> "<decision>" "<why>" "<evidence>" "<result>"`.

**Step 1.** A profile of a debug build, a cold start, or a one-second window answers a different question than the one asked. Write the capture conditions down before reading numbers (`core/principles/explain-the-number.md`, `core/skills/benchmark-checklist/SKILL.md`). If the conditions are unknown, say so in the reply.

**Step 2.** Bulk artifacts exhaust the context window fast (`core/principles/guard-the-context-window.md`). If your harness can spawn subagents, give one the path and a precise question, and keep its reduced answer. Otherwise read the artifact only through a script that prints a bounded summary (top 20 rows, one retainer path). Never paste a raw trace into the conversation.

**Step 3.** Build the lever before reading (`core/principles/build-the-lever.md`). A Node script with zero dependencies can stream a `.cpuprofile` (nodes with `callFrame` and `hitCount`, plus `samples` and `timeDeltas`) into one JSON line per node with self time and parent id. A `.heapsnapshot` flattens the same way from its `nodes` and `edges` arrays using the `snapshot.meta` field layout. If the `sqlite3` CLI is installed, import the TSV and query with SQL; otherwise query the JSON lines with a second script. Save the scripts under `<project>/.poteto/forensics/` so the query can be rerun by a reviewer. For agent transcripts and `.poteto/decisions.tsv`, the queryable shape is one row per event with timestamp, phase, and claim.

**Step 4.** Typical narrowing queries:

- CPU: top functions by self time, then walk the call tree from the hottest leaf up to the entry that triggers it.
- Memory: the constructors whose retained size grows between snapshots, then the shortest retainer path from one instance to a GC root.
- Hang or spindump: the thread on-CPU or blocked, its stack, and what it waits on.
- Transcript: the first step where the agent's claim and the tool output disagree, or where a check was skipped.

`core/skills/how/SKILL.md` explains the subsystem the hot path runs through.

**Step 5.** A frame with no source mapping is not yet a diagnosis. Load source maps, rebuild with symbols, or match the minified name against the build output. If none works, say so; do not guess the file. Use `core/skills/why/SKILL.md` to learn why the attributed code is shaped that way.

**Step 6.** A paired capture is the proof (`core/principles/prove-it-works.md`): the same query on the before and after artifact should move the finding by the expected amount. Without a pair, the finding is the strongest hypothesis the artifact supports, and the reply says so. Point at the first wrong state, not the place the cost surfaced (`core/principles/fix-root-causes.md`).

**Step 7.** No fix unless asked. The query scripts and artifact paths are the evidence the next playbook starts from.

## Reply

- The artifact, its format, and its capture conditions.
- The reduced finding with its share of time, memory, or events, and the query that produced it.
- The source location for each finding, or the reason it is unsymbolized.
- Whether a paired capture confirmed it, or that it is the strongest hypothesis.
- Artifact and script paths, and which playbook takes the fix.

## Source

- `skills/poteto-mode/playbooks/trace-forensics.md` from pstack by Lauren Tan (github.com/cursor/plugins, `pstack/`), MIT.
- `skills/benchmark-checklist/SKILL.md` from pstack, MIT.
- Evidence agreements from `README.pt-BR.md` of Vibe Coding Toolkit by Matheus Gomes (github.com/soumatheusgomes/vibe-coding-toolkit), MIT.
