// Unit tests for scripts/lib/content-checks.mjs on temp fixtures.
// Marker and filler strings are built from fragments so this file does not trip the validator itself.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { contentChecks, linkChecks, slugify, stripSource } from "../lib/content-checks.mjs";

const MARKER = ["TO", "DO"].join("");
const FILLER = ["lorem", "ipsum"].join(" ");
const SLASH = "/" + "tdd";
const manifest = {
  maxLines: 350,
  skills: [{ name: "tdd" }, { name: "why" }],
  playbooks: [{ name: "bug-fix" }],
  templateTokens: ["PROJECT_NAME"],
};

function fixture(files, fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "gifisi-content-"));
  try {
    const abs = Object.entries(files).map(([rel, text]) => {
      const file = path.join(root, ...rel.split("/"));
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, text);
      return file;
    });
    return fn({ root, files: abs });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const messagesFor = (problems, file) => problems.filter((p) => p.file === file).map((p) => p.message).join("\n");

test("unfinished markers and filler are caught in any text file", () => fixture({
  "core/playbooks/a.md": `# A\n\n## Steps\n1. ${MARKER} write this step.\n`,
  "scripts/b.mjs": `// ${FILLER}\nexport const x = 1;\n`,
  "core/playbooks/clean.md": "# Clean\n\nEvery step is written.\n",
}, ({ root, files }) => {
  const problems = contentChecks({ root, files, manifest });
  assert.match(messagesFor(problems, "core/playbooks/a.md"), /unfinished-work marker/);
  assert.match(messagesFor(problems, "scripts/b.mjs"), /unfinished-work marker or filler/);
  assert.equal(messagesFor(problems, "core/playbooks/clean.md"), "");
}));

test("slash-command invocations are caught, paths and the Source section are exempt", () => fixture({
  "core/skills/x/SKILL.md": `# X\n\nRun ${SLASH} before you fix.\n`,
  "core/playbooks/ok.md": [
    "# Ok", "", "Load `core/skills/tdd/SKILL.md` and read docs/tdd.md first.", "", "## Source", "",
    `Adapted from the upstream ${SLASH} command and ${MARKER} list in pstack (MIT).`, "",
  ].join("\n"),
  "docs/guide.md": `Type (${SLASH}) in chat.\n`,
}, ({ root, files }) => {
  const problems = contentChecks({ root, files, manifest });
  assert.match(messagesFor(problems, "core/skills/x/SKILL.md"), /slash-command invocation/);
  assert.match(messagesFor(problems, "docs/guide.md"), /slash-command invocation/);
  assert.equal(messagesFor(problems, "core/playbooks/ok.md"), "");
}));

test("stripSource removes only the Source section", () => {
  const text = "# T\n\n## Rule\nKeep.\n\n## Source\nUpstream text.\n\n## After\nAlso kept.\n";
  const stripped = stripSource(text);
  assert.match(stripped, /Keep\./);
  assert.match(stripped, /Also kept\./);
  assert.doesNotMatch(stripped, /Upstream text/);
});

test("template tokens are allowed only in templates and must be known", () => fixture({
  "core/templates/a.md.template": "# {{PROJECT_NAME}} uses {{UNKNOWN_TOKEN}}\n",
  "core/playbooks/p.md": "# P\n\nName {{PROJECT_NAME}} here.\n",
}, ({ root, files }) => {
  const problems = contentChecks({ root, files, manifest });
  assert.match(messagesFor(problems, "core/templates/a.md.template"), /UNKNOWN_TOKEN/);
  assert.doesNotMatch(messagesFor(problems, "core/templates/a.md.template"), /PROJECT_NAME/);
  assert.match(messagesFor(problems, "core/playbooks/p.md"), /only allowed in core\/templates/);
}));

test("code files over the line gate are flagged", () => fixture({
  "scripts/long.mjs": "export const a = 1;\n".repeat(351),
  "scripts/short.mjs": "export const a = 1;\n".repeat(10),
}, ({ root, files }) => {
  const problems = contentChecks({ root, files, manifest });
  assert.match(messagesFor(problems, "scripts/long.mjs"), /exceeds the 350-line gate/);
  assert.equal(messagesFor(problems, "scripts/short.mjs"), "");
}));

test("broken links, missing anchors and missing path references are caught", () => fixture({
  "docs/a.md": [
    "# A", "",
    "See [missing](missing.md), [bad anchor](b.md#nope), [good anchor](b.md#deep-dive) and [self](#a).",
    "Load `core/skills/tdd/SKILL.md` and `core/skills/absent/SKILL.md`; ignore `<project>/scripts/x.mjs`.",
    "A ref without its core/ prefix, `skills/tdd/SKILL.md`, is stale.",
    "", "## Source", "", "[upstream](not-here.md) and `skills/upstream/SKILL.md` are exempt.", "",
  ].join("\n"),
  "docs/b.md": "# B\n\n## Deep Dive\n\nText.\n",
  "core/skills/tdd/SKILL.md": "# TDD\n",
}, ({ root, files }) => {
  const { problems, checked } = linkChecks({ root, files });
  const messages = messagesFor(problems, "docs/a.md");
  assert.match(messages, /broken link missing\.md/);
  assert.match(messages, /missing anchor #nope in b\.md#nope/);
  assert.match(messages, /path reference `core\/skills\/absent\/SKILL\.md` does not exist/);
  assert.match(messages, /path reference `skills\/tdd\/SKILL\.md` does not exist/);
  assert.doesNotMatch(messages, /deep-dive|#a\b|core\/skills\/tdd|<project>|not-here|upstream/);
  assert.equal(problems.length, 4);
  assert.ok(checked >= 6, `checked=${checked}`);
}));

test("a fenced Source format example does not hide the prose after it", () => fixture({
  "docs/format.md": "# Format\n\n```markdown\n## Source\n```\n\nNames come from `core/harness/gone.json`.\n",
}, ({ root, files }) => {
  const { problems } = linkChecks({ root, files });
  assert.match(messagesFor(problems, "docs/format.md"), /path reference `core\/harness\/gone\.json` does not exist/);
}));

test("slugify matches the anchors markdown renderers produce", () => {
  assert.equal(slugify("Done Predicate"), "done-predicate");
  assert.equal(slugify("Step `notes`: A/B"), "step-notes-ab");
});

test("a section pasted twice is caught, fenced format examples are not", () => fixture({
  "docs/architecture.md": "# Architecture\n\n## Script map\n\nOne.\n\n## Script map\n\nOne again.\n",
  "docs/CONTRIBUTING.md": "# Contributing\n\n## Source\n\n```markdown\n## Source\n```\n",
}, ({ root, files }) => {
  const problems = contentChecks({ root, files, manifest });
  assert.match(messagesFor(problems, "docs/architecture.md"), /repeated heading ## Script map/);
  assert.equal(messagesFor(problems, "docs/CONTRIBUTING.md"), "");
}));
