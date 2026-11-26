---
name: boundary-discipline
title: Boundary Discipline
group: Architecture
applies_when: Wiring validation, errors, or adapters. Guard at system boundaries, trust internal types, keep logic pure.
---

# Boundary Discipline

## Rule

Validate, narrow types, and handle errors where data crosses a system boundary. Inside the system, trust the types. Keep business logic in pure functions with no framework dependencies, called by a thin shell.

## When it applies

- Wiring input validation, error handling, or a framework adapter.
- Reading CLI arguments, environment variables, config files, request bodies, files, or external API responses.
- Writing a function deep in the system that re-checks values already checked upstream.
- Business rules mixed with HTTP, database, or UI framework code.

Boundaries are: CLI args, environment and config, network requests and responses, external APIs, files, databases, and user input.

## How to apply

1. Find where data enters. Parse it there into a domain type. A schema library such as Zod is a good fit when the project already uses one.
2. Handle errors at that boundary: reject bad input with a clear message, map external failures to domain errors.
3. Pass only parsed domain types inward. Keep transport and framework types (request objects, ORM rows, SDK responses) out of the public surface of core modules.
4. Remove re-validation and redundant null checks inside. The type already says the value is valid.
5. Extract business logic into pure functions. The shell reads input, calls the pure function, and writes output.

Worked example. An HTTP handler reads `req.body.quantity`, and three helpers below it each check `typeof quantity === "number" && quantity > 0`. Moving the check into one parse step at the handler gives an `Order` type with a positive integer `quantity`. The three helpers lose their checks. The pricing rule becomes `priceOrder(order: Order): Money`, a pure function tested with plain objects, no server required.

Two questions decide each guard. Is this data crossing a boundary right now? If not, the validation is redundant. Can this logic be a pure function the shell just calls? If yes, extract it.

## Smells

- The same validation repeated in several internal functions.
- Null checks on values whose type says they cannot be null.
- Core functions that take a request, response, or framework context object.
- Business rules that can only be tested by starting a server or a database.
- External data used directly without a parse step, cast with `as` or `any`.

## Check

Answer yes or no: in this change, does every validation and error handler sit at a boundary listed above, and does every function holding business rules run without a framework or I/O? Yes to both means the principle held.

Related: `core/principles/type-system-discipline.md`, `core/skills/security-review/SKILL.md`.

## Source

- `skills/principle-boundary-discipline/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
- Zod-at-the-boundary default in `docs/06-project-defaults.md` of Vibe Coding Toolkit (soumatheusgomes/vibe-coding-toolkit, Matheus Gomes), MIT.
