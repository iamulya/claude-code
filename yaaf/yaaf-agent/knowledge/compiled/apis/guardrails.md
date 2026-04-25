---
title: Guardrails
entity_type: api
summary: A class that provides usage-based budget limits and cost policies to prevent runaway agent resource consumption.
export_name: Guardrails
source_file: src/utils/guardrails.ts
category: class
search_terms:
 - agent cost control
 - prevent runaway LLM calls
 - set budget for agent
 - limit agent spending
 - token usage limits
 - max turns per run
 - resource consumption policy
 - stop agent loop
 - usage-based limits
 - LLM cost management
 - BudgetExceededError
 - session cost cap
 - turn limit
 - token cap
stub: false
compiled_at: 2026-04-24T17:10:55.758Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `Guardrails` class provides usage-based budget limits and cost policies to prevent runaway agent loops from consuming unbounded resources [Source 2]. It is designed to be used with a `CostTracker` to monitor an agent's consumption of resources like cost, tokens, and turns [Source 2].

`Guardrails` implements three tiers of protection [Source 2]:
1.  **Warning**: Emits an event [when](./when.md) resource usage approaches a configured limit (e.g., 80% of budget).
2.  **Error**: An escalated warning when usage gets closer to the limit (e.g., 95% of budget).
3.  **Blocked**: A hard stop that prevents the agent from proceeding once a limit has been exceeded.

The YAAF Doctor subsystem can listen for `guardrail:warning` and `guardrail:blocked` events to provide runtime diagnostics about budget issues [Source 1].

## Constructor

The `Guardrails` class is instantiated with a configuration object that defines the various budget limits and warning thresholds.

```typescript
import type { CostTracker } from "./costTracker.js";

export class Guardrails {
  constructor(config: GuardrailConfig);
  // ... methods
}
```

### `GuardrailConfig`

The constructor accepts a `GuardrailConfig` object with the following properties [Source 2]:

| Property                | Type     | Description                                                              |
| ----------------------- | -------- | ------------------------------------------------------------------------ |
| `maxCostUSD`            | `number` | Maximum USD cost per session. Default: `Infinity` (no limit).            |
| `maxTokensPerSession`   | `number` | Maximum total tokens (input + output) per session. Default: `Infinity`.  |
| `maxTurnsPerRun`        | `number` | Maximum turns (model calls) per single `run()`. Default: `Infinity`.     |
| `maxInputTokensPerCall` | `number` | Maximum input tokens for a single model call. Default: `Infinity`.       |
| `warningPct`            | `number` | Percentage of budget at which to emit a `'warning'` event. Default: `80`.  |
| `errorPct`              | `number` | Percentage of budget at which to emit an `'error'` event. Default: `95`.   |

## Methods & Properties

### `check()`

Checks the current usage from a `CostTracker` against the configured limits and returns the current status. This method is typically called before each model call to ensure the agent is still within its budget.

**Signature**
```typescript
check(tracker: CostTracker): GuardrailCheckResult;
```

**Return Value**
Returns a `GuardrailCheckResult` object with the overall status [Source 2]:

```typescript
export type GuardrailCheckResult = {
  status: "ok" | "warning" | "error" | "blocked";
  blocked: boolean;
  reason?: string;
  details: GuardrailDetail[];
};

export type GuardrailDetail = {
  resource: "cost" | "tokens" | "turns" | "input_tokens";
  status: "ok" | "warning" | "error" | "blocked";
  current: number;
  limit: number;
  pctUsed: number;
};
```

If `blocked` is `true`, the `reason` field will contain a human-readable string explaining which limit was exceeded. The `details` array provides a breakdown of the status for each monitored resource [Source 2].

## Events

`Guardrails` instances are event emitters that fire events as budget thresholds are crossed.

### `warning`

Emitted when a resource's usage exceeds the `warningPct` threshold.

**Payload** [Source 2]:
```typescript
{
  type: "warning";
  resource: "cost" | "tokens" | "turns" | "input_tokens";
  current: number;
  limit: number;
  pctUsed: number;
}
```

### `error`

Emitted when a resource's usage exceeds the `errorPct` threshold. The payload is the same as the `warning` event.

### `blocked`

Emitted when a resource's usage exceeds its hard limit (100%).

**Payload** (inferred from example) [Source 2]:
```typescript
{
  resource: "cost" | "tokens" | "turns" | "input_tokens";
  // ... other properties may be included
}
```

## Examples

The following example demonstrates how to instantiate `Guardrails`, listen for events, and use the `check()` method to enforce a budget. If the budget is exceeded, a `BudgetExceededError` is thrown to stop the agent's execution [Source 2].

```typescript
import { Guardrails, BudgetExceededError } from 'yaaf';
import { myCostTracker as tracker } from './cost-tracker';

// Instantiate with a $5 session cost limit and 50-turn max.
const guardrails = new Guardrails({
  maxCostUSD: 5.00,
  maxTurnsPerRun: 50,
  warningPct: 80, // Warn at 80% usage
});

// Listen for warning events
guardrails.on('warning', ({ resource, current, limit }) => {
  console.warn(`Approaching ${resource} limit: ${current}/${limit}`);
});

// Listen for blocked events
guardrails.on('blocked', ({ resource }) => {
  console.error(`${resource} budget exceeded — agent stopped`);
});

// In the agent's execution loop, before each model call:
function agentTurn() {
  const check = guardrails.check(tracker);
  if (check.blocked) {
    throw new BudgetExceededError(check.reason);
  }
  // ... proceed with model call
}
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts