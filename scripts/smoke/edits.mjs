// Scripted stand-ins for the changes an agent makes during the smoke run.
// Each edit is a whole new file or an exact string replacement that must match once,
// so a drifted fixture fails loudly instead of being patched silently.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CURRENCY_SPECS } from "./fixture.mjs";

export function replaceOnce(root, file, before, after) {
  const abs = path.join(root, file);
  const text = readFileSync(abs, "utf8");
  const count = text.split(before).length - 1;
  if (count !== 1) throw new Error(`edit to ${file} expected one match, found ${count}`);
  writeFileSync(abs, text.replace(before, after));
}

export const TASKS = {
  bug: {
    prompt: "The cart total endpoint is broken: it returns 0105 instead of 15 for items 10,5",
    expectedPlaybook: "bug-fix",
    feature: "cart-total",
  },
  feature: {
    prompt: "Add support for coupon codes: SAVE10 should take 10% off the cart total",
    expectedPlaybook: "feature",
    feature: "coupon",
  },
  refactor: {
    prompt: "Refactor the messy format-utils module, it is over 350 lines and duplicated",
    expectedPlaybook: "refactoring",
  },
};

// Task a: the regression test written before the fix. It fails on "0105".
export const CART_TEST = `import assert from "node:assert/strict";
import { test } from "node:test";
import { cartTotal } from "../src/cart.mjs";

test("cartTotal sums query-string prices as numbers", () => {
  assert.equal(cartTotal(["10", "5"]), 15);
});

test("cartTotal rejects a price that is not a number", () => {
  assert.throws(() => cartTotal(["10", "abc"]), /invalid price/);
});
`;

// Task a: the root-cause fix. Prices are parsed where they enter the domain.
export const CART_FIXED = `// Sums the prices of the items in a cart. Prices arrive as query-string text,
// so they are parsed here, at the boundary, and summed in integer cents.
export class InvalidCartError extends Error {}

function parsePrice(raw) {
  const text = String(raw).trim();
  const price = Number(text);
  if (text === "" || !Number.isFinite(price) || price < 0) throw new InvalidCartError(\`invalid price: \${raw}\`);
  return price;
}

function totalCents(items) {
  return items.map(parsePrice).reduce((sum, price) => sum + Math.round(price * 100), 0);
}

export function cartTotal(items) {
  return totalCents(items) / 100;
}
`;

export const SERVER_FIX = {
  before: `import { cartTotal } from "./cart.mjs";`,
  after: `import { InvalidCartError, cartTotal } from "./cart.mjs";`,
  beforeBody: `    const total = cartTotal(items);
    return send(res, 200, { total, currency: "USD", display: formatUSD(total) });`,
  afterBody: `    try {
      const total = cartTotal(items);
      return send(res, 200, { total, currency: "USD", display: formatUSD(total) });
    } catch (error) {
      if (error instanceof InvalidCartError) return send(res, 400, { error: error.message });
      throw error;
    }`,
};

// Task b: the coupon behavior test written before the feature.
export const COUPON_TEST = `import assert from "node:assert/strict";
import { test } from "node:test";
import { cartTotal } from "../src/cart.mjs";

test("SAVE10 takes 10% off the cart total", () => {
  assert.equal(cartTotal(["10", "5"], { coupon: "SAVE10" }), 13.5);
});

test("an unknown coupon is rejected", () => {
  assert.throws(() => cartTotal(["10", "5"], { coupon: "BOGUS" }), /unknown coupon/);
});
`;

export const COUPONS_MODULE = `// Coupon codes and the discount each one grants. Add a code by adding a row.
const COUPONS = {
  SAVE10: { percentOff: 10 },
};

export function findCoupon(code) {
  return COUPONS[String(code).trim().toUpperCase()] ?? null;
}

export function applyCoupon(cents, coupon) {
  return Math.round((cents * (100 - coupon.percentOff)) / 100);
}
`;

export const CART_COUPON = {
  importBefore: `// Sums the prices of the items in a cart.`,
  importAfter: `import { applyCoupon, findCoupon } from "./coupons.mjs";

// Sums the prices of the items in a cart.`,
  before: `export function cartTotal(items) {
  return totalCents(items) / 100;
}`,
  after: `export function cartTotal(items, { coupon } = {}) {
  const cents = totalCents(items);
  if (!coupon) return cents / 100;
  const found = findCoupon(coupon);
  if (!found) throw new InvalidCartError(\`unknown coupon: \${coupon}\`);
  return applyCoupon(cents, found) / 100;
}`,
};

export const SERVER_COUPON = {
  before: `    try {
      const total = cartTotal(items);`,
  after: `    const coupon = url.searchParams.get("coupon");
    try {
      const total = cartTotal(items, { coupon });`,
};

// Task c: the table-driven replacement for the messy module, split in two files.
export function currencyTableModule() {
  const q = (value) => JSON.stringify(value);
  const rows = CURRENCY_SPECS.map((s) =>
    `  ${s.code}: { symbol: ${q(s.symbol)}, decimals: ${s.decimals}, group: ${q(s.group)}, point: ${q(s.point)}, symbolAfter: ${s.symbolAfter} },`);
  return ["// One row per supported currency. Order matters: it is the order of SUPPORTED.", "export const CURRENCIES = {", ...rows, "};", ""].join("\n");
}

export function tableDrivenFormatUtils() {
  return [
    "// Currency formatting driven by the CURRENCIES table. One formatter, one row per currency.",
    'import { CURRENCIES } from "./format/currencies.mjs";',
    "",
    "export const SUPPORTED = Object.keys(CURRENCIES);",
    "",
    "function groupDigits(whole, separator) {",
    "  let grouped = \"\";",
    "  let rest = whole;",
    "  while (rest.length > 3) {",
    "    grouped = separator + rest.slice(-3) + grouped;",
    "    rest = rest.slice(0, -3);",
    "  }",
    "  return rest + grouped;",
    "}",
    "",
    "function roundTo(amount, decimals) {",
    "  if (decimals === 0) return String(Math.round(amount));",
    "  const factor = 10 ** decimals;",
    "  return (Math.round(amount * factor) / factor).toFixed(decimals);",
    "}",
    "",
    "function formatWith(spec, value) {",
    "  const number = Number(value);",
    "  const amount = Number.isNaN(number) ? 0 : number;",
    "  const negative = amount < 0;",
    "  const [whole, fraction] = roundTo(negative ? -amount : amount, spec.decimals).split(\".\");",
    "  let digits = groupDigits(whole, spec.group);",
    "  if (fraction !== undefined) digits += spec.point + fraction;",
    "  const text = spec.symbolAfter ? `${digits} ${spec.symbol}` : spec.symbol + digits;",
    "  return negative ? `-${text}` : text;",
    "}",
    "",
    "export function formatMoney(code, value) {",
    "  return formatWith(CURRENCIES[code] ?? CURRENCIES.USD, value);",
    "}",
    "",
    ...CURRENCY_SPECS.map((s) => `export const format${s.code} = (value) => formatWith(CURRENCIES.${s.code}, value);`),
    "",
  ].join("\n");
}

// Inputs for the characterization run: ordinary values, rounding edges, signs, text, junk.
export const CHARACTERIZATION_INPUTS = [0, 1, -1, 0.5, 0.005, 12.345, 999.995, 1234.5, -9876.543, 1234567.891, "42", " 7.1 ", "abc", null, -0.004];

// Child-process script: imports the module named by GIFISI_CHAR_FILE and prints every
// export applied to every input as JSON. A fresh process avoids the ESM module cache.
export const CHARACTERIZE_SCRIPT = `
import { pathToFileURL } from "node:url";
const inputs = JSON.parse(process.env.GIFISI_CHAR_INPUTS);
const mod = await import(pathToFileURL(process.env.GIFISI_CHAR_FILE).href);
const out = {};
for (const name of Object.keys(mod).sort()) {
  const value = mod[name];
  if (typeof value !== "function") out[name] = { value };
  else if (name === "formatMoney") out[name] = [...(mod.SUPPORTED ?? []), "ZZZ"].map((code) => inputs.map((x) => value(code, x)));
  else out[name] = inputs.map((x) => value(x));
}
console.log(JSON.stringify(out));
`;
