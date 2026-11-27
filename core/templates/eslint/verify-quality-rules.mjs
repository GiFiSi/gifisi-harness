#!/usr/bin/env node
// Self-check for the local quality/* ESLint rules. It proves each rule fires
// on a bad sample and stays quiet on a good one, using ESLint's own
// RuleTester and nothing else. When the project has an eslint.config.mjs, it
// also lints one JSX sample through that config.
//
// Usage, from the project root after copying the templates:
//   node scripts/verify-quality-rules.mjs [path/to/eslint-rules/index.cjs] [--project DIR]
// ESLint is loaded from the project (DIR, default: the current directory).
// Exit codes: 0 all cases pass, 1 a case failed, 2 ESLint or the plugin is missing.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const projectFlag = args.indexOf("--project");
const projectDir = path.resolve(projectFlag >= 0 ? args[projectFlag + 1] ?? "." : ".");
const positional = args.filter((arg, i) => !arg.startsWith("--") && args[i - 1] !== "--project");

function stop(message) {
  process.stderr.write(`verify-quality-rules: ${message}\n`);
  process.exit(2);
}

function loadEslint() {
  const require = createRequire(path.join(projectDir, "package.json"));
  let pkgPath;
  try {
    pkgPath = require.resolve("eslint/package.json");
  } catch {
    stop(`ESLint is not installed in ${projectDir}. Install it as a dev dependency (eslint@^9) with the project's package manager, then run this check again.`);
  }
  const version = require(pkgPath).version;
  if (Number(version.split(".")[0]) < 9) stop(`ESLint ${version} found; these rules and the flat config need ESLint 9 or newer.`);
  return { eslint: require("eslint"), version };
}

function pluginPath() {
  const candidates = [
    positional[0] && path.resolve(positional[0]),
    path.join(projectDir, "eslint-rules", "index.cjs"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "eslint-rules", "index.cjs"),
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) stop(`plugin not found; looked in: ${candidates.join(", ")}`);
  return found;
}

const { eslint, version } = loadEslint();
const target = pluginPath();
const plugin = (await import(pathToFileURL(target).href)).default;
const tester = new eslint.RuleTester();

// Unique identifiers per line: a repeated declaration is a parse error.
const code = (count, prefix = "value") => Array.from({ length: count }, (_, i) => `const ${prefix}${i} = ${i};`).join("\n") + "\n";
const commented = code(8) + Array.from({ length: 20 }, (_, i) => `// note ${i}\n\n/* block ${i} */`).join("\n") + "\n";
const max10 = [{ max: 10 }];

const suites = {
  "max-lines": {
    valid: [
      { name: "file under the budget", code: code(5), filename: "src/service.ts", options: max10 },
      { name: "blank and comment lines are not counted", code: commented, filename: "src/service.ts", options: max10 },
      { name: "test files are exempt by default", code: code(20), filename: "src/service.test.ts", options: max10 },
      { name: "pure re-export barrel is exempt", code: Array.from({ length: 20 }, (_, i) => `export * from "./m${i}";`).join("\n"), filename: "src/index.ts", options: max10 },
      { name: "generated output is never checked", code: code(20), filename: "src/generated/client.ts", options: max10 },
      { name: "a baseline entry silences a known file", code: code(20), filename: "/repo/src/legacy.ts", options: [{ max: 10, ignore: ["src/legacy.ts"] }] },
    ],
    invalid: [
      { name: "file over the budget", code: code(20), filename: "src/service.ts", options: max10, errors: [{ messageId: "tooLong" }] },
      { name: "comments do not hide code over the budget", code: code(12) + "// trailing note\n", filename: "src/service.ts", options: max10, errors: [{ messageId: "tooLong" }] },
      { name: "counting blank lines when asked", code: code(6) + "\n".repeat(10) + "const tail = 1;\n", filename: "src/service.ts", options: [{ max: 10, skipBlankLines: false }], errors: [{ messageId: "tooLong" }] },
      { name: "includeTests brings tests under a budget", code: code(20), filename: "src/service.test.ts", options: [{ max: 10, includeTests: true }], errors: [{ messageId: "tooLong" }] },
    ],
  },
  "no-direct-console": {
    valid: [
      { name: "logger call", code: "logger.info('ready');", filename: "src/service.ts" },
      { name: "test files may log", code: "console.log('debug');", filename: "src/service.test.ts" },
      { name: "allowed method", code: "console.error('boom');", filename: "src/service.ts", options: [{ allow: ["error"] }] },
      { name: "identifier that only ends in console", code: "myconsole.log('x');", filename: "src/service.ts" },
    ],
    invalid: [
      { name: "direct console.log", code: "console.log('x');", filename: "src/service.ts", errors: [{ messageId: "banned" }] },
      { name: "logger option names the fix", code: "console.warn('x');", filename: "src/service.ts", options: [{ logger: "logger.warn" }], errors: [{ message: "Use logger.warn instead of console.warn()." }] },
    ],
  },
  "no-direct-data-access": {
    valid: [
      { name: "repository layer may import the client", code: "import { db } from '@/db';", filename: "/repo/src/server/users.ts", options: [{ modules: ["@/db"], layers: ["/src/app/"] }] },
      { name: "presentation imports another binding", code: "import { schema } from '@/db';", filename: "/repo/src/app/page.ts", options: [{ modules: ["@/db"], layers: ["/src/app/"] }] },
      { name: "side-effect import pulls no binding", code: "import '@/db';", filename: "/repo/src/app/page.ts", options: [{ modules: ["@/db"], layers: ["/src/app/"] }] },
      { name: "test files are exempt", code: "import { db } from '@/db';", filename: "/repo/src/app/page.test.ts", options: [{ modules: ["@/db"], layers: ["/src/app/"] }] },
    ],
    invalid: [
      { name: "presentation imports the client", code: "import { db } from '@/db';", filename: "/repo/src/app/page.ts", options: [{ modules: ["@/db"], layers: ["/src/app/"] }], errors: [{ messageId: "forbidden" }] },
      { name: "an alias does not hide the client", code: "import { db as database } from '@/db';", filename: "/repo/src/app/page.ts", options: [{ modules: ["@/db"], layers: ["/src/app/"] }], errors: [{ messageId: "forbidden" }] },
      { name: "namespace import counts", code: "import * as data from '@/db';", filename: "/repo/src/app/page.ts", options: [{ modules: ["@/db"], layers: ["/src/app/"] }], errors: [{ messageId: "forbidden" }] },
      { name: "guarded extension anywhere", code: "import { db } from '@/db';", filename: "/repo/src/lib/widget.tsx", options: [{ modules: ["@/db"], layers: ["/src/app/"], extensions: [".tsx"] }], errors: [{ messageId: "forbidden" }] },
    ],
  },
};

let failed = 0;
let cases = 0;
for (const [rule, suite] of Object.entries(suites)) {
  const impl = plugin?.rules?.[rule];
  if (!impl) {
    process.stdout.write(`FAIL quality/${rule}: rule is not exported by ${target}\n`);
    failed++;
    continue;
  }
  cases += suite.valid.length + suite.invalid.length;
  try {
    // Without a global test runner, RuleTester runs synchronously and throws on the first failing case.
    tester.run(`quality/${rule}`, impl, suite);
    process.stdout.write(`PASS quality/${rule}: ${suite.invalid.length} bad samples reported, ${suite.valid.length} good samples quiet\n`);
  } catch (error) {
    failed++;
    process.stdout.write(`FAIL quality/${rule}: ${String(error.message).split("\n").slice(0, 6).join(" | ")}\n`);
  }
}

// Lint one JSX sample through the project's own flat config, so a config that cannot parse
// JSX (or fails to load) is caught here and not only on the first real component.
// SKIP (not PASS) when no config exists or no sample path is linted by it, so a pass always means a real lint.
const configName = ["js", "mjs", "cjs", "ts", "mts", "cts"].map((ext) => `eslint.config.${ext}`).find((name) => existsSync(path.join(projectDir, name)));
let configChecked = "SKIP";
if (!configName) {
  process.stdout.write("SKIP no eslint.config.* in the project; the JSX config check did not run\n");
} else {
  const sample = ["export function Badge({ label }) {", '  return <span className="badge">{label}</span>;', "}", ""].join("\n");
  try {
    // No overrideConfigFile: ESLint finds the project's config the same way `eslint .` does.
    const linter = new eslint.ESLint({ cwd: projectDir });
    let samplePath = null;
    for (const dir of ["src", "app", "components", "pages", "lib", "."]) {
      const candidate = path.join(projectDir, dir, "gifisi-jsx-sample.jsx");
      if (!(await linter.isPathIgnored(candidate)) && (await linter.calculateConfigForFile(candidate))) {
        samplePath = candidate;
        break;
      }
    }
    if (!samplePath) {
      process.stdout.write(`SKIP ${configName} lints no .jsx path (src, app, components, pages, lib, root); add .jsx to its files globs if the project has JSX\n`);
    } else {
      const [report] = await linter.lintText(sample, { filePath: samplePath });
      const messages = report?.messages ?? [];
      const fatal = messages.filter((message) => message.fatal);
      if (!report || messages.some((message) => /File ignored/i.test(message.message))) {
        process.stdout.write(`SKIP ${configName} did not lint ${path.relative(projectDir, samplePath)}\n`);
      } else {
        configChecked = fatal.length ? "FAIL" : "PASS";
        if (fatal.length) failed++;
        process.stdout.write(`${configChecked} ${configName} parses JSX in ${path.relative(projectDir, samplePath)}${fatal.length ? `: ${fatal[0].message}` : ""}\n`);
      }
    }
  } catch (error) {
    configChecked = "FAIL";
    failed++;
    process.stdout.write(`FAIL ${configName} could not lint a JSX sample: ${String(error.message).split("\n")[0]}\n`);
  }
}

process.stdout.write(`eslint=${version} plugin=${path.relative(projectDir, target) || target} rules=${Object.keys(suites).length} cases=${cases} config=${configChecked} failed=${failed}\n`);
process.exit(failed ? 1 : 0);
