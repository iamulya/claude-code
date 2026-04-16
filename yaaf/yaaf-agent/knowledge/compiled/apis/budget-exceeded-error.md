---
title: BudgetExceededError
entity_type: api
summary: Specialized error thrown when a guardrail hard-stop is triggered due to budget exhaustion.
export_name: BudgetExceededError
source_file: src/utils/guardrails.ts
category: class
stub: false
compiled_at: 2026-04-16T14:39:41.915Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/guardrails.ts
confidence: 1
---

## Overview
`BudgetExceededError` is a specialized exception class used within the YAAF framework to signal that an agent's execution has been terminated due to a breach of safety limits. It is typically thrown when the `Guardrails` system detects that a session or run has reached its maximum allowed cost, token usage, or turn count.

This error represents a "hard stop" (blocked state), distinguishing it from lower-severity guardrail states such as warnings or non-fatal errors that might only trigger UI notifications.

## Signature / Constructor
`BudgetExceededError` extends the base `YAAFError` class.

```typescript
export class BudgetExceededError extends YAAFError {
  /**
   * @param message A description of the specific budget limit that was exceeded.
   */
  constructor(message?: string);
}
```

## Methods & Properties
As a subclass of `YAAFError`, this class inherits standard error properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `message` | `string` | A human-readable description of the budget violation (e.g., "cost budget exceeded"). |
| `name` | `string` | The name of the error class, typically `"BudgetExceededError"`. |
| `stack` | `string` | The stack trace at the point where the error was instantiated. |

## Examples
The following example demonstrates how `BudgetExceededError` is used in conjunction with the `Guardrails` utility to halt execution.

```typescript
import { Guardrails, BudgetExceededError } from 'yaaf';

const guardrails = new Guardrails({
  maxCostUSD: 5.00,
  maxTurnsPerRun: 50
});

// Logic typically found within an agent's execution loop or middleware
const check = guardrails.check(costTracker);

if (check.blocked) {
  // check.reason contains details about which resource was exhausted
  throw new BudgetExceededError(check.reason);
}
```

## See Also
- `Guardrails`
- `CostTracker`
- `YAAFError`