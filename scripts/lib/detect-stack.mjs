// Detect a target project's stack for .poteto/project.json.
// Output is deterministic: fixed key order, sorted frameworks, no timestamps.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const LOCKFILES = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];

// framework -> dependency names and config files that reveal it
const FRAMEWORKS = [
  ["next", ["next"], [/^next\.config\.(js|mjs|cjs|ts|mts)$/]],
  ["react", ["react"], []],
  ["vue", ["vue"], [/^vue\.config\.(js|mjs|cjs|ts)$/]],
  ["svelte", ["svelte", "@sveltejs/kit"], [/^svelte\.config\.(js|mjs|cjs|ts)$/]],
  ["express", ["express"], []],
  ["fastify", ["fastify"], []],
  ["vitest", ["vitest"], [/^vitest\.config\.(js|mjs|cjs|ts|mts|cts)$/]],
  ["jest", ["jest"], [/^jest\.config\.(js|mjs|cjs|ts|json)$/]],
  ["eslint", ["eslint"], [/^eslint\.config\.(js|mjs|cjs|ts|mts|cts)$/, /^\.eslintrc(\.(js|cjs|json|yml|yaml))?$/]],
  ["biome", ["@biomejs/biome"], [/^biome\.jsonc?$/]],
  ["drizzle", ["drizzle-orm", "drizzle-kit"], [/^drizzle\.config\.(js|mjs|cjs|ts|mts)$/]],
  ["prisma", ["prisma", "@prisma/client"], []],
  ["typescript", ["typescript"], [/^tsconfig\.json$/]],
];

const ESLINT_CONFIGS = [
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts", "eslint.config.mts", "eslint.config.cts",
  ".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc.yml", ".eslintrc.yaml",
];

function readPackageJson(root) {
  const file = path.join(root, "package.json");
  if (!existsSync(file)) return null;
  try {
    // npm accepts a UTF-8 BOM (PowerShell 5.1 Set-Content -Encoding UTF8 writes one); JSON.parse does not.
    return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`package.json in ${root} is not valid JSON: ${error.message}`);
  }
}

// Lockfiles first; then the packageManager field; a package.json with neither means npm.
export function detectPackageManager(root, pkg) {
  for (const [file, manager] of LOCKFILES) if (existsSync(path.join(root, file))) return manager;
  const field = typeof pkg?.packageManager === "string" ? pkg.packageManager.split("@")[0] : "";
  if (["pnpm", "yarn", "bun", "npm"].includes(field)) return field;
  return pkg ? "npm" : "none";
}

export function scriptCommand(manager, script) {
  if (manager === "npm") return script === "test" ? "npm test" : `npm run ${script}`;
  if (manager === "pnpm") return `pnpm ${script}`;
  if (manager === "yarn") return `yarn ${script}`;
  if (manager === "bun") return `bun run ${script}`;
  return null;
}

function detectCommands(manager, pkg) {
  const scripts = pkg?.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  const commands = {};
  for (const name of ["test", "lint", "build", "dev"]) {
    commands[name] = typeof scripts[name] === "string" ? scriptCommand(manager, name) : null;
  }
  return commands;
}

function detectFrameworks(root, pkg) {
  const deps = new Set([...Object.keys(pkg?.dependencies ?? {}), ...Object.keys(pkg?.devDependencies ?? {})]);
  let entries = [];
  try {
    entries = readdirSync(root);
  } catch {
    entries = [];
  }
  const found = [];
  for (const [name, packages, configs] of FRAMEWORKS) {
    const byDep = packages.some((p) => deps.has(p));
    const byConfig = configs.some((pattern) => entries.some((entry) => pattern.test(entry)));
    const byPrisma = name === "prisma" && existsSync(path.join(root, "prisma", "schema.prisma"));
    if (byDep || byConfig || byPrisma) found.push(name);
  }
  return found.sort();
}

function detectEslint(root) {
  const config = ESLINT_CONFIGS.find((file) => existsSync(path.join(root, file))) ?? null;
  const maxLinesRule = config ? readFileSync(path.join(root, config), "utf8").includes("max-lines") : false;
  return { config, maxLinesRule };
}

export function detectStack(root) {
  const pkg = readPackageJson(root);
  const packageManager = detectPackageManager(root, pkg);
  const name = typeof pkg?.name === "string" && pkg.name ? pkg.name : path.basename(path.resolve(root));
  return {
    name,
    packageManager,
    commands: detectCommands(packageManager, pkg),
    frameworks: detectFrameworks(root, pkg),
    eslint: detectEslint(root),
    harnessHome: ".poteto/",
  };
}

export function renderProjectJson(stack) {
  return `${JSON.stringify(stack, null, 2)}\n`;
}

// Template token values for files created in the project.
export function templateTokens(stack, date) {
  const orNot = (value) => value ?? "not configured";
  return {
    PROJECT_NAME: stack.name,
    HARNESS_HOME: stack.harnessHome,
    PACKAGE_MANAGER: stack.packageManager,
    TEST_COMMAND: orNot(stack.commands.test),
    LINT_COMMAND: orNot(stack.commands.lint),
    BUILD_COMMAND: orNot(stack.commands.build),
    DEV_COMMAND: orNot(stack.commands.dev),
    DATE: date,
  };
}

export function fillTokens(text, tokens) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => (key in tokens ? tokens[key] : match));
}
