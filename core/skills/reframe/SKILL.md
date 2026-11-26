---
name: reframe
description: Teach the expert vocabulary for what the user is building, borrow terms from neighboring fields that solved the same shape of problem, name what they missed, and rewrite their description with the new words. Every citation is opened and confirmed. Load when a request is described in lay terms, or the user asks what this is called or how experts frame it.
origin: pstack
---

# Reframe

The words a request uses decide what an agent builds. A lay description of a known problem gets a homemade answer. The expert term pulls in decades of solved design. This skill finds those terms and rewrites the request with them.

## When to use

- The user describes a system in their own words and the field has a name for it ("keep two copies in step while offline" is conflict-free replicated data or operational transform).
- A design keeps reinventing parts that a neighboring field already standardized.
- Before `core/skills/architect/SKILL.md` or a feature plan, when the request is vague about the problem class.
- Not for sharpening the depth of a task. That is `core/skills/sharpen/SKILL.md`.

## Procedure

1. Start from the user's own material: their files, code, and words, not a summary of them. Quote the description you are reframing.
2. Disambiguate first. If the description could name more than one problem, list the two or three it could be, each with the one term that names it and the sign that tells it apart from the others. Pick the most likely and say why.
3. Give 8 to 12 terms, ranked by how much each would change what gets built. For each: the term, its meaning in one plain sentence, the part of the user's description it names, one real project, paper, or system that uses it that way with a link, and what the term lets them ask an agent for.
4. Pick 2 or 3 neighboring fields that solved the same shape of problem under other names. For each, say what carries over, where the analogy breaks, and which terms come back from it.
5. Name what the user did not mention but should care about: failure modes, scale limits, or obligations the expert framing exposes.
6. Rewrite the user's description with the new words, keeping their goal and constraints intact.
7. Verify every citation. Open each link and confirm it uses the term in the sense you claim. If you cannot open the web from this harness, mark each citation as unverified instead of presenting it as checked. Cut any citation you cannot confirm. Add no padding.

## Output

- The disambiguation, when there was one, with the pick and the reason.
- The ranked term table: term, meaning, the part it names, a confirmed source, and what it unlocks.
- The neighboring fields with what carries over and where each analogy breaks.
- The blind spots.
- The rewritten description, ready to paste as the next prompt or into a plan.

## Source

Adapted from pstack `skills/reframe/SKILL.md` (Lauren Tan, cursor/plugins, MIT).
