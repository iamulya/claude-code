---
export_name: GuardrailResource
source_file: src/utils/guardrails.ts
category: type
summary: A type representing the different resources tracked by Guardrails, such as cost, tokens, and turns.
title: GuardrailResource
entity_type: api
search_terms:
 - guardrail resource types
 - budget tracking categories
 - cost limit resource
 - token limit resource
 - turn limit resource
 - input token limit
 - what can guardrails track
 - agent resource limits
 - session budget types
 - YAAF budget control
 - prevent runaway agents
 - GuardrailDetail resource
 - GuardrailEvent resource
stub: false
compiled_at: 2026-04-24T17:10:39.917Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`GuardrailResource` is a string literal type that defines the specific categories of usage that the `Guardrails` class can monitor to prevent runaway agent execution [Source 1]. It acts as an enumeration for the different types of budgets that can be enforced.

This type is used throughout the guardrails system, particularly in the `GuardrailDetail` and `GuardrailEvent` types, to identify which specific resource limit is being approached or has been exceeded [Source 1].

## Signature

`GuardrailResource` is a union of four string literals:

```typescript
export type GuardrailResource = "cost" | "tokens" | "turns" | "input_tokens";
```

### Values

| Value          | Description                                                              | Scope   | Configured By               |
| -------------- | ------------------------------------------------------------------------ | ------- | --------------------------- |
| `"cost"`       | The cumulative USD cost of model calls.                                  | Session | `maxCostUSD`                |
| `"tokens"`     | The cumulative total tokens (input + output).                            | Session | `maxTokensPerSession`       |
| `"turns"`      | The number of model calls within a single agent `run()`.                 | Run     | `maxTurnsPerRun`            |
| `"input_tokens"` | The number of input tokens for a single model call.                      | Call    | `maxInputTokensPerCall`     |

## Examples

The `GuardrailResource` type is used to identify the resource in events emitted by a `Guardrails` instance.

```typescript
import { Guardrails, GuardrailResource } from 'yaaf';

const guardrails = new Guardrails({
  maxCostUSD: 5.00,
  maxTokensPerSession: 100_000,
  warningPct: 80,
});

// The 'resource' parameter in the event listener is of type GuardrailResource
guardrails.on('warning', ({ resource, current, limit }) => {
  // Here, 'resource' will be "cost" or "tokens"
  console.warn(
    `Approaching limit for resource: '${resource}'. ` +
    `Current usage: ${current}, Limit: ${limit}`
  );
});

guardrails.on('blocked', ({ resource }) => {
  // Here, 'resource' will be the specific resource that exceeded its budget
  console.error(`Budget exceeded for '${resource}'. Agent stopped.`);
  // Expected output if cost limit is hit:
  // "Budget exceeded for 'cost'. Agent stopped."
});
```

## See Also

*   `Guardrails`: The class that implements the budget-limiting logic.
*   `GuardrailConfig`: The configuration object used to set limits for each `GuardrailResource`.
*   `GuardrailDetail`: An object that provides detailed status for a specific resource.
*   `BudgetExceededError`: The error thrown [when](./when.md) a resource limit is blocking further execution.

## Sources

[Source 1]: src/utils/guardrails.ts