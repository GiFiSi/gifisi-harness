#!/usr/bin/env node
// Feature Map verifier: runs every check in `.poteto/feature-map.json` against the live surface.
// HTTP features start the app on a free port (unless --base-url is given), wait for its ready
// path, send each request with fetch, and always stop the app. CLI features run a command.
// Usage: node scripts/verify-feature-map.mjs [--map FILE] [--root DIR] [--base-url URL] [--json]
// Exit 0 when every check passes, 1 when a check fails or the app never became ready, 2 on usage errors.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { findProjectRoot, isMain, resolveUserPath } from "./lib/paths.mjs";

const POLL_MS = 150;

export function defaultMapPath(root = findProjectRoot()) {
  return path.join(root, ".poteto", "feature-map.json");
}

// The project root for a map at <root>/.poteto/feature-map.json is <root>; otherwise the map's directory.
export function mapProjectRoot(mapFile) {
  const dir = path.dirname(path.resolve(mapFile));
  return path.basename(dir) === ".poteto" ? path.dirname(dir) : dir;
}

export function loadMap(mapFile) {
  if (!existsSync(mapFile)) throw new Error(`feature map not found: ${mapFile}`);
  let map;
  try {
    map = JSON.parse(readFileSync(mapFile, "utf8"));
  } catch (error) {
    throw new Error(`feature map is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(map.features)) throw new Error("feature map needs a features array");
  for (const feature of map.features) {
    if (!feature.id || !Array.isArray(feature.checks)) throw new Error("each feature needs an id and a checks array");
    if (!["http", "cli"].includes(feature.surface ?? "http")) throw new Error(`feature ${feature.id}: surface must be http or cli`);
  }
  return map;
}

export function getPath(value, dotted) {
  return dotted.split(".").reduce((node, key) => (node == null ? undefined : node[key]), value);
}

export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
}

// Compare a response against `expect`. Returns a list of mismatch strings (empty when it passes).
export function compareHttp(expect = {}, response) {
  const problems = [];
  if (expect.status !== undefined && response.status !== expect.status) {
    problems.push(`status ${response.status} (want ${expect.status})`);
  }
  if (expect.json) {
    let body;
    try {
      body = JSON.parse(response.text);
    } catch {
      problems.push("body is not JSON");
    }
    if (body !== undefined) {
      for (const [key, want] of Object.entries(expect.json)) {
        const got = getPath(body, key);
        if (!deepEqual(got, want)) problems.push(`${key}=${JSON.stringify(got)} (want ${JSON.stringify(want)})`);
      }
    }
  }
  if (expect.bodyIncludes !== undefined && !response.text.includes(String(expect.bodyIncludes))) {
    problems.push(`body lacks ${JSON.stringify(expect.bodyIncludes)}`);
  }
  if (expect.bodyExcludes !== undefined && response.text.includes(String(expect.bodyExcludes))) {
    problems.push(`body contains ${JSON.stringify(expect.bodyExcludes)}`);
  }
  return problems;
}

export function compareCli(expect = {}, run) {
  const problems = [];
  const want = expect.exitCode ?? 0;
  if (run.status !== want) problems.push(`exit ${run.status} (want ${want})`);
  if (expect.stdoutIncludes !== undefined && !run.stdout.includes(String(expect.stdoutIncludes))) {
    problems.push(`stdout lacks ${JSON.stringify(expect.stdoutIncludes)}`);
  }
  if (expect.stderrIncludes !== undefined && !run.stderr.includes(String(expect.stderrIncludes))) {
    problems.push(`stderr lacks ${JSON.stringify(expect.stderrIncludes)}`);
  }
  return problems;
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const resolveCommand = (command) => (command[0] === "node" ? [process.execPath, ...command.slice(1)] : command);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, init = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { status: response.status, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

// Start the app described by map.app. Resolves { baseUrl, stop, output } once the ready path answers 2xx.
export async function startApp(app, root) {
  if (!app || !Array.isArray(app.start) || app.start.length === 0) throw new Error("app.start must be a command array");
  const port = await freePort();
  const [command, ...args] = resolveCommand(app.start);
  const cwd = path.resolve(root, app.cwd ?? ".");
  const env = { ...process.env, [app.portEnv ?? "PORT"]: String(port) };
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let output = "";
  const keep = (chunk) => {
    output = (output + chunk.toString()).slice(-4000);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  let exited = null;
  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      exited = { code, signal };
      resolve();
    });
    child.on("error", (error) => {
      exited = { code: null, signal: null, error };
      resolve();
    });
  });

  const stop = async () => {
    if (!exited) {
      child.kill();
      await Promise.race([exitPromise, sleep(3000)]);
      if (!exited) child.kill("SIGKILL");
      await Promise.race([exitPromise, sleep(2000)]);
    }
  };
  const onSignal = () => {
    child.kill();
    process.exit(130);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  const stopAndRelease = async () => {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    await stop();
  };

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + (app.timeoutMs ?? 15000);
  const readyPath = app.readyPath ?? "/";
  try {
    while (Date.now() < deadline) {
      if (exited) {
        const why = exited.error ? exited.error.message : `exit code ${exited.code}`;
        throw new Error(`app exited before ready (${why}): ${output.trim().split("\n").slice(-3).join(" | ")}`);
      }
      try {
        const response = await fetchText(baseUrl + readyPath, {}, 1000);
        if (response.status >= 200 && response.status < 300) return { baseUrl, stop: stopAndRelease, output: () => output };
      } catch {
        // Connection refused while the app boots: poll again.
      }
      await sleep(POLL_MS);
    }
    throw new Error(`app not ready at ${readyPath} within ${app.timeoutMs ?? 15000}ms`);
  } catch (error) {
    await stopAndRelease();
    throw error;
  }
}

async function runHttpCheck(baseUrl, check) {
  const request = check.request ?? {};
  // A fresh Headers object matches names case-insensitively and leaves the map's own object untouched.
  const init = { method: request.method ?? "GET", headers: new Headers(request.headers ?? {}) };
  if (request.body !== undefined) {
    init.body = typeof request.body === "string" ? request.body : JSON.stringify(request.body);
    if (typeof request.body !== "string" && !init.headers.has("content-type")) init.headers.set("content-type", "application/json");
  }
  try {
    const response = await fetchText(baseUrl + (request.path ?? "/"), init, check.timeoutMs ?? 5000);
    const problems = compareHttp(check.expect, response);
    const detail = problems.length ? problems.join("; ") : `${response.status} ${response.text.slice(0, 80)}`;
    return { pass: problems.length === 0, detail };
  } catch (error) {
    return { pass: false, detail: `request failed: ${error.message}` };
  }
}

function runCliCheck(root, defaultCwd, check) {
  if (!Array.isArray(check.run) || check.run.length === 0) return { pass: false, detail: "check.run must be a command array" };
  const [command, ...args] = resolveCommand(check.run);
  const result = spawnSync(command, args, {
    cwd: path.resolve(root, check.cwd ?? defaultCwd ?? "."),
    encoding: "utf8",
    timeout: check.timeoutMs ?? 30000,
    windowsHide: true,
  });
  if (result.error) return { pass: false, detail: `could not run: ${result.error.message}` };
  const problems = compareCli(check.expect, { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" });
  return { pass: problems.length === 0, detail: problems.length ? problems.join("; ") : `exit ${result.status}` };
}

// Returns { results: [{ feature, check, pass, detail }], passed, failed, ready }.
export async function runFeatureMap({ map, root, baseUrl } = {}) {
  const mapFile = path.resolve(map ?? defaultMapPath(root ? path.resolve(root) : undefined));
  const data = loadMap(mapFile);
  const projectRoot = root ? path.resolve(root) : mapProjectRoot(mapFile);
  const results = [];
  const httpFeatures = data.features.filter((f) => (f.surface ?? "http") === "http");
  let ready = true;
  let app = null;
  let url = baseUrl ? baseUrl.replace(/\/$/, "") : null;
  let startError = null;

  try {
    if (httpFeatures.length > 0 && !url) {
      try {
        app = await startApp(data.app, projectRoot);
        url = app.baseUrl;
      } catch (error) {
        ready = false;
        startError = error.message;
      }
    }
    for (const feature of data.features) {
      for (const check of feature.checks) {
        const name = check.name ?? "(unnamed)";
        let outcome;
        if ((feature.surface ?? "http") === "cli") outcome = runCliCheck(projectRoot, data.app?.cwd, check);
        else if (!url) outcome = { pass: false, detail: `app not ready: ${startError}` };
        else outcome = await runHttpCheck(url, check);
        results.push({ feature: feature.id, check: name, pass: outcome.pass, detail: outcome.detail });
      }
    }
  } finally {
    if (app) await app.stop();
  }
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, failed: results.length - passed, ready, features: data.features.length };
}

export function renderTable(results) {
  const rows = [["feature", "check", "result", "detail"], ...results.map((r) => [r.feature, r.check, r.pass ? "PASS" : "FAIL", r.detail])];
  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((row) => row[i].length)));
  return rows.map((row) => row.map((cell, i) => (i < 3 ? cell.padEnd(widths[i]) : cell)).join(" | ")).join("\n");
}

export function parseArgs(argv) {
  const opts = { map: null, root: null, baseUrl: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--map") opts.map = resolveUserPath(argv[++i]);
    else if (arg === "--root") opts.root = resolveUserPath(argv[++i]);
    else if (arg === "--base-url") {
      opts.baseUrl = argv[++i];
      if (!/^https?:\/\//.test(opts.baseUrl ?? "")) throw new Error("--base-url needs an http(s) URL");
    } else if (arg === "--json") opts.json = true;
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return opts;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`verify-feature-map: ${error.message}`);
    process.exit(2);
  }
  if (opts.help) {
    console.log("Usage: node scripts/verify-feature-map.mjs [--map FILE] [--root DIR] [--base-url URL] [--json]");
    return;
  }
  let report;
  try {
    report = await runFeatureMap({ map: opts.map ?? undefined, root: opts.root ?? undefined, baseUrl: opts.baseUrl ?? undefined });
  } catch (error) {
    console.error(`verify-feature-map: ${error.message}`);
    process.exit(2);
  }
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(renderTable(report.results));
    if (!report.ready) console.log("app never became ready");
    console.log(`features=${report.features} checks=${report.results.length} passed=${report.passed} failed=${report.failed}`);
  }
  process.exitCode = report.failed > 0 || !report.ready ? 1 : 0;
}

if (isMain(import.meta.url)) main();
