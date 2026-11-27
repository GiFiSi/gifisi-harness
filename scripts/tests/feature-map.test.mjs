// Unit tests for scripts/verify-feature-map.mjs: comparisons, a live HTTP app, a CLI check, cleanup.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { compareCli, compareHttp, getPath, mapProjectRoot, runFeatureMap } from "../verify-feature-map.mjs";

const VERIFY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "verify-feature-map.mjs");

const SERVER = `import http from "node:http";
import { writeFileSync } from "node:fs";
writeFileSync("app.pid", String(process.pid));
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  res.setHeader("content-type", "application/json");
  if (url.pathname === "/health") return res.end(JSON.stringify({ ok: true }));
  if (url.pathname === "/echo") return res.end(JSON.stringify({ ctype: req.headers["content-type"] ?? null }));
  if (url.pathname === "/sum") {
    const total = url.searchParams.get("n").split(",").reduce((s, v) => s + v, 0);
    return res.end(JSON.stringify({ result: { total } }));
  }
  res.statusCode = 404;
  res.end("{}");
});
server.listen(Number(process.env.APP_PORT));
`;

function fixture(features, app = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "gifisi-fmap-"));
  mkdirSync(path.join(root, ".gifisi"));
  mkdirSync(path.join(root, "bin"));
  writeFileSync(path.join(root, "server.mjs"), SERVER);
  writeFileSync(path.join(root, "bin", "cli.mjs"), 'console.log("1.2.3");\n');
  const map = { app: { start: ["node", "server.mjs"], cwd: ".", portEnv: "APP_PORT", readyPath: "/health", timeoutMs: 8000, ...app }, features };
  writeFileSync(path.join(root, ".gifisi", "feature-map.json"), JSON.stringify(map));
  return root;
}

test("dotted json paths and status are compared", () => {
  assert.equal(getPath({ a: { b: [1, 2] } }, "a.b.1"), 2);
  assert.deepEqual(compareHttp({ status: 200, json: { "a.b": 1 } }, { status: 200, text: '{"a":{"b":1},"c":2}' }), []);
  const problems = compareHttp({ status: 200, json: { total: 15 }, bodyIncludes: "15" }, { status: 500, text: '{"total":"0105"}' });
  assert.equal(problems.length, 3);
  assert.match(problems[1], /total="0105" \(want 15\)/);
  assert.deepEqual(compareCli({ exitCode: 0, stdoutIncludes: "1." }, { status: 0, stdout: "1.2.3", stderr: "" }), []);
});

test("the map's project root is the parent of .gifisi", () => {
  assert.equal(mapProjectRoot(path.join("x", "app", ".gifisi", "feature-map.json")), path.resolve("x", "app"));
});

test("http checks run against the started app, cli checks run, and the app is stopped", async () => {
  const root = fixture([
    { id: "health", surface: "http", checks: [{ name: "ok", request: { path: "/health" }, expect: { status: 200, json: { ok: true } } }] },
    { id: "sum", surface: "http", checks: [{ name: "numeric", request: { path: "/sum?n=10,5" }, expect: { status: 200, json: { "result.total": 15 } } }] },
    { id: "cli", surface: "cli", checks: [{ name: "version", run: ["node", "bin/cli.mjs"], expect: { exitCode: 0, stdoutIncludes: "1." } }] },
    { id: "ctype", surface: "http", checks: [
      { name: "mixed-case header kept alone", request: { method: "POST", path: "/echo", headers: { "Content-Type": "application/merge-patch+json" }, body: { a: 1 } }, expect: { json: { ctype: "application/merge-patch+json" } } },
      { name: "json default", request: { method: "POST", path: "/echo", body: { a: 1 } }, expect: { json: { ctype: "application/json" } } },
    ] },
  ]);
  try {
    const report = await runFeatureMap({ root });
    assert.equal(report.ready, true);
    assert.deepEqual(report.results.map((r) => `${r.feature}:${r.pass}`), ["health:true", "sum:false", "cli:true", "ctype:true", "ctype:true"]);
    assert.match(report.results[1].detail, /"0105"/);
    const port = Number(/127\.0\.0\.1:(\d+)/.exec(JSON.stringify(report))?.[1] ?? 0);
    if (port) assert.equal(await portIsFree(port), true);
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test("an app that never becomes ready fails every http check and the CLI exits 1", () => {
  const root = fixture(
    [{ id: "health", surface: "http", checks: [{ name: "ok", request: { path: "/health" }, expect: { status: 200 } }] }],
    { start: ["node", "-e", "process.exit(3)"], timeoutMs: 3000 },
  );
  try {
    const result = spawnSync(process.execPath, [VERIFY, "--root", root], { encoding: "utf8", timeout: 20000 });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /app exited before ready/);
    assert.match(result.stdout, /features=1 checks=1 passed=0 failed=1/);
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test("the CLI still runs when invoked through a symlinked or junctioned path", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "gifisi-fmap-link-"));
  try {
    const link = path.join(dir, "linked-scripts");
    symlinkSync(path.dirname(VERIFY), link, process.platform === "win32" ? "junction" : "dir");
    const result = spawnSync(process.execPath, [path.join(link, "verify-feature-map.mjs"), "--map", path.join(dir, "missing.json")], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stdout);
    assert.match(result.stderr, /feature map not found/);
  } finally {
    try { unlinkSync(path.join(dir, "linked-scripts")); } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
});
