---
name: unslop
description: Remove AI writing patterns from prose while keeping its meaning and tone. Load before writing or editing docs, PR descriptions, commit bodies, replies, decision-log rows, skills, or playbooks, and whenever the user says unslop, tighten, or de-AI this text.
origin: pstack
---

# Unslop

Edit text to remove AI writing patterns. Scan for the patterns below, then rewrite. Keep the meaning and match the intended tone.

## When to use

- Any prose that leaves the session: docs, `PRODUCT.md`, PR descriptions, commit bodies, release notes, review comments.
- Harness content: playbooks, skills, principles, prompts. `docs/CONTRIBUTING.md` in the gifisi-harness repository requires it.
- Rows written to `.gifisi/decisions.tsv` and rule text in `.gifisi/corrections.md`.
- The user says unslop, tighten, de-AI, or "make it read like a person wrote it". Apply any extra rules they add, such as "no emdashes", on top of the list.
- Not for code. Narrating comments in code belong to `core/skills/no-comments/SKILL.md`.

## Procedure

1. Pin the target: the file, diff hunk, or message to edit. Read it whole before changing anything.
2. Note what must survive: facts, numbers, names, commands, paths, quoted output, and hedges that come from the evidence. Those stay word for word.
3. Scan line by line against the rules below. Mark each hit with its rule number.
4. Rewrite each hit. Prefer deleting over rephrasing. A sentence that adds no fact goes.
5. Read the result once more as a stranger. Split any sentence you had to reread. Check that no number, path, or claim changed.
6. When editing a file, keep the diff to the prose you fixed. Do not reflow untouched paragraphs.

## Rules

Rule numbers are stable ids that other skills cite. A removed rule leaves a gap.

3. No trailing "-ing" phrases that add no fact ("highlighting...", "ensuring...").
5. No vague attributions ("experts believe"). Name the source or delete the claim.
7. No AI vocabulary: additionally, crucial, delve, enhance, foster, landscape, pivotal, showcase, testament, underscore, vibrant.
8. Say "is" or "has", not "serves as", "stands as", "boasts", "features".
9. No "not just X, but Y". State the point.
10. Do not force ideas into threes.
11. One name per thing. Repeat it.
12. No "from X to Y" unless X and Y sit on a real scale.
13. No em dashes, en dashes, or hyphens used as dashes, and no parentheses in their place. Use a period or a comma.
14. A colon goes before a list or an example, never mid-sentence as a connector.
15. Do not bold every proper noun or acronym.
16. No bold label and colon that restates its line ("**Performance:** Performance improved..."). A bold lead-in that ends in a period and adds new detail is fine.
17. Sentence case headings.
18. No decorative emojis.
19. Straight quotes.
20. No chatbot phrases ("I hope this helps!", "Let me know if...").
22. No praise or agreement openers. Respond directly.
23. Cut filler. "In order to" becomes "to". Delete "it is important to note that".
24. One hedge at most: "may".
25. No generic conclusions. State specific plans or facts.
26. No abstract metaphor nouns: substrate, wedge, vector, nexus, primitive, surface, scaffolding, paradigm, ratchet, north star, flywheel. Use the concrete word. A word that names a literal thing in this project is not a metaphor: the repository name gifisi-harness, a test harness, and the live surface a feature map checks.
27. Say what it does, not how it feels. Name the mechanism or the number. Cut a sentence that could appear unchanged in another project's docs.
28. One idea per sentence. Split a sentence the reader has to reread.
29. Active voice. Name the actor unless it is unknown or does not matter.
30. Cut adverbs or use a stronger verb. Give the number.
31. Use the plain word: "use", not "utilize" or "leverage".
32. No metaphor, aphorism, personified code, or figurative verb where a literal phrase exists.
33. Write whole sentences with their articles and verbs. Spell out arrows and abbreviations.

## Output

- The rewritten text, or the edited file.
- When asked, a short list of the rule numbers that fired and how often.
- Nothing else. No preamble and no closing offer, per rules 20 and 22.

## Source

Adapted from pstack `skills/unslop/SKILL.md` and `docs/guide/05-build-and-clean.md` (Lauren Tan, cursor/plugins, MIT). Writing-style rules also follow Vibe Coding Toolkit `README.pt-BR.md` working agreements (Matheus Gomes, MIT).
