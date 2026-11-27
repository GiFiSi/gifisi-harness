# Third-party notices

gifisi-harness is MIT licensed (see [LICENSE](../LICENSE)). It adapts material from two MIT-licensed projects. Adapted text was rewritten in our own words and stripped of vendor-specific details (model names, vendor plugin names, vendor commands, slash-command invocations). Every adapted Markdown file in `core/playbooks/`, `core/principles/`, `core/skills/`, `core/prompts/` and `docs/` names its upstream file in its `## Source` section. Files under `core/templates/` are copied into user projects as they are, so they carry no `## Source` section; their upstream paths are listed under [Template sources](#template-sources) below.

## pstack

- Project: pstack, part of the `cursor/plugins` repository, https://github.com/cursor/plugins/tree/main/pstack
- Author: Lauren Tan
- License: MIT

### What was adapted

- The 22 playbooks in `core/playbooks/`, from `pstack/skills/poteto-mode/playbooks/*.md`: When to use, Done Predicate, numbered steps, step notes and reply shape.
- The routing model in `core/harness/router.md` and `core/harness/routes.json`, from `pstack/skills/poteto-mode/SKILL.md` and `pstack/skills/poteto-mode/worker.md`: classify first, print a header, copy the playbook steps into the todo list, load skills on demand, check the done predicate on the real artifact.
- The 24 engineering principles in `core/principles/`, from `pstack/skills/principle-*/SKILL.md`.
- The 24 skills marked `origin: pstack` in `core/harness/manifest.json`, from `pstack/skills/<name>/SKILL.md`.
- The Feature Map live-surface verification idea, the three-tier correction ladder (architecture, then lint or test, then text) and the decision log columns, from the skills above and `pstack/docs/guide/*.md`.

### License text

```text
MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Vibe Coding Toolkit

- Project: Vibe Coding Toolkit, https://github.com/soumatheusgomes/vibe-coding-toolkit
- Author: Matheus Gomes
- License: MIT

### What was adapted

- The seven skills marked `origin: vibe-coding-toolkit` in `core/harness/manifest.json` (machine setup, project bootstrap, project adoption, quality gates, context tools, code review, security review), from `docs/03-environment-setup.md`, `docs/04-project-bootstrap.md`, `docs/06-project-defaults.md`, `docs/08-security-audit.md`, `docs/tools/*.md` and `docs/prompts/*.md`.
- The nine prompts in `core/prompts/`, from upstream prompts 10, 11, 12, 03, 13, 09, 08, 04 and 02 in `docs/prompts/`.
- The project templates in `core/templates/`, listed file by file with their upstream paths under [Template sources](#template-sources).
- The working agreements (smallest sufficient change, separate "file present" from "configured" from "integration tested", explicit authorization for publishing and destructive actions) and the five-file documentation layout used in `docs/` of this repository, from `README.pt-BR.md` and `docs/00-overview.md`.

### Template sources

Upstream paths start with `vibe-coding-toolkit/`, the root of the Vibe Coding Toolkit repository. Each file was rewritten for this harness unless the table says otherwise.

| File in `core/templates/` | Adapted from |
|---|---|
| `PRODUCT.md.template` | `vibe-coding-toolkit/templates/product.md.template` |
| `docs/{architecture,design,onboarding,quality,setup}.md.template` | `vibe-coding-toolkit/templates/project-docs/<name>.md.template` |
| `AGENTS.project.md.template`, `CLAUDE.md.template` | `vibe-coding-toolkit/templates/AGENTS.md.template`, `vibe-coding-toolkit/templates/CLAUDE.md.template` |
| `security-review.md.template`, `task-handoff.md.template` | `vibe-coding-toolkit/templates/security-review.md.template`, `vibe-coding-toolkit/templates/task-handoff.md.template` |
| `environment-manifest.example.json` | `vibe-coding-toolkit/templates/environment-manifest.json.example` (shortened) |
| `eslint/eslint.config.mjs` | `vibe-coding-toolkit/templates/eslint/eslint.config.mjs.example` |
| `eslint/eslint-rules/index.cjs` | `vibe-coding-toolkit/templates/eslint/eslint-rules/index.cjs` and `core-rules.cjs` (same three rule names, rewritten as one file) |
| `eslint/verify-quality-rules.mjs` | `vibe-coding-toolkit/templates/eslint/verify.mjs` |
| `hooks/hook-io.mjs` | `vibe-coding-toolkit/templates/hooks/hook-io.mjs.example` |
| `hooks/context7-reminder.mjs` | `vibe-coding-toolkit/docs/tools/12-context7.md` (upstream has no code template for it) |
| `hooks/graphify-refresh.mjs` | `vibe-coding-toolkit/docs/tools/07-graphify.md` (upstream has no code template for it) |
| `hooks/rtk-rewrite.mjs` | `vibe-coding-toolkit/docs/tools/03-rtk-token-proxy.md` (upstream has no code template for it) |
| `hooks/claude-settings.json` | The hook registration shape of `vibe-coding-toolkit/templates/settings.json.example` |
| `hooks/mcp.json` | `vibe-coding-toolkit/templates/project/mcp.json.example` (same content) |
| `hooks/codex-config.toml` | `vibe-coding-toolkit/templates/project/codex.config.toml.example` |
| `next/drizzle.config.ts`, `next/vitest.config.mts` | `vibe-coding-toolkit/templates/next/drizzle.config.ts.example`, `vibe-coding-toolkit/templates/next/vitest.config.mts.example` |
| `next/src/db/index.ts`, `next/src/db/schema/index.ts` | `vibe-coding-toolkit/templates/next/src/db/index.ts.example`, `vibe-coding-toolkit/templates/next/src/db/schema/index.ts.example` |
| `next/src/lib/env-schema.ts`, `next/src/lib/env.test.ts`, `next/src/lib/logger.ts` | `vibe-coding-toolkit/templates/next/src/lib/env-schema.ts.example`, `env.test.ts.example` and `logger.ts.example` in the same folder |

The files in `core/templates/gifisi/` (decision log header, corrections file, example Feature Map) are original to gifisi-harness. Their formats follow the pstack decision log and Feature Map listed above.

### License text

```text
MIT License

Copyright (c) 2026 Matheus Gomes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Source

- `pstack/LICENSE`, pstack by Lauren Tan (MIT).
- `LICENSE`, Vibe Coding Toolkit by Matheus Gomes (MIT).
