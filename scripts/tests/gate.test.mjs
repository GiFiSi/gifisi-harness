// Unit tests for scripts/harness-gate.mjs, the UserPromptSubmit hook that makes the router fire.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE = path.join(ROOT, "scripts", "harness-gate.mjs");

function gate(input, env = {}) {
  const stdin = typeof input === "string" ? input : JSON.stringify(input);
  const result = spawnSync(process.execPath, [GATE], { input: stdin, encoding: "utf8", cwd: ROOT, env: { ...process.env, ...env } });
  return { status: result.status, out: result.stdout };
}

test("a real task gets the classified header, the playbook path and the skip rule", () => {
  const { status, out } = gate({ prompt: "corrigir o bug do carrinho que retorna 500 error" });
  assert.equal(status, 0);
  assert.match(out, /\[GIFISI-HARNESS\] Task Type: Bug fix/);
  assert.match(out, /Load: .*playbooks\/bug-fix\.md/);
  assert.match(out, /skip: <reason>/);
});

test("a prompt with no matching route still gets the fallback header", () => {
  const { out } = gate({ prompt: "preciso de ajuda com uma coisa grande e vaga no sistema" });
  assert.match(out, /Task Type: Multi-phase plan/);
});

test("acknowledgements, slash commands and empty prompts stay silent", () => {
  for (const prompt of ["ok", "sim", "pode fazer", "/model sonnet", "   ", "obrigado"]) {
    const { status, out } = gate({ prompt });
    assert.equal(status, 0, prompt);
    assert.equal(out, "", prompt);
  }
});

test("bad input fails open with exit 0 and no output", () => {
  for (const input of ["not json", "null", "42", "[]", "{}"]) {
    const { status, out } = gate(input);
    assert.equal(status, 0, input);
    assert.equal(out, "", input);
  }
});

test("GIFISI_GATE=0 turns the hook off", () => {
  const { status, out } = gate({ prompt: "corrigir o bug do carrinho" }, { GIFISI_GATE: "0" });
  assert.equal(status, 0);
  assert.equal(out, "");
});

test("a prompt that matches no route is flagged as low confidence so the agent picks the playbook itself", () => {
  const { out } = gate({ prompt: "preciso de ajuda com uma coisa grande e vaga no sistema" });
  assert.match(out, /Low confidence: no route matched/);
});

test("a clear match carries no low-confidence warning", () => {
  const { out } = gate({ prompt: "corrigir o bug do carrinho que retorna 500 error" });
  assert.doesNotMatch(out, /Low confidence/);
});

test("quoted text in the prompt is ignored by the gate", () => {
  const prompt = "> Qual a saúde do projeto? falta o que? status do projeto\n\nPode proteger a branch main";
  const { out } = gate({ prompt });
  assert.doesNotMatch(out, /Task Type: Investigation/);
});
