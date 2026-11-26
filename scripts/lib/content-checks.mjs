// Content and link checks shared by validate-harness.mjs.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CONTENT_DIRS = ["playbooks/", "principles/", "skills/", "prompts/", "templates/", "harness/"].map((dir) => `core/${dir}`);
const GENERATED = ["AGENTS.md", "CLAUDE.md", ".cursor/rules/poteto-harness.mdc"];
// The router renders tokens; the contributing guide lists the allowed ones.
const TOKEN_DOCS = ["core/harness/router.md", "docs/CONTRIBUTING.md"];
const SELF = ["scripts/validate-harness.mjs", "scripts/lib/content-checks.mjs"];
const TEXT = /\.(md|mdc|mjs|cjs|js|ts|mts|json|toml|sh|tsv|txt|template)$/;
const CODE = /\.(mjs|cjs|js|ts|mts)$/;

// Built from fragments so this file does not flag itself.
const UNFINISHED = [
  ["TO", "DO"], ["TB", "D"], ["FIX", "ME"], ["X", "XX"],
].map(([a, b]) => new RegExp(`\\b${a}${b}\\b`));
const FILLER = [/lorem ipsum/i, /coming soon/i, /not yet implemented/i, /insert (your|the) .* here/i];
const PLACEHOLDER_WORD = new RegExp(["place", "holder"].join(""), "i");

const VENDOR = [
  "subagent_type", "poteto-agent", "cursor-team-kit", "control-ui", "control-cli", "generalPurpose",
  "setup-pstack", "pstack-models", "watch-pr", "run_in_background", "agent-transcripts", "poteto-mode",
  "claude-opus-", "claude-fable-", "claude-sonnet-", "claude-haiku-", "gemini-", "gpt-5",
];

const rel = (root, abs) => path.relative(root, abs).split(path.sep).join("/");
const inContent = (file) => CONTENT_DIRS.some((dir) => file.startsWith(dir)) || GENERATED.includes(file);

// Remove `## Source` sections: they cite upstream paths and names on purpose.
export function stripSource(text) {
  return text.replace(/^## Source\b[\s\S]*?(?=^## |(?![\s\S]))/gm, "");
}

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

export function contentChecks({ root, files, manifest }) {
  const problems = [];
  const add = (file, message) => problems.push({ file, message });
  const skillAlternation = [...manifest.skills.map((s) => s.name), ...manifest.playbooks.map((p) => p.name),
    "deslop", "loop", "init", "review", "ultrareview", "babysit"].join("|");
  const slash = new RegExp(`(^|[\\s(\`"'])\\/(${skillAlternation})\\b(?![\\/.\\w-])`, "m");
  const tokens = new Set(manifest.templateTokens);

  for (const abs of files) {
    const file = rel(root, abs);
    if (!TEXT.test(file) || SELF.includes(file) || file === "docs/THIRD_PARTY_NOTICES.md" || file === "LICENSE") continue;
    const raw = readFileSync(abs, "utf8");
    const text = file.endsWith(".md") || file.endsWith(".mdc") ? stripSource(raw) : raw;

    for (const pattern of [...UNFINISHED, ...FILLER]) {
      if (pattern.test(text)) add(file, `unfinished-work marker or filler matches ${pattern}`);
    }
    if (CODE.test(file) && raw.split("\n").length > manifest.maxLines) {
      add(file, `${raw.split("\n").length} lines exceeds the ${manifest.maxLines}-line gate`);
    }
    if (/\.mdc?$/.test(file) && !file.startsWith("core/templates/")) {
      const headings = raw.replace(/```[\s\S]*?```/g, "").match(/^#{1,3} .+$/gm) ?? [];
      const repeated = [...new Set(headings.filter((h, i) => headings.indexOf(h) !== i))];
      if (repeated.length) add(file, `repeated heading ${repeated.join(", ")}; a section was pasted twice, keep one copy`);
    }
    if (!inContent(file) && !file.startsWith("docs/")) continue;
    if (inContent(file) && !file.startsWith("core/templates/") && PLACEHOLDER_WORD.test(text)) add(file, "uses the word placeholder; write the real content");
    for (const word of VENDOR) if (inContent(file) && text.includes(word)) add(file, `vendor-specific term "${word}"; describe the capability instead`);
    if (slash.test(text)) add(file, `slash-command invocation "${slash.exec(text)[0].trim()}"; load the skill by path`);

    const found = [...text.matchAll(/\{\{([A-Z_]+)\}\}/g)].map((m) => m[1]);
    if (file.startsWith("core/templates/")) {
      for (const token of found) if (!tokens.has(token)) add(file, `token {{${token}}} is not substituted by the installer`);
    } else if (!TOKEN_DOCS.includes(file) && found.length) {
      add(file, `template tokens are only allowed in core/templates/: ${found.join(", ")}`);
    }
  }
  return problems;
}

export function slugify(heading) {
  return heading.trim().toLowerCase().replace(/[`*_~]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
}

function anchorsOf(abs, cache) {
  if (cache.has(abs)) return cache.get(abs);
  const anchors = new Set();
  const text = readFileSync(abs, "utf8").replace(/```[\s\S]*?```/g, "");
  const seen = new Map();
  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = slugify(match[1]);
    const count = seen.get(base) ?? 0;
    anchors.add(count ? `${base}-${count}` : base);
    seen.set(base, count + 1);
  }
  for (const match of text.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(match[1]);
  cache.set(abs, anchors);
  return anchors;
}

export function linkChecks({ root, files }) {
  const problems = [];
  const cache = new Map();
  let checked = 0;
  const add = (file, message) => problems.push({ file, message });

  for (const abs of files) {
    const file = rel(root, abs);
    if (!/\.(md|mdc)$/.test(file) || file.startsWith("core/templates/") || file === "core/harness/router.md") continue;
    // Drop fences first: a fenced "## Source" format example is not a real Source section.
    const unfenced = readFileSync(abs, "utf8").replace(/```[\s\S]*?```/g, "");
    const prose = stripCode(stripSource(unfenced));

    for (const match of prose.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:)/.test(target)) continue;
      checked++;
      const [targetPath, anchor] = target.split("#");
      const resolved = targetPath ? path.resolve(path.dirname(abs), decodeURIComponent(targetPath)) : abs;
      if (!existsSync(resolved)) { add(file, `broken link ${target}`); continue; }
      if (anchor && resolved.endsWith(".md") && !anchorsOf(resolved, cache).has(anchor)) add(file, `missing anchor #${anchor} in ${target}`);
    }

    const refSource = stripSource(unfenced);
    // Bare content dirs stay in the pattern so a ref missing its core/ prefix fails as nonexistent.
    for (const match of refSource.matchAll(/`\.?\/?((?:core\/)?(?:playbooks|principles|skills|prompts|templates|scripts|harness)\/[^`\s]*)`/g)) {
      let ref = match[1].replace(/:\d+(-\d+)?$/, "").replace(/[.,;:]$/, "");
      if (/[<>*{}|]/.test(ref)) continue;
      ref = ref.replace(/\/$/, "");
      checked++;
      if (!existsSync(path.join(root, ref))) add(file, `path reference \`${match[1]}\` does not exist`);
    }
  }
  return { problems, checked };
}
