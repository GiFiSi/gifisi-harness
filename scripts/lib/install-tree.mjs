// File operations for the installer: write only when bytes differ, report every action,
// and track copied files in .installed.json so removed sources get pruned.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

export const INSTALLED_FILE = ".installed.json";

const toBuffer = (content) => (Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8"));
const posix = (value) => value.split(path.sep).join("/");

export class Installer {
  constructor({ root, dryRun = false, out = (line) => console.log(line) }) {
    this.root = path.resolve(root);
    this.dryRun = dryRun;
    this.out = out;
    this.writes = 0;
    this.actions = [];
  }

  label(abs) {
    const rel = posix(path.relative(this.root, abs));
    return rel && !rel.startsWith("..") ? rel : posix(abs);
  }

  log(action, abs, note = "") {
    this.actions.push({ action, file: this.label(abs) });
    if (["create", "update", "remove"].includes(action)) this.writes++;
    this.out(`${action.padEnd(9)} ${this.label(abs)}${note ? ` ${note}` : ""}`);
  }

  write(abs, buffer) {
    if (this.dryRun) return;
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, buffer);
  }

  // Returns the action taken: create, update or unchanged.
  writeIfDifferent(abs, content, { quiet = false } = {}) {
    const buffer = toBuffer(content);
    let action = "create";
    if (existsSync(abs)) {
      if (!statSync(abs).isFile()) throw new Error(`${abs} exists and is not a file`);
      action = readFileSync(abs).equals(buffer) ? "unchanged" : "update";
    }
    if (action !== "unchanged") this.write(abs, buffer);
    if (!(quiet && action === "unchanged")) this.log(action, abs);
    return action;
  }

  // User-owned files: created once, never rewritten.
  createIfMissing(abs, content) {
    if (existsSync(abs)) {
      this.log("skip", abs, "(exists, preserved)");
      return "skip";
    }
    this.write(abs, toBuffer(content));
    this.log("create", abs);
    return "create";
  }

  remove(abs) {
    if (!this.dryRun) {
      unlinkSync(abs);
      pruneEmptyDirs(path.dirname(abs), this.root);
    }
    this.log("remove", abs);
  }

  // Prune files the previous install listed that are no longer in the source, then copy
  // `entries` ([{ src, rel }]) under destRoot. Files never listed are never touched.
  // Pruning first matters on case-insensitive filesystems: after a case-only rename
  // (Guide.md -> guide.md) the old name is the same file as the new one, so removing it after
  // the copy would delete the file just written.
  copyTree(entries, destRoot) {
    const listFile = path.join(destRoot, INSTALLED_FILE);
    const previous = readInstalled(listFile);
    const current = [...new Set(entries.map((e) => e.rel))].sort();
    const keep = new Set(current);
    for (const rel of previous) {
      if (keep.has(rel) || !isSafeRelative(rel)) continue;
      const abs = path.join(destRoot, rel);
      if (existsSync(abs) && statSync(abs).isFile()) this.remove(abs);
    }
    let unchanged = 0;
    for (const { src, rel } of [...entries].sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))) {
      const action = this.writeIfDifferent(path.join(destRoot, rel), readFileSync(src), { quiet: true });
      if (action === "unchanged") unchanged++;
    }
    this.writeIfDifferent(listFile, `${JSON.stringify({ files: current }, null, 2)}\n`);
    if (unchanged) this.out(`unchanged ${this.label(destRoot)}/ (${unchanged} files)`);
  }
}

function readInstalled(file) {
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
    return Array.isArray(data.files) ? data.files.filter((f) => typeof f === "string") : [];
  } catch (error) {
    throw new Error(`${file} is not valid JSON (${error.message}); remove it to reinstall`);
  }
}

// Only prune plain relative paths inside the harness home.
function isSafeRelative(rel) {
  return rel.length > 0 && !path.isAbsolute(rel) && !rel.split(/[\\/]/).includes("..");
}

function pruneEmptyDirs(dir, stopAt) {
  let current = dir;
  while (current.startsWith(stopAt) && current !== stopAt) {
    if (readdirSync(current).length) return;
    rmdirSync(current);
    current = path.dirname(current);
  }
}

// List files under `relDirs` of `srcRoot`, recursively, skipping excluded directory names.
export function collectFiles(srcRoot, relDirs, { exclude = [] } = {}) {
  const out = [];
  const visit = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === ".DS_Store") continue;
      const childAbs = path.join(abs, entry.name);
      const childRel = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!exclude.includes(entry.name) && !exclude.includes(childRel)) visit(childAbs, childRel);
      } else if (entry.isFile()) {
        out.push({ src: childAbs, rel: childRel });
      }
    }
  };
  for (const dir of relDirs) {
    const abs = path.join(srcRoot, dir);
    if (existsSync(abs) && statSync(abs).isDirectory()) visit(abs, dir);
  }
  return out;
}

// Named files; every one must exist or the install stops before writing anything.
export function requireFiles(srcRoot, rels) {
  const missing = rels.filter((rel) => !existsSync(path.join(srcRoot, rel)));
  if (missing.length) {
    throw new Error(`harness source is incomplete; missing: ${missing.join(", ")}`);
  }
  return rels.map((rel) => ({ src: path.join(srcRoot, rel), rel }));
}
