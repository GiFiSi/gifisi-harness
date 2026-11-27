// Managed-block helpers: render the router block and splice it into user files
// without touching a byte outside the markers.
import { readFileSync } from "node:fs";
import path from "node:path";
import { CORE, HARNESS_ROOT } from "./paths.mjs";

export const BEGIN = "<!-- gifisi-harness:begin (managed by gifisi-harness sync-harnesses.mjs; edits inside are overwritten) -->";
export const END = "<!-- gifisi-harness:end -->";
const SOURCE = "Source: core/harness/router.md + core/harness/routes.json + core/harness/manifest.json.";
export const NOTE = `<!-- ${SOURCE} Regenerate with node scripts/sync-harnesses.mjs --repo. -->`;
export const MDC_FRONTMATTER = "---\ndescription: gifisi-harness always-on router\nalwaysApply: true\n---\n";

// sync-harnesses.mjs is not installed in a project, and a global copy would re-render from its
// own stale sources, so installed targets point back at the gifisi-harness checkout.
export function noteFor(home) {
  if (home === "") return NOTE;
  const mode = home === ".gifisi/" ? "--project <this project>" : "--global";
  return `<!-- ${SOURCE} Regenerate by re-running install.sh ${mode} from the gifisi-harness checkout. -->`;
}

// A UTF-8 BOM may precede a marker on line 1 (Windows editors, PowerShell 5.1 re-saves), and a
// marker line may carry trailing spaces or tabs.
const BEGIN_LINE = /^\uFEFF?<!-- gifisi-harness:begin\b.*$/gm;
const END_LINE = /^<!-- gifisi-harness:end -->[ \t]*\r?$/gm;
export const AGENTS_IMPORT = /^\uFEFF?@AGENTS\.md[ \t]*\r?$/m;

function readJson(root, rel) {
  return JSON.parse(readFileSync(path.join(root, rel), "utf8"));
}

// HOME prefix per target: repo -> "", project -> ".gifisi/", global -> "<abs home>/.gifisi-harness/".
export function homeFor(target, homeDir) {
  if (target === "repo") return "";
  if (target === "project") return ".gifisi/";
  if (target === "global") {
    if (!homeDir) throw new Error("global target needs a home directory");
    return `${path.resolve(homeDir).split(path.sep).join("/").replace(/\/$/, "")}/.gifisi-harness/`;
  }
  throw new Error(`unknown target "${target}" (want repo, project or global)`);
}

const cell = (text) => String(text).replace(/\|/g, "\\|");

export function renderRoutesTable(routes, manifest, home) {
  const titles = new Map(manifest.playbooks.map((p) => [p.name, p.title]));
  const rows = ["| Task type | Signals (examples) | Playbook | Skills |", "|---|---|---|---|"];
  for (const route of routes.routes) {
    const title = titles.get(route.playbook);
    if (!title) throw new Error(`route "${route.id}" points at unknown playbook "${route.playbook}"`);
    const signals = route.signals.slice(0, 4).map(cell).join(", ");
    const playbook = `${cell(title)} — \`${home}${CORE}/playbooks/${route.playbook}.md\``;
    rows.push(`| ${cell(route.taskType)} | ${signals} | ${playbook} | ${route.skills.map(cell).join(", ")} |`);
  }
  return rows.join("\n");
}

export function renderPrinciplesIndex(manifest, home) {
  return manifest.principles
    .map((p) => `- **${p.title}** (${p.group}): ${p.applies_when} \`${home}${CORE}/principles/${p.name}.md\``)
    .join("\n");
}

// Rendered block with LF line endings, no trailing newline.
export function renderBlock(home, root = HARNESS_ROOT) {
  const manifest = readJson(root, `${CORE}/harness/manifest.json`);
  const routes = readJson(root, `${CORE}/harness/routes.json`);
  const template = readFileSync(path.join(root, CORE, "harness", "router.md"), "utf8").replace(/\r\n/g, "\n");
  const body = template
    .replace(/\{\{ROUTES_TABLE\}\}/g, () => renderRoutesTable(routes, manifest, home))
    .replace(/\{\{PRINCIPLES_INDEX\}\}/g, () => renderPrinciplesIndex(manifest, home))
    .replace(/\{\{HOME\}\}/g, () => home)
    .replace(/\n+$/, "");
  return [BEGIN, noteFor(home), body, END].join("\n");
}

// A block whose only body is a fixed text (CLAUDE.md import bridge).
export function wrapBlock(bodyText) {
  return [BEGIN, bodyText.replace(/\n+$/, ""), END].join("\n");
}

export function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

const withEol = (text, eol) => (eol === "\n" ? text : text.replace(/\n/g, eol));

export function countMarkers(text) {
  return { begin: (text.match(BEGIN_LINE) ?? []).length, end: (text.match(END_LINE) ?? []).length };
}

// Find the managed span: start of the begin line through the end of the end line.
export function findBlock(text) {
  const { begin, end } = countMarkers(text);
  if (begin === 0 && end === 0) return null;
  if (begin !== 1 || end !== 1) {
    throw new Error(`expected one managed block, found ${begin} begin and ${end} end markers; fix the file by hand`);
  }
  let start = text.search(BEGIN_LINE);
  if (text[start] === "\uFEFF") start += 1; // a leading BOM stays outside the block
  END_LINE.lastIndex = 0;
  const endMatch = END_LINE.exec(text);
  END_LINE.lastIndex = 0;
  if (endMatch.index < start) throw new Error("managed end marker comes before the begin marker; fix the file by hand");
  let stop = endMatch.index + endMatch[0].length;
  if (text[stop - 1] === "\r") stop -= 1;
  return { start, stop };
}

// Replace the managed block, or append it after a blank line. Bytes outside the block are kept.
export function spliceBlock(existing, blockLf) {
  const eol = detectEol(existing);
  const block = withEol(blockLf, eol);
  const span = findBlock(existing);
  if (span) return existing.slice(0, span.start) + block + existing.slice(span.stop);
  if (existing.length === 0) return block + eol;
  const base = existing.endsWith("\n") ? existing : existing + eol;
  return base + eol + block + eol;
}

// Whole-file-owned .mdc: frontmatter, then the block.
export function renderOwnedMdc(blockLf) {
  return `${MDC_FRONTMATTER}${blockLf}\n`;
}

export function isManaged(text) {
  return countMarkers(text).begin > 0;
}
