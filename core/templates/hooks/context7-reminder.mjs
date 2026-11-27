#!/usr/bin/env node
// UserPromptSubmit hook: when a prompt names a library the project depends
// on, or asks about an API, upgrade or configuration option, remind the agent
// to check current documentation through Context7 before writing code.
//
// Silent (exit 0, no output) when Context7 is not registered in any known
// client config, when the prompt needs no reminder, or on any error.
// Opt out with GIFISI_CONTEXT7_REMINDER=0.
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { projectDir, runHook } from "./hook-io.mjs";

const KEYWORDS = /\b(api|sdk|library|package|dependency|upgrade|migrate|migration guide|deprecated|breaking change|version|config option|configuration)\b/i;
const MIN_NAME_LENGTH = 3;

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function context7Registered(root) {
  const home = os.homedir();
  const files = [
    path.join(root, ".mcp.json"),
    path.join(root, ".codex", "config.toml"),
    path.join(root, ".cursor", "mcp.json"),
    path.join(home, ".claude.json"),
    path.join(home, ".claude", "settings.json"),
    path.join(home, ".codex", "config.toml"),
    path.join(home, ".cursor", "mcp.json"),
  ];
  return files.some((file) => /context7/i.test(readText(file)));
}

function dependencyNames(root) {
  try {
    const pkg = JSON.parse(readText(path.join(root, "package.json")));
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
  } catch {
    return [];
  }
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function namedDependencies(prompt, names) {
  const lower = prompt.toLowerCase();
  return names.filter((name) => {
    // "@scope/pkg" also matches a bare "pkg" mention.
    const bare = name.split("/").pop();
    return [name, bare].some((candidate) => candidate.length >= MIN_NAME_LENGTH
      && new RegExp(`(^|[^\\w@/-])${escapeRegex(candidate.toLowerCase())}($|[^\\w-])`).test(lower));
  });
}

await runHook(async (event) => {
  if (process.env.GIFISI_CONTEXT7_REMINDER === "0") return;
  const prompt = typeof event.prompt === "string" ? event.prompt : "";
  if (!prompt.trim()) return;
  const root = projectDir(event);
  if (!context7Registered(root)) return;

  const named = namedDependencies(prompt, dependencyNames(root)).slice(0, 5);
  if (!named.length && !KEYWORDS.test(prompt)) return;

  const subject = named.length ? `the installed version of ${named.join(", ")}` : "the library or API this prompt is about";
  process.stdout.write([
    `Context7 is available. Before writing code that depends on ${subject}, resolve the library id and query one concept at a time, naming the version from the lockfile.`,
    "Never put secrets, private code or personal data in a query. Confirm doc excerpts against the installed package's types or a quick run.",
  ].join(" ") + "\n");
});
