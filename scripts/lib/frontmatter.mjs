// Minimal frontmatter parser for harness files.
// Supports `key: value`, quoted strings, and inline lists `[a, b]`.
// Harness frontmatter never nests, so a full YAML parser would only add a dependency.

export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { data: null, body: normalized };
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return { data: null, body: normalized };
  const header = normalized.slice(4, end);
  const afterFence = normalized.indexOf("\n", end + 1);
  const body = afterFence === -1 ? "" : normalized.slice(afterFence + 1);
  const data = {};
  for (const line of header.split("\n")) {
    if (!line.trim()) continue;
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!match) throw new Error(`Unparseable frontmatter line: ${line}`);
    data[match[1]] = parseValue(match[2].trim());
  }
  return { data, body };
}

function parseValue(raw) {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => unquote(item.trim())).filter(Boolean);
  }
  return unquote(raw);
}

function unquote(value) {
  const quoted = /^"(.*)"$/.exec(value) ?? /^'(.*)'$/.exec(value);
  return quoted ? quoted[1] : value;
}

export function sections(body, level = 2) {
  const marker = "#".repeat(level) + " ";
  const result = new Map();
  let current = null;
  let fence = false;
  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) fence = !fence;
    if (!fence && line.startsWith(marker)) {
      current = line.slice(marker.length).trim();
      result.set(current, []);
      continue;
    }
    if (!fence && current && /^#{1,6} /.test(line) && line.match(/^#+/)[0].length <= level) current = null;
    if (current) result.get(current).push(line);
  }
  return new Map([...result].map(([key, lines]) => [key, lines.join("\n").trim()]));
}

export function numberedItems(sectionText) {
  return sectionText
    .split("\n")
    .filter((line) => /^\d+\.\s+\S/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, ""));
}
