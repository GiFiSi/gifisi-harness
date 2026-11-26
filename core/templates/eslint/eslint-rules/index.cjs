"use strict";

// Local ESLint plugin from poteto-harness: three quality rules with no
// dependency beyond ESLint itself. Copy this file byte for byte to
// <project>/eslint-rules/index.cjs and register it in eslint.config.mjs as
// the "quality" plugin. Prove it with scripts/verify-quality-rules.mjs.

const DEFAULT_MAX_LINES = 350;

const BANNED_CONSOLE_METHODS = new Set([
  "log", "error", "warn", "info", "debug", "trace", "dir", "table", "time", "timeEnd", "timeLog",
  "group", "groupEnd", "groupCollapsed", "count", "countReset", "assert", "profile", "profileEnd",
]);

// Config and story files are not production source: their length says
// nothing about how well the code behind them is factored.
const NON_SOURCE_BASENAME = /[.-](stories|config|conf)\.[^.]+$/;

// Directories that hold generated, vendored or fixture code.
const IGNORED_PATH_SEGMENTS = new Set([
  "node_modules", "dist", "build", ".next", "out", "coverage", "generated", "__generated__",
  "migrations", "migration", "drizzle", "locales", "__tests__", "__mocks__", "fixtures", "mocks", ".poteto",
]);

const TEST_FILE = /(^|\/)(__tests__|__mocks__|fixtures|mocks)(\/|$)|[.-](test|spec)\.[cm]?[jt]sx?$/;

// context.filename is the ESLint 9 property; getFilename() keeps v8 hosts working.
function fileName(context) {
  return String(context.filename ?? context.getFilename()).replace(/\\/g, "/");
}

function sourceCodeOf(context) {
  return context.sourceCode ?? context.getSourceCode();
}

function isTestFile(filename) {
  return TEST_FILE.test(filename);
}

function isCheckableSourceFile(filename) {
  if (filename.endsWith(".d.ts")) return false;
  const segments = filename.split("/");
  if (segments.slice(0, -1).some((segment) => IGNORED_PATH_SEGMENTS.has(segment))) return false;
  return !isTestFile(filename) && !NON_SOURCE_BASENAME.test(segments[segments.length - 1]);
}

// A baseline entry matches the whole path or a path suffix, so an entry
// copied from a lint report ("src/legacy.ts") matches an absolute filename.
function isBaselineIgnored(filename, ignore) {
  return ignore.some((entry) => filename === entry || filename.endsWith(`/${entry}`));
}

// A module made only of imports, re-exports and type declarations carries
// no logic, so its length is not a design smell.
function isDeclarationOnly(program) {
  return program.body.every((statement) => {
    let node = statement;
    if (["ImportDeclaration", "ExportAllDeclaration", "EmptyStatement"].includes(node.type)) return true;
    if (["ExportNamedDeclaration", "ExportDefaultDeclaration"].includes(node.type)) {
      if (!node.declaration) return true;
      node = node.declaration;
    }
    return ["TSTypeAliasDeclaration", "TSInterfaceDeclaration"].includes(node.type);
  });
}

// Count lines the same way core max-lines does with skipBlankLines and
// skipComments: a line that holds only a comment does not count.
function countLines(sourceCode, { skipBlankLines, skipComments }) {
  const lines = sourceCode.lines;
  const skipped = new Set();
  if (skipBlankLines) {
    lines.forEach((text, index) => { if (text.trim() === "") skipped.add(index + 1); });
  }
  if (skipComments) {
    for (const comment of sourceCode.getAllComments()) {
      for (let line = comment.loc.start.line; line <= comment.loc.end.line; line++) {
        const text = lines[line - 1];
        const before = line === comment.loc.start.line ? text.slice(0, comment.loc.start.column) : "";
        const after = line === comment.loc.end.line ? text.slice(comment.loc.end.column) : "";
        const rest = (before + after).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/g, "");
        if (rest.trim() === "") skipped.add(line);
      }
    }
  }
  return lines.length - skipped.size;
}

const maxLines = {
  meta: {
    type: "suggestion",
    docs: { description: "Enforce a source file size budget." },
    messages: {
      tooLong: [
        "File too large ({{lines}} lines | max {{max}}).",
        "Split it on a real responsibility seam:",
        "  - business logic -> a domain service or use-case module",
        "  - repeated UI blocks -> a reusable sub-component",
        "  - data access -> a repository or adapter",
        "  - helper clusters -> a named utility module",
      ].join("\n"),
    },
    schema: [{
      type: "object",
      properties: {
        max: { type: "integer", minimum: 1 },
        skipBlankLines: { type: "boolean" },
        skipComments: { type: "boolean" },
        ignore: { type: "array", items: { type: "string" } },
        includeTests: { type: "boolean" },
      },
      additionalProperties: false,
    }],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const max = options.max ?? DEFAULT_MAX_LINES;
    // Tests are outside the budget by default. includeTests lets a separate
    // "warn" block give them their own budget without loosening production.
    const filename = fileName(context);
    const checkable = isCheckableSourceFile(filename)
      || (options.includeTests === true && isTestFile(filename) && !filename.endsWith(".d.ts"));
    if (!checkable || isBaselineIgnored(filename, options.ignore ?? [])) return {};
    return {
      Program(node) {
        if (isDeclarationOnly(node)) return;
        const lines = countLines(sourceCodeOf(context), {
          skipBlankLines: options.skipBlankLines ?? true,
          skipComments: options.skipComments ?? true,
        });
        if (lines > max) {
          context.report({
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            messageId: "tooLong",
            data: { lines, max },
          });
        }
      },
    };
  },
};

const noDirectConsole = {
  meta: {
    type: "problem",
    docs: { description: "Disallow direct console output outside the log adapter." },
    messages: { banned: "Use {{logger}} instead of console.{{method}}()." },
    schema: [{
      type: "object",
      properties: {
        allow: { type: "array", items: { type: "string" } },
        logger: { type: "string" },
      },
      additionalProperties: false,
    }],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const allow = new Set(options.allow ?? []);
    const logger = options.logger ?? "the project logger";
    // The log adapter itself is exempted by a files override in the config.
    if (isTestFile(fileName(context))) return {};
    return {
      MemberExpression(node) {
        const isConsole = node.object.type === "Identifier" && node.object.name === "console";
        const method = node.property.type === "Identifier" ? node.property.name : null;
        if (isConsole && method && BANNED_CONSOLE_METHODS.has(method) && !allow.has(method)) {
          context.report({ node, messageId: "banned", data: { logger, method } });
        }
      },
    };
  },
};

// A default or namespace import pulls everything the module exports, so it
// always counts. A named import is matched on the imported name, not the
// local alias, so `import { db as database }` is still caught.
function importsGuardedBinding(node, bindings) {
  return node.specifiers.some((specifier) => {
    if (specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportNamespaceSpecifier") return true;
    return specifier.type === "ImportSpecifier"
      && specifier.imported.type === "Identifier"
      && bindings.has(specifier.imported.name);
  });
}

const noDirectDataAccess = {
  meta: {
    type: "problem",
    docs: { description: "Keep the database client out of presentation layers." },
    messages: {
      forbidden: "Do not import {{module}} from this layer; call a feature module, repository or service instead.",
    },
    // modules and layers are required: a half-configured rule fails at config
    // load instead of silently matching nothing.
    schema: [{
      type: "object",
      properties: {
        modules: { type: "array", items: { type: "string" }, minItems: 1 },
        layers: { type: "array", items: { type: "string" }, minItems: 1 },
        bindings: { type: "array", items: { type: "string" } },
        extensions: { type: "array", items: { type: "string" } },
      },
      required: ["modules", "layers"],
      additionalProperties: false,
    }],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const modules = new Set(options.modules ?? []);
    const layers = options.layers ?? [];
    const bindings = new Set(options.bindings ?? ["db"]);
    const extensions = options.extensions ?? [];
    const filename = fileName(context);
    if (isTestFile(filename)) return {};
    // A file is presentation when it sits under a guarded path, or when it
    // carries a guarded extension wherever it lives.
    const guarded = layers.some((layer) => filename.includes(layer))
      || extensions.some((extension) => filename.endsWith(extension));
    if (!guarded) return {};
    return {
      ImportDeclaration(node) {
        const source = String(node.source.value);
        if (!modules.has(source) || !importsGuardedBinding(node, bindings)) return;
        context.report({ node, messageId: "forbidden", data: { module: source } });
      },
    };
  },
};

module.exports = {
  meta: { name: "eslint-plugin-quality", version: "1.0.0" },
  rules: {
    "max-lines": maxLines,
    "no-direct-console": noDirectConsole,
    "no-direct-data-access": noDirectDataAccess,
  },
};
