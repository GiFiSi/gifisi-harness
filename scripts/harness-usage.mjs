#!/usr/bin/env node
// Measure how often the harness fired: for each real, non-trivial prompt in your Claude Code
// transcripts, did the agent answer with a [GIFISI-HARNESS] header or a visible skip line?
// Prints counts only; prompt text never leaves the transcript files.
// Usage: node scripts/harness-usage.mjs [--root DIR] [--since YYYY-MM-DD[THH:MM:SSZ]] [--json]
import { readFileSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { needsGate } from "./harness-gate.mjs";
import { isMain } from "./lib/paths.mjs";

const HEADER = /\[GIFISI-HARNESS\]\s*Task Type:/;
const SKIP = /\[GIFISI-HARNESS\]\s*skip:/i;

function promptText(row) {
  if (row.type !== "user" || row.isMeta || row.isSidechain || row.isCompactSummary) return null;
  const content = row.message?.content;
  let text = null;
  if (typeof content === "string") text = content;
  else if (Array.isArray(content) && content.length && content.every((block) => block.type === "text")) text = content.map((block) => block.text).join("\n");
  if (text === null) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith("<") && !trimmed.startsWith("<pasted_content")) return null;
  if (/^This session is being continued/.test(trimmed)) return null;
  return trimmed;
}

function assistantText(row) {
  if (row.type !== "assistant" || !Array.isArray(row.message?.content)) return "";
  return row.message.content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
}

export function measureTranscript(raw, { since = null } = {}) {
  const rows = raw.split("\n").filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  const result = { eligible: 0, header: 0, skip: 0, missed: 0 };
  let turn = null;
  const close = () => {
    if (!turn) return;
    result.eligible++;
    if (HEADER.test(turn.reply)) result.header++;
    else if (SKIP.test(turn.reply)) result.skip++;
    else result.missed++;
    turn = null;
  };
  for (const row of rows) {
    const prompt = promptText(row);
    if (prompt !== null) {
      close();
      const recent = !since || (row.timestamp && row.timestamp >= since);
      turn = recent && needsGate(prompt) ? { reply: "" } : null;
    } else if (turn) {
      turn.reply += `\n${assistantText(row)}`;
    }
  }
  close();
  return result;
}

function transcriptFiles(root) {
  const out = [];
  const walk = (dir, depth) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory() && depth < 3) walk(full, depth + 1);
      else if (stat.isFile() && name.endsWith(".jsonl")) out.push(full);
    }
  };
  walk(root, 0);
  return out;
}

export function measureAll(root, options = {}) {
  const total = { eligible: 0, header: 0, skip: 0, missed: 0 };
  let files = 0;
  for (const file of transcriptFiles(root)) {
    let counts;
    try {
      counts = measureTranscript(readFileSync(file, "utf8"), options);
    } catch {
      continue;
    }
    files++;
    for (const key of Object.keys(total)) total[key] += counts[key];
  }
  const rate = total.eligible ? (total.header + total.skip) / total.eligible : null;
  return { files, total: { ...total, rate } };
}

function main() {
  const args = process.argv.slice(2);
  const value = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
  const root = value("--root") ?? path.join(os.homedir(), ".claude", "projects");
  const report = measureAll(root, { since: value("--since") });
  if (args.includes("--json")) return console.log(JSON.stringify(report, null, 2));
  const { total } = report;
  const pct = total.rate === null ? "n/a" : `${(total.rate * 100).toFixed(1)}%`;
  console.log(`harness-usage: transcripts=${report.files} eligible=${total.eligible} header=${total.header} skip=${total.skip} missed=${total.missed} rate=${pct}`);
  console.log("rate = (header + skip) / eligible; a missed prompt got neither a header nor a visible skip line");
}

if (isMain(import.meta.url)) main();
