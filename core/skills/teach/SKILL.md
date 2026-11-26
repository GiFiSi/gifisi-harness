---
name: teach
description: Explain a body of work plainly so a person actually understands what it is, how it works, and why it is built that way. Runs the how and why skills and weaves their findings into one conversational explanation that builds up step by step. Load for teach me this, help me really understand X, or explain this change or your own choice to me.
origin: pstack
---

# Teach

You explain what a thing is, how it works, and why it is built that way, in one plain account at the person's pace. The goal is that they understand it. You change nothing.

Teach sits on top of `core/skills/how/SKILL.md` and `core/skills/why/SKILL.md`. Those do the digging. Teach chooses what matters, blends the findings, and delivers them in a form that lands.

## When to use

- "Teach me this", "help me really understand X", "explain this change to me".
- "Convince me this fixes the cause and not the symptom." The explanation becomes an argument the person can test.
- Explaining your own choice: "why did you implement it this way and not with a queue".
- Not for a quick factual lookup. Answer that directly.

## Procedure

1. Decide the few things the person should walk away understanding. Read their reason for asking from the conversation (about to change it, reviewing it, debugging it, new to it) and what they already know. Do not quiz them. Skip what they plainly know and put depth where their question is.
2. Get oriented yourself: read the diff, entry points, or files involved until you can name the thing and what it touches.
3. Run the digging skills. Follow `core/skills/how/SKILL.md` for how it works and `core/skills/why/SKILL.md` for why. If your harness can spawn subagents, run both in parallel and combine the results; otherwise run them one after the other. Size to the question: a subsystem needs both, a small change may need one.
4. Open with a plain definition. Name the thing in general terms, the way a senior engineer would say it out loud, with its common name if it has one. Then tie it to this case ("here we use it to ...").
5. Give the smallest complete answer first: a sentence or two. Then stop and let the person respond. Add layers (how it works, the deeper reasons, edge cases) when they ask.
6. For each part, explain the problem it solves and the concrete mechanism. Walk through what happens as the user does the thing when that is what makes it click. A list of functions and constants is reference, not teaching.
7. Show, do not only tell. Open the diff, the code, or a debugger session when that is fastest. For three or more moving parts, draw a series of diagrams where each one redraws the previous and adds one part. To teach A to B to C, draw A to B, then redraw with C, then redraw with the return edge. Use a text diagram (mermaid or ASCII) when labels carry the meaning. When the idea is spatial (layout, overlap, scroll position, before and after) and your harness can generate images, draw it whiteboard style with a few short labels; otherwise use an ASCII sketch.
8. Keep it a conversation. Offer to go deeper or move on, and follow their lead. With no live human (a one-shot run), deliver the whole explanation cleanly and put the offer to go deeper at the end.

### Voice

Write through `core/skills/unslop/SKILL.md`, in plain spoken English, as you would explain it to a colleague. Tight, not terse. Target density: "Virtualization runs in two parts, one for rendering and one for loading from disk. When an item scrolls out past the buffer, both its DOM node and its in-memory data are evicted."

- State the mechanism, not a metaphor or a preview of what is coming.
- Normal sentence case. Prefer periods over commas. One or two commas per sentence at most.
- Give each concept one name and keep it.
- Do not print framing labels such as "the key insight", "TL;DR", or "at its core". Do not flag a part as tricky or important; just say it.
- No quizzes, no "say it back to me", no pacing theater.
- Keep the confidence language from the why findings intact. Its hedges are findings.

## Output

The explanation itself, never a report about what you did. Lead with the main point, then the plain account of what it is, how it works, and why, with diagrams built up step by step where they help. End with the threads worth chasing next and which skill (how or why) would chase them.

## Source

Adapted from pstack `skills/teach/SKILL.md` and `docs/guide/03-understand.md` (Lauren Tan, cursor/plugins, MIT).
