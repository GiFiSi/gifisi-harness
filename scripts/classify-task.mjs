#!/usr/bin/env node
// Classify a task prompt against core/harness/routes.json and print the task-start signal header.
// Usage: node scripts/classify-task.mjs "<prompt>" [--json] [--top N]
// Reads routes, manifest and playbooks from the harness home this script runs from,
// so an installed copy under <project>/.poteto/scripts/ reads <project>/.poteto/core/harness/routes.json.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseFrontmatter, sections } from "./lib/frontmatter.mjs";
import { CORE, HARNESS_ROOT, isMain, toPosix } from "./lib/paths.mjs";

const USAGE = 'Usage: node scripts/classify-task.mjs "<prompt>" [--json] [--top N]';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordCount = (signal) => signal.trim().split(/\s+/).length;

function normalize(prompt) {
  return String(prompt ?? "").toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

// Index of the first match of a signal that is not glued to other letters or digits on either side; -1 if none.
function matchIndex(text, signal) {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(signal.toLowerCase())}(?![\\p{L}\\p{N}])`, "u");
  const found = pattern.exec(text);
  return found ? found.index : -1;
}

// Score every route: each matched signal adds its word count, so phrases outrank single words.
// Ranking is score descending; among equal scores the route whose earliest matched signal occurs
// first in the prompt wins (a leading verb such as "add" or "fix"), then file order.
// With no match the fallback route leads with score 0.
export function classify(prompt, routesData) {
  const text = normalize(prompt);
  const scored = routesData.routes.map((route, order) => {
    const hits = route.signals.map((signal) => [signal, matchIndex(text, signal)]).filter(([, index]) => index >= 0);
    const matched = hits.map(([signal]) => signal);
    const score = matched.reduce((sum, signal) => sum + wordCount(signal), 0);
    const first = hits.length ? Math.min(...hits.map(([, index]) => index)) : Infinity;
    return { id: route.id, taskType: route.taskType, playbook: route.playbook, skills: [...route.skills], score, matched, first, order };
  });
  scored.sort((a, b) => b.score - a.score || a.first - b.first || a.order - b.order);
  if (scored[0].score === 0) {
    const index = scored.findIndex((entry) => entry.id === routesData.fallback);
    if (index > 0) scored.unshift(scored.splice(index, 1)[0]);
  }
  return scored.map(({ order, first, ...entry }) => entry);
}

// First sentence of the first prose paragraph under "## Done Predicate".
export function donePredicateOf(playbookText) {
  const { body } = parseFrontmatter(playbookText);
  const section = sections(body).get("Done Predicate");
  if (!section) return null;
  const paragraphs = section.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const prose = paragraphs.find((p) => !p.startsWith("```") && !/^[-*]\s/.test(p) && !p.startsWith("#"));
  if (!prose) return null;
  const flat = prose.replace(/\s*\n\s*/g, " ");
  const sentence = /^(.+?[.!?])(?=\s|$)/.exec(flat);
  return sentence ? sentence[1] : flat;
}

function readJson(root, rel) {
  return JSON.parse(readFileSync(path.join(root, rel), "utf8"));
}

// Prefix that turns a harness-home path into one usable from the current directory.
export function homePrefix(root = HARNESS_ROOT, cwd = process.cwd()) {
  const relative = path.relative(cwd, root);
  if (!relative) return "";
  if (relative.startsWith("..") || path.isAbsolute(relative)) return `${toPosix(root).replace(/\/$/, "")}/`;
  return `${toPosix(relative)}/`;
}

export function buildSignal(ranked, { root = HARNESS_ROOT, cwd = process.cwd() } = {}) {
  const manifest = readJson(root, `${CORE}/harness/manifest.json`);
  const top = ranked[0];
  const runnerUp = ranked.slice(1).find((entry) => entry.score > 0);
  const title = manifest.playbooks.find((p) => p.name === top.playbook)?.title ?? top.playbook;
  const playbookFile = path.join(root, CORE, "playbooks", `${top.playbook}.md`);
  const predicate = existsSync(playbookFile) ? donePredicateOf(readFileSync(playbookFile, "utf8")) : null;
  const reasonMatch = top.score > 0
    ? `matched ${top.matched.map((s) => `"${s}"`).join(", ")} (score ${top.score})`
    : "no signal matched (score 0); using the fallback route";
  const reasonRunner = runnerUp ? `runner-up: ${runnerUp.taskType} (score ${runnerUp.score})` : "runner-up: none (score 0)";
  const home = homePrefix(root, cwd);
  const header = [
    `[POTETO-HARNESS] Task Type: ${top.taskType} | Playbook: ${title}`,
    `Reason: ${reasonMatch}; ${reasonRunner}`,
    `Done Predicate: ${predicate ?? `see ## Done Predicate in ${home}${CORE}/playbooks/${top.playbook}.md`}`,
  ].join("\n");
  const skills = top.skills.map((skill) => `${home}${CORE}/skills/${skill}/SKILL.md`);
  const load = `Load: ${home}${CORE}/playbooks/${top.playbook}.md; skills: ${skills.length ? skills.join(", ") : "none"}`;
  return { header, load, title };
}

export function parseArgs(argv) {
  const options = { json: false, top: null, prompt: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") options.json = true;
    else if (arg === "--top") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) throw new Error("--top needs a positive integer");
      options.top = value;
    } else if (arg === "-h" || arg === "--help") options.help = true;
    else options.prompt.push(arg);
  }
  options.prompt = options.prompt.join(" ").trim();
  return options;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`classify-task: ${error.message}\n${USAGE}`);
    process.exit(2);
  }
  if (options.help) { console.log(USAGE); return; }
  if (!options.prompt) { console.error(`classify-task: a prompt is required\n${USAGE}`); process.exit(2); }
  const routesData = readJson(HARNESS_ROOT, `${CORE}/harness/routes.json`);
  const ranked = classify(options.prompt, routesData);
  const { header, load } = buildSignal(ranked);
  const limit = options.top ?? (options.json ? 3 : 0);
  if (options.json) {
    console.log(JSON.stringify({ ranked: ranked.slice(0, limit), header, load }, null, 2));
    return;
  }
  console.log(header);
  console.log(load);
  if (limit) {
    console.log("\nRanking:");
    ranked.slice(0, limit).forEach((entry, i) => {
      const why = entry.matched.length ? entry.matched.join(", ") : "no match";
      console.log(`  ${i + 1}. ${entry.taskType} -> ${entry.playbook} (score ${entry.score}): ${why}`);
    });
  }
}

if (isMain(import.meta.url)) main();
