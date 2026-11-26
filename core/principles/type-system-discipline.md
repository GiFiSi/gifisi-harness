---
name: type-system-discipline
title: Type System Discipline
group: Architecture
applies_when: Designing types or signatures. Make illegal states unrepresentable and parse external data at boundaries.
---

# Type System Discipline

## Rule

Make the compiler reject impossible states, mixed-up primitives, and unhandled variants. A rule the type checker enforces holds in every file. A rule written in a comment holds only where someone read it.

## When it applies

- Designing a new type, record, or function signature.
- Reviewing a signature that takes two or more values of the same primitive type.
- Reading JSON, RPC payloads, CLI arguments, config files, environment variables, or database rows.
- Adding a variant to a union or enum that other code switches on.
- Writing a type by hand that mirrors a schema owned somewhere else.

## How to apply

1. **Make illegal states unrepresentable.** Replace optional fields that are only valid together with a discriminated union. Each variant carries exactly the fields that state needs.
2. **Brand semantic primitives.** When two arguments share a primitive type but mean different things (a user id and an order id, cents and dollars), give each its own type. Construct it once, through a function that validates.
3. **Treat external data as unknown until parsed.** One parse function per boundary turns raw input into the typed model or returns an error. Code past the boundary never casts.
4. **Exhaust variants.** Every `switch` on a union ends in a branch that fails to compile when a new variant appears, such as an assignment to `never`.
5. **Derive types from the authoritative schema.** If a validation schema, database schema, or API spec owns the shape, infer the type from it. Do not hand-roll a parallel type that can drift.

Worked example. A payment function has the signature `charge(userId: string, orderId: string, amount: number)`. A caller swaps the two ids and the tests pass because both are strings. Branding fixes it at compile time:

```ts
type UserId = string & { readonly brand: "UserId" };
type OrderId = string & { readonly brand: "OrderId" };
type Cents = number & { readonly brand: "Cents" };

const PaymentInput = z.object({ userId: z.string().uuid(), orderId: z.string().uuid(), amountCents: z.number().int().positive() });
type PaymentInput = z.infer<typeof PaymentInput>;

function parsePayment(raw: unknown): PaymentInput { return PaymentInput.parse(raw); }
function charge(userId: UserId, orderId: OrderId, amount: Cents) { /* ... */ }
```

The swapped call no longer compiles. The request body goes through `parsePayment` once at the route handler, and the type comes from the schema, so the two cannot drift.

In a dynamically typed language, apply the same ideas with runtime parsing at the boundary and one constructor per semantic value.

## Smells

- `as`, `any`, or a non-null assertion on data that came from outside the process.
- Two booleans or optional fields that must change together.
- A function with three parameters of type `string`.
- A `default` branch that silently handles variants added later.
- A hand-written interface next to a schema that describes the same shape.
- A null check deep inside code whose input type already says it cannot be null.

## Check

Answer yes or no: in the code this change touches, does every external input pass through one parse function before use, and would swapping two same-typed arguments or adding a new variant fail to compile? Yes to both means the principle held.

Related: `core/principles/boundary-discipline.md`, `core/principles/model-the-domain.md`.

## Source

- `skills/principle-type-system-discipline/SKILL.md` and `docs/guide/08-principles.md` in pstack (cursor/plugins, Lauren Tan), MIT.
- TypeScript plus Zod defaults in `docs/06-project-defaults.md` of Vibe Coding Toolkit (soumatheusgomes/vibe-coding-toolkit, Matheus Gomes), MIT.
