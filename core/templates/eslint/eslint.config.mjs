// ESLint 9 flat config with the poteto-harness quality gates.
// Copy to <project>/eslint.config.mjs and eslint-rules/index.cjs beside it.
// If the project already has a config, merge the "quality" blocks into it and
// keep every existing rule and severity. Later blocks override earlier ones,
// so a block that turns a rule off must come after the block that turns it on.
//
// Required: eslint@^9. Optional, loaded when installed: @eslint/js (recommended
// rules), typescript-eslint (parses .ts/.tsx/.mts/.cts), globals (browser and
// node globals). Without typescript-eslint only JavaScript files are linted.
// Without globals, no-undef is turned off: it cannot tell process or window
// from a typo, and TypeScript already catches undefined names in .ts files.
import quality from "./eslint-rules/index.cjs";

async function optional(name) {
  try {
    const mod = await import(name);
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

const js = await optional("@eslint/js");
const tseslint = await optional("typescript-eslint");
const globals = await optional("globals");

const JS_FILES = ["**/*.{js,mjs,cjs,jsx}"];
const TS_FILES = ["**/*.{ts,tsx,mts,cts}"];
const SOURCE_FILES = tseslint ? [...JS_FILES, ...TS_FILES] : JS_FILES;
const TEST_FILES = ["**/*.{test,spec}.{js,mjs,cjs,jsx,ts,tsx,mts,cts}", "**/__tests__/**", "test/**", "tests/**"];

// Adapt these three to the project (see core/skills/quality-gates/SKILL.md):
// the module that exports the database client, the presentation directories
// that must not import it, and the file that wraps console output.
const DATA_MODULES = ["@/db", "@/db/index", "~/db"];
const PRESENTATION_LAYERS = ["/src/app/", "/src/components/", "/app/", "/components/"];
const LOG_ADAPTERS = ["src/lib/logger.ts", "src/lib/logger.js"];

const MAX_LINES = 350;

export default [
  {
    ignores: [
      "**/node_modules/**", "**/dist/**", "**/build/**", "**/out/**", "**/.next/**", "**/coverage/**",
      "**/.turbo/**", "**/drizzle/**", "**/graphify-out/**", "**/.poteto/**", "**/.claude/**",
      "**/.codex/**", "**/.cursor/**", "**/*.d.ts", "next-env.d.ts",
    ],
  },
  ...(js ? [{ files: JS_FILES, ...js.configs.recommended }] : []),
  ...(tseslint ? tseslint.configs.recommended.map((config) => ({ files: TS_FILES, ...config })) : []),
  {
    files: SOURCE_FILES,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      // JSX in .js/.jsx files (React, Next without TypeScript): espree rejects it unless this is on.
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals ? { ...globals.browser, ...globals.node } : {},
    },
    plugins: { quality },
    rules: {
      "quality/max-lines": ["error", { max: MAX_LINES, skipBlankLines: true, skipComments: true }],
      "quality/no-direct-console": ["error", { logger: "the project logger" }],
      "quality/no-direct-data-access": ["error", { modules: DATA_MODULES, layers: PRESENTATION_LAYERS, bindings: ["db", "getDb"] }],
      "no-debugger": "error",
      ...(globals ? {} : { "no-undef": "off" }),
    },
  },
  {
    // CommonJS sources, including the local rule file itself.
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
    rules: tseslint ? { "@typescript-eslint/no-require-imports": "off" } : {},
  },
  {
    // Tests get their own budget as a warning; production keeps the error.
    files: TEST_FILES,
    rules: {
      "quality/max-lines": ["warn", { max: MAX_LINES, skipBlankLines: true, skipComments: true, includeTests: true }],
    },
  },
  {
    // The log adapter is the one place allowed to write to the console.
    files: LOG_ADAPTERS,
    rules: { "quality/no-direct-console": "off" },
  },
  {
    // Scripts and config files talk to a terminal on purpose.
    files: ["scripts/**", "*.config.{js,mjs,cjs,ts,mts}"],
    rules: { "quality/no-direct-console": "off" },
  },
];
