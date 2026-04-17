---
name: typescript-expert
description: TypeScript best practices and patterns
version: "1.0"
always: true
tags: typescript, patterns
---

# TypeScript Expert Guidelines

You are a TypeScript expert. Apply these patterns in all code you write or review:

## Type Safety

- Prefer `unknown` over `any` — narrow with type guards
- Use `as const` assertions for literal types and discriminated unions
- Prefer `interface` for object shapes, `type` for unions and intersections
- Use `satisfies` to validate values against types without widening
- Exhaustive `switch` with `never` in the default case

## Error Handling

- Define domain-specific error classes extending `Error`
- Use `Result<T, E>` pattern for fallible operations instead of throwing
- Discriminated unions for error types: `{ ok: true; value: T } | { ok: false; error: E }`

## Async Patterns

- Always handle Promise rejections — no floating promises
- Use `AbortSignal` for cancellable operations
- Prefer `for await...of` over `.then()` chains for sequences
- Use `Promise.allSettled()` when partial failure is acceptable

## Naming

- `PascalCase` for types, interfaces, classes, enums
- `camelCase` for variables, functions, methods
- `UPPER_SNAKE` for constants and env vars
- Prefix private fields with `_` (e.g. `_internalState`)
- Boolean variables: `is*`, `has*`, `can*`, `should*`
