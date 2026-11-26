// Unit tests for scripts/lib/frontmatter.mjs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { numberedItems, parseFrontmatter, sections } from "../lib/frontmatter.mjs";

test("parses scalars, quoted strings and inline lists", () => {
  const { data, body } = parseFrontmatter([
    "---",
    "name: bug-fix",
    'title: "Bug fix"',
    "summary: 'Quoted: with colon'",
    "skills: [why, tdd, blast-radius]",
    "principles: []",
    "---",
    "# Bug fix",
    "",
  ].join("\n"));
  assert.deepEqual(data, {
    name: "bug-fix", title: "Bug fix", summary: "Quoted: with colon", skills: ["why", "tdd", "blast-radius"], principles: [],
  });
  assert.equal(body, "# Bug fix\n");
});

test("CRLF input parses the same as LF", () => {
  const { data, body } = parseFrontmatter("---\r\nname: x\r\n---\r\nBody line\r\n");
  assert.deepEqual(data, { name: "x" });
  assert.equal(body, "Body line\n");
});

test("text without frontmatter returns null data and the whole body", () => {
  assert.deepEqual(parseFrontmatter("# Title\n"), { data: null, body: "# Title\n" });
  assert.equal(parseFrontmatter("---\nname: open\n").data, null, "an unclosed fence is not frontmatter");
});

test("an unparseable header line throws", () => {
  assert.throws(() => parseFrontmatter("---\n- not a key\n---\n"), /Unparseable frontmatter line/);
});

test("sections splits on level-2 headings and ignores headings inside fences", () => {
  const body = [
    "# Title", "", "## When to use", "Often.", "", "## Steps", "1. One.", "```", "## Not a heading", "```", "2. Two.",
    "### Detail", "Nested text.", "# Next top", "Outside.",
  ].join("\n");
  const found = sections(body);
  assert.deepEqual([...found.keys()], ["When to use", "Steps"]);
  assert.equal(found.get("When to use"), "Often.");
  assert.match(found.get("Steps"), /## Not a heading/);
  assert.match(found.get("Steps"), /### Detail\nNested text\./);
  assert.doesNotMatch(found.get("Steps"), /Outside/);
});

test("numberedItems keeps only numbered lines and strips the numbers", () => {
  assert.deepEqual(numberedItems("Intro\n1. First step.\n  - bullet\n2.  Second step.\n10. Tenth.\n3.\n"), [
    "First step.", "Second step.", "Tenth.",
  ]);
});
