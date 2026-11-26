#!/usr/bin/env node
// PreToolUse hook (shell commands): route a small set of simple read-only
// commands through RTK so their output is filtered before it reaches the
// agent's context. Use it only when RTK's own integration is not installed;
// prefer `rtk init` for your client when it exists.
//
// Silent (exit 0, no output) when:
//   - the rtk executable is not on PATH;
//   - a native RTK hook is already registered (no double rewriting);
//   - the command already starts with rtk, or is not on the allowlist;
//   - the command contains pipes, redirections, substitutions, separators
//     or a heredoc (shell semantics stay untouched);
//   - anything fails.
// It never makes a permission decision: the client's normal permission flow
// still applies to the rewritten command. It only returns updatedInput.
// Extend the allowlist with POTETO_RTK_COMMANDS="git status,git diff,..."
// (prefixes RTK documents as supported). Opt out with POTETO_RTK_REWRITE=0.
// For full, unfiltered output the agent runs `rtk proxy <command>`.
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { emitJson, findExecutable, projectDir, runHook } from "./hook-io.mjs";

const DEFAULT_PREFIXES = ["git status", "git diff", "git log", "git show"];
const SHELL_SYNTAX = /[|;&<>`\n\r]|\$\(|\$\{/;
const NATIVE_HOOK = /rtk\s+hook|rtk-rewrite\.sh/;

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function nativeHookRegistered(root) {
  const home = os.homedir();
  const files = [
    path.join(root, ".claude", "settings.json"),
    path.join(root, ".claude", "settings.local.json"),
    path.join(root, ".codex", "hooks.json"),
    path.join(root, ".codex", "config.toml"),
    path.join(home, ".claude", "settings.json"),
    path.join(home, ".codex", "hooks.json"),
    path.join(home, ".codex", "config.toml"),
  ];
  return files.some((file) => NATIVE_HOOK.test(readText(file)));
}

function allowedPrefixes() {
  const extra = String(process.env.POTETO_RTK_COMMANDS ?? "")
    .split(",").map((item) => item.trim().replace(/\s+/g, " ")).filter(Boolean);
  return [...DEFAULT_PREFIXES, ...extra];
}

function rewrite(command, prefixes = DEFAULT_PREFIXES) {
  const trimmed = command.trim();
  if (!trimmed || /^rtk(\s|$)/.test(trimmed) || SHELL_SYNTAX.test(trimmed)) return null;
  const normalized = trimmed.replace(/\s+/g, " ");
  const match = prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix} `));
  return match ? `rtk ${trimmed}` : null;
}

await runHook(async (event) => {
  if (process.env.POTETO_RTK_REWRITE === "0") return;
  const input = event.tool_input;
  if (!input || typeof input.command !== "string") return;
  const rewritten = rewrite(input.command, allowedPrefixes());
  if (!rewritten) return;
  if (!findExecutable("rtk")) return;
  if (nativeHookRegistered(projectDir(event))) return;
  emitJson({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: { ...input, command: rewritten },
    },
  });
});
