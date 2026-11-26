// The broken app used by scripts/run-autonomous-smoke-test.mjs.
// It carries three planted problems:
//   1. a bug: cart prices stay strings, so 10 + 5 concatenates to "0105";
//   2. a missing feature: the `coupon` query parameter is ignored;
//   3. a messy module: src/format-utils.mjs is generated at runtime with copy-pasted
//      per-currency formatters and is far over the 350-line gate.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// One row per currency. The messy module copies the same formatter body for each row;
// the refactor turns this table into data and keeps one formatter.
export const CURRENCY_SPECS = [
  { code: "USD", symbol: "$", decimals: 2, group: ",", point: ".", symbolAfter: false },
  { code: "EUR", symbol: "€", decimals: 2, group: ".", point: ",", symbolAfter: true },
  { code: "GBP", symbol: "£", decimals: 2, group: ",", point: ".", symbolAfter: false },
  { code: "JPY", symbol: "¥", decimals: 0, group: ",", point: ".", symbolAfter: false },
  { code: "BRL", symbol: "R$", decimals: 2, group: ".", point: ",", symbolAfter: false },
  { code: "CAD", symbol: "CA$", decimals: 2, group: ",", point: ".", symbolAfter: false },
  { code: "AUD", symbol: "A$", decimals: 2, group: ",", point: ".", symbolAfter: false },
  { code: "CHF", symbol: "CHF", decimals: 2, group: "'", point: ".", symbolAfter: true },
  { code: "INR", symbol: "₹", decimals: 2, group: ",", point: ".", symbolAfter: false },
  { code: "MXN", symbol: "MX$", decimals: 2, group: ",", point: ".", symbolAfter: false },
  { code: "SEK", symbol: "kr", decimals: 2, group: " ", point: ",", symbolAfter: true },
  { code: "KRW", symbol: "₩", decimals: 0, group: ",", point: ".", symbolAfter: false },
  { code: "PLN", symbol: "zł", decimals: 2, group: " ", point: ",", symbolAfter: true },
  { code: "ZAR", symbol: "R", decimals: 2, group: " ", point: ".", symbolAfter: false },
];

const lit = (value) => JSON.stringify(value);

// Emit one copy-pasted formatter. Every copy repeats the rounding branches,
// the digit grouping loop and the sign handling with literal constants.
function messyFormatter(spec) {
  const result = spec.symbolAfter
    ? `  var result = grouped + " " + ${lit(spec.symbol)};`
    : `  var result = ${lit(spec.symbol)} + grouped;`;
  return [
    `export function format${spec.code}(value) {`,
    "  var amount = Number(value);",
    "  if (isNaN(amount)) {",
    "    amount = 0;",
    "  }",
    "  var negative = false;",
    "  if (amount < 0) {",
    "    negative = true;",
    "    amount = amount * -1;",
    "  }",
    "  var fixed;",
    `  if (${spec.decimals} === 0) {`,
    "    fixed = String(Math.round(amount));",
    "  } else {",
    `    fixed = (Math.round(amount * ${10 ** spec.decimals}) / ${10 ** spec.decimals}).toFixed(${spec.decimals});`,
    "  }",
    "  var parts = fixed.split(\".\");",
    "  var whole = parts[0];",
    "  var grouped = \"\";",
    "  while (whole.length > 3) {",
    `    grouped = ${lit(spec.group)} + whole.slice(whole.length - 3) + grouped;`,
    "    whole = whole.slice(0, whole.length - 3);",
    "  }",
    "  grouped = whole + grouped;",
    "  if (parts.length > 1) {",
    `    grouped = grouped + ${lit(spec.point)} + parts[1];`,
    "  }",
    result,
    "  if (negative) {",
    "    result = \"-\" + result;",
    "  }",
    "  return result;",
    "}",
    "",
  ];
}

export function messyFormatUtils() {
  const lines = [
    "// Currency formatters. Each one started as a copy of formatUSD and was tweaked by hand.",
    "",
    `export var SUPPORTED = [${CURRENCY_SPECS.map((s) => lit(s.code)).join(", ")}];`,
    "",
  ];
  for (const spec of CURRENCY_SPECS) lines.push(...messyFormatter(spec));
  lines.push("export function formatMoney(code, value) {", "  switch (code) {");
  for (const spec of CURRENCY_SPECS) lines.push(`    case ${lit(spec.code)}:`, `      return format${spec.code}(value);`);
  lines.push("    default:", "      return formatUSD(value);", "  }", "}", "");
  return lines.join("\n");
}

export const PACKAGE_JSON = `${JSON.stringify({
  name: "poteto-smoke-app",
  version: "1.0.0",
  private: true,
  type: "module",
  scripts: { start: "node src/server.mjs", test: "node --test test/*.test.mjs" },
}, null, 2)}\n`;

export const SERVER_SOURCE = `import http from "node:http";
import { cartTotal } from "./cart.mjs";
import { formatUSD } from "./format-utils.mjs";

const port = Number(process.env.PORT || 3000);

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") return send(res, 200, { ok: true });
  if (url.pathname === "/api/cart/total") {
    const items = (url.searchParams.get("items") ?? "").split(",").filter(Boolean);
    const total = cartTotal(items);
    return send(res, 200, { total, currency: "USD", display: formatUSD(total) });
  }
  return send(res, 404, { error: "not found" });
});

server.listen(port, () => console.log(\`listening on \${port}\`));
`;

export const CART_SOURCE = `// Sums the prices of the items in a cart.
export function cartTotal(items) {
  return items.reduce((sum, price) => sum + price, 0);
}
`;

export const FORMAT_TEST_SOURCE = `import assert from "node:assert/strict";
import { test } from "node:test";
import { formatUSD } from "../src/format-utils.mjs";

test("formatUSD groups thousands and keeps two decimals", () => {
  assert.equal(formatUSD(1234.5), "$1,234.50");
});
`;

export const FEATURE_MAP = {
  app: { start: ["node", "src/server.mjs"], cwd: ".", portEnv: "PORT", readyPath: "/health", timeoutMs: 15000 },
  features: [
    {
      id: "health",
      description: "The server answers its readiness probe.",
      surface: "http",
      checks: [{ name: "health returns ok", request: { method: "GET", path: "/health" }, expect: { status: 200, json: { ok: true } } }],
    },
    {
      id: "cart-total",
      description: "A shopper sees the numeric total of the prices in the cart.",
      surface: "http",
      checks: [
        {
          name: "sums numeric prices",
          request: { method: "GET", path: "/api/cart/total?items=10,5" },
          expect: { status: 200, json: { total: 15, currency: "USD" }, bodyIncludes: "15" },
        },
        { name: "rejects a non-numeric price", request: { method: "GET", path: "/api/cart/total?items=10,abc" }, expect: { status: 400 } },
      ],
    },
    {
      id: "coupon",
      description: "A shopper applies a coupon code and sees the discounted total.",
      surface: "http",
      checks: [
        {
          name: "SAVE10 takes 10% off",
          request: { method: "GET", path: "/api/cart/total?items=10,5&coupon=SAVE10" },
          expect: { status: 200, json: { total: 13.5, currency: "USD" } },
        },
        { name: "rejects an unknown coupon", request: { method: "GET", path: "/api/cart/total?items=10,5&coupon=BOGUS" }, expect: { status: 400 } },
      ],
    },
  ],
};

export function brokenAppFiles() {
  return {
    "package.json": PACKAGE_JSON,
    "src/server.mjs": SERVER_SOURCE,
    "src/cart.mjs": CART_SOURCE,
    "src/format-utils.mjs": messyFormatUtils(),
    "test/format.test.mjs": FORMAT_TEST_SOURCE,
  };
}

export function writeFiles(root, files) {
  for (const [file, text] of Object.entries(files)) {
    const abs = path.join(root, file);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
}
