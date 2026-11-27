#!/usr/bin/env node
// UserPromptSubmit hook: classify every real prompt and hand the agent the header to print.
// The router in AGENTS.md is a request; this hook runs the classifier itself, with no model
// tokens, and puts the result in the agent's context so the harness fires on each task.
//
// Silent (exit 0, no output) for slash commands, one or two word replies, acknowledgements,
// when GIFISI_GATE=0, and on any error: a gate never blocks the agent.
import { readFileSync } from "node:fs";
import path from "node:path";
import { classify, buildSignal, ownText } from "./classify-task.mjs";
import { CORE, HARNESS_ROOT, isMain } from "./lib/paths.mjs";

const ACKNOWLEDGEMENTS = new Set([
  "ok", "okay", "sim", "nao", "não", "yes", "no", "thanks", "thx", "obrigado", "obrigada", "valeu",
  "continue", "continua", "pode", "pode fazer", "pode seguir", "segue", "vai", "go", "go ahead", "certo", "beleza",
]);

export function needsGate(prompt) {
  const text = ownText(prompt).trim();
  if (!text || text.startsWith("/")) return false;
  const flat = text.toLowerCase().replace(/[.!?,;:]+$/g, "").replace(/\s+/g, " ");
  if (ACKNOWLEDGEMENTS.has(flat)) return false;
  return flat.split(" ").length > 2;
}

export function gateMessage(prompt, { root = HARNESS_ROOT, cwd = process.cwd() } = {}) {
  const routes = JSON.parse(readFileSync(path.join(root, CORE, "harness", "routes.json"), "utf8"));
  const ranked = classify(prompt, routes);
  const { header, load } = buildSignal(ranked, { root, cwd });
  const tie = ranked[1] && ranked[0].score > 0 && ranked[1].score === ranked[0].score;
  const confidence = ranked[0].score === 0
    ? "Low confidence: no route matched, so the route below is only the fallback. Choose the closest playbook yourself, say why in Reason, and print that header."
    : tie ? `Low confidence: ${ranked[0].taskType} and ${ranked[1].taskType} tie. Pick the one that fits the request and say why in Reason.` : null;
  return [
    "[gifisi-harness gate] The harness is active for this prompt. Before reading or editing anything, print this header, writing Reason and Done Predicate in the user's language, then follow the playbook:",
    header,
    load,
    ...(confidence ? [confidence] : []),
    "If this prompt is only conversation, or one obvious edit with no behavior change, print `[GIFISI-HARNESS] skip: <reason>` instead of the header. Never skip silently.",
  ].join("\n");
}

function readEvent() {
  try {
    const parsed = JSON.parse(readFileSync(0, "utf8"));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function main() {
  try {
    if (process.env.GIFISI_GATE === "0") return;
    const event = readEvent();
    const prompt = typeof event?.prompt === "string" ? event.prompt : "";
    if (!needsGate(prompt)) return;
    process.stdout.write(`${gateMessage(prompt)}\n`);
  } catch {
    // Fail open.
  }
}

if (isMain(import.meta.url)) main();
