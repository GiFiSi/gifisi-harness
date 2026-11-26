---
name: technical-writing
description: Layered standard for technical prose. Pick one Diataxis mode per document, write sentences to the reader in Google developer style, load one statement at a time with Simplified Technical English rules, and remove double readings with Global English syntax. Load when writing or reviewing docs, RFCs, READMEs, skills, PR descriptions, or commit messages.
origin: pstack
---

# Technical writing

Write so a tired engineer understands on the first read. Four layers stack, from document shape down to word choice. Apply them in order. When a rule makes a sentence worse, fix the sentence another way or leave it alone.

## When to use

- Writing or reviewing a README, a design doc, an RFC, a `docs/` page, a playbook, or a skill.
- A PR description or a commit message. Every layer except the Diataxis mode applies to them.
- A handoff or report another agent or person will act on.
- Not for product UI strings. Those follow the product's own copy guidelines.

## Procedure

1. Set the baseline. Cut every word that does no work. Use the short everyday word ("use", not "utilize"). Write the real symbol, file, flag, or command name, not a description of it. Do not invent jargon; say what a named pattern means the first time you use it.
2. Vary the rhythm. Mix sentence lengths: split a sentence that carries two thoughts, keep a long sentence that carries one. Be specific: not "schema changes can cause issues" but "a column rename fails the build". Have a view in explanation; keep reference dry.
3. Pick one Diataxis mode per document, and split and link instead of mixing. **Tutorial** (learning by doing): say what the learner will build, give every step a visible result and say what they should see. **How-to** (steps to a goal): assume competence, action only, allow forks, name the guide by the task. **Reference** (facts for lookup): describe only, be complete, mirror the structure of the thing described. **Explanation** (why): one bounded topic with context, decisions, constraints, and alternatives; opinion belongs here and nowhere else.
4. Write sentences to the reader (Google developer style). Address the reader as "you" in the present tense. Say who does what; use the passive only when the actor is unknown or beside the point. Write instructions as commands, condition first, common case first. No buzzwords, no figurative language, no "please", and never "simply", "easy", or "quickly" in a procedure. Do not pre-announce. Link text says where the link goes.
5. Format for scanning. Headings carry the point, in sentence case, one h1 per page, no skipped levels. Numbered lists for sequences, bullets for everything else. Introduce a list with a complete sentence and keep items parallel. Code, paths, flags, and commands go in code font; UI elements go in bold. Use the serial comma. Drop "etc.".
6. Load one statement at a time (Simplified Technical English). One instruction per sentence and one thought per sentence elsewhere. Split instructions longer than about 20 words and other sentences longer than about 25. Put a warning or condition before the step it guards. Keep "the" and "a". Give each word one meaning and use one word per action. Avoid "-ing" forms where you can.
7. Leave no sentence open to two readings (Global English). Keep "only" and "not" next to the word they change. Break up long noun strings. Make every "it", "they", and "this" point at one obvious thing, never at a whole clause. Keep small structure words such as "that". Say which parts "and" or "or" joins. Prefer periods over semicolons and dashes; avoid slashes and "(s)". Call each thing by one name everywhere. Skip idioms, Latin abbreviations, and metaphors.
8. Apply `core/skills/unslop/SKILL.md` to every document you touch. It owns the catalog of AI vocabulary, filler, hedging, and formatting tells.
9. Check the repo specifics. A PR body is a briefing a reviewer reads in under a minute: link logs, SHA lists, and metric tables instead of pasting them. Follow the repo's indentation in code snippets. Write real paths. Make every count or tree claim true at the commit that lands it, and include the command that regenerates it.

## Output

- The document in one Diataxis mode, or split into linked documents, one mode each.
- Every claim either evidenced or labeled measured, inferred, or guess.
- For a review: each violated rule with the line it applies to and the rewritten line, most damaging first. Report a rule you chose to break and why.

## Source

Adapted from pstack `skills/technical-writing/SKILL.md` (Lauren Tan, cursor/plugins, MIT). Layers draw on Diataxis, the Google developer documentation style guide, ASD-STE100 Simplified Technical English, and Global English guidance.
