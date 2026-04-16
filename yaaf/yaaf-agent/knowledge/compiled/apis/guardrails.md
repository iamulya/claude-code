---
title: Guardrails
entity_type: api
summary: A class for enforcing usage-based budget limits and cost policies to prevent runaway agent loops.
export_name: Guardrails
source_file: src/utils/guardrails.ts
category: class
stub: false
compiled_at: 2026-04-16T14:39:30.942Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/guardrails.ts
confidence: 1
---

## Overview
The `Guardrails` class provides usage-based budget limits and cost policies for LLM agents. It is designed to prevent runaway agent loops from consuming unbounded resources by monitoring costs, token usage, and turn counts.

The class implements three tiers of protection:
1.  **Warning**: Emitted when resource usage approaches configured limits (typically 80%).
2.  **Error**: An escalated warning state (typically 95%) indicating that the UI should prompt the user.
3.  **Blocked**: A hard stop where the agent is prevented from proceeding because a budget has been exceeded.

## Signature / Constructor

### Constructor
```typescript
constructor(config: GuardrailConfig)
```

### GuardrailConfig
```typescript
export type GuardrailConfig = {
  /** Maximum USD cost per session. Default: Infinity (no limit). */
  maxCostUSD?: number
  /** Maximum total tokens (input+output) per session. Default: Infinity. */
  maxTokensPerSession?: number
  /** Maximum turns (model calls) per single run(). Default: Infinity. */
  maxTurnsPerRun?: number
  /** Maximum input tokens for a single model call. Default: Infinity. */
  maxInputTokensPerCall?: number
  /** Percentage of budget at which to emit 'warning'. Default: 80. */
  warningPct?: number
  /** Percentage of budget at which to emit 'error'. Default: 95. */
  errorPct?: number
}
```

## Methods & Properties

### check()
Evaluates the current state of a `CostTracker` against the configured guardrails.
```typescript
check(tracker: CostTracker): GuardrailCheckResult
```
**Returns**: A `GuardrailCheckResult` containing the current status (`ok`, `warning`, `error`, or `blocked`), a boolean `blocked` flag, and specific details for each monitored resource.

### Supporting Types
The following types are used to represent the state of the guardrails:

*   **GuardrailResource**: `'cost' | 'tokens' | 'turns' | 'input_tokens'`
*   **GuardrailStatus**: `'ok' | 'warning' | 'error' | 'blocked'`
*   **GuardrailCheckResult**:
    ```typescript
    {
      status: GuardrailStatus
      blocked: boolean
      reason?: string
      details: GuardrailDetail[]
    }
    ```
*   **GuardrailDetail**:
    ```typescript
    {
      resource: GuardrailResource
      status: GuardrailStatus
      current: number
      limit: number
      pctUsed: number
    }
    ```

## Events
The `Guardrails` class emits events when usage thresholds are crossed.

| Event | Payload Type | Description |
| :--- | :--- | :--- |
| `warning` | `GuardrailEvent` | Emitted when a resource exceeds the `warningPct`. |
| `blocked` | `GuardrailEvent` | Emitted when a resource budget is fully exceeded. |

### GuardrailEvent
```typescript
export type GuardrailEvent = {
  type: 'warning' | 'blocked';
  resource: GuardrailResource;
  current: number;
  limit: number;
  pctUsed: number;
}
```

## Examples

### Basic Usage
```typescript
const guardrails = new Guardrails({
  maxCostUSD: 5.00,          // $5 per session
  maxTokensPerSession: 500_000,
  maxTurnsPerRun: 50,
  warningPct: 80,            // Warn at 80% usage
});

guardrails.on('warning', ({ resource, usage, limit }) => {
  console.warn(`Approaching ${resource} limit: ${usage}/${limit}`);
});

guardrails.on('blocked', ({ resource }) => {
  console.error(`${resource} budget exceeded — agent stopped`);
});

// Check before each model call
const check = guardrails.check(tracker);
if (check.blocked) {
  throw new BudgetExceededError(check.reason);
}
```

## See Also
* `BudgetExceededError` — The error thrown when a guardrail hard limit is reached.