// Unit tests for scripts/harness-usage.mjs on synthetic Claude Code transcripts.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { measureTranscript } from "../harness-usage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "harness-usage.mjs");

const user = (content, extra = {}) => ({ type: "user", timestamp: "2026-11-27T10:00:00Z", message: { role: "user", content }, ...extra });
const assistant = (text) => ({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text }] } });
const toolResult = () => ({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "x" }] } });
const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n");

test("counts header, skip and missed prompts, ignoring acknowledgements and system messages", () => {
  const rows = [
    user("corrigir o bug do carrinho"), assistant("[GIFISI-HARNESS] Task Type: Bug fix | Playbook: Bug fix\nReason: x"), toolResult(), assistant("done"),
    user("explica como funciona o roteador"), assistant("[GIFISI-HARNESS] skip: pergunta conceitual"),
    user("adicionar suporte a cupom"), assistant("Claro, vou começar."),
    user("ok"), assistant("certo"),
    user("<system-reminder>ignore me</system-reminder>"), assistant("noted"),
    user("/model sonnet"),
  ];
  const r = measureTranscript(jsonl(rows));
  assert.equal(r.eligible, 3);
  assert.equal(r.header, 1);
  assert.equal(r.skip, 1);
  assert.equal(r.missed, 1);
});

test("a header printed in a later assistant message of the same turn still counts", () => {
  const rows = [user("implementar o login com google"), assistant("Vou ver o código."), toolResult(), assistant("[GIFISI-HARNESS] Task Type: Feature | Playbook: Feature")];
  assert.equal(measureTranscript(jsonl(rows)).header, 1);
});

test("the since filter drops older prompts", () => {
  const rows = [user("corrigir o bug A", { timestamp: "2026-11-01T00:00:00Z" }), assistant("sem cabeçalho"), user("corrigir o bug B", { timestamp: "2026-11-27T00:00:00Z" }), assistant("[GIFISI-HARNESS] skip: x")];
  const r = measureTranscript(jsonl(rows), { since: "2026-11-20" });
  assert.equal(r.eligible, 1);
  assert.equal(r.skip, 1);
});

test("CLI prints counts only, never prompt text, and survives bad lines", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "gifisi-usage-"));
  try {
    mkdirSync(path.join(dir, "proj"), { recursive: true });
    writeFileSync(path.join(dir, "proj", "a.jsonl"), `${jsonl([user("corrigir o segredo-super-privado do carrinho"), assistant("[GIFISI-HARNESS] Task Type: Bug fix | Playbook: Bug fix")])}\nnot json\n`);
    const result = spawnSync(process.execPath, [SCRIPT, "--root", dir, "--json"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stdout, /segredo-super-privado/);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.total.eligible, 1);
    assert.equal(parsed.total.header, 1);
    assert.equal(parsed.total.rate, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
