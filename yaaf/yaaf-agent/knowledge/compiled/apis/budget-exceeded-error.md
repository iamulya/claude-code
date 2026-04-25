---
export_name: BudgetExceededError
source_file: src/utils/guardrails.ts
category: class
summary: An error class thrown when a Guardrails budget limit is exceeded, preventing further agent execution.
title: BudgetExceededError
entity_type: api
search_terms:
 - guardrails error
 - agent execution stopped
 - cost limit exceeded
 - token limit reached
 - runaway agent prevention
 - YAAFError subclass
 - how to handle budget errors
 - agent resource management
 - session budget error
 - max turns exceeded
 - guardrail blocking
 - stop agent execution
 - resource limit error
stub: false
compiled_at: 2026-04-24T16:52:30.067Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`BudgetExceededError` is a specialized error class that indicates an agent's execution has been halted because a predefined resource limit has been met or exceeded [Source 1]. It is part of the YAAF Guardrails subsystem, which prevents runaway agent loops from consuming excessive resources like tokens, cost, or execution turns [Source 1].

This error is typically thrown [when](./when.md) a check against the `Guardrails` service returns a `blocked` status. Throwing `BudgetExceededError` provides a specific, catchable exception that allows application code to gracefully handle the termination of an agent's run due to budget constraints [Source 1]. It extends the base `YAAFError` class [Source 1].

## Signature / Constructor

`BudgetExceededError` extends the standard `YAAFError` class and is instantiated with a message describing why the budget was exceeded [Source 1].

```typescript
export class BudgetExceededError extends YAAFError {
  constructor(message?: string);
}
```

**Parameters:**

*   `message` (optional `string`): A human-readable message explaining which resource limit was exceeded. This is often sourced from the `reason` field of a `GuardrailCheckResult` [Source 1].

## Methods & Properties

`BudgetExceededError` inherits all properties from the standard JavaScript `Error` class (e.g., `name`, `message`, `stack`) via its parent, `YAAFError`. It does not define any additional public methods or properties [Source 1].

## Examples

The primary use case is to check the result from a `Guardrails` instance and throw this error if the agent's operation is blocked.

```typescript
import { Guardrails, BudgetExceededError, CostTracker } from 'yaaf';

const guardrails = new Guardrails({
  maxCostUSD: 1.00, // $1 limit per session
});

const tracker = new CostTracker();

// ... agent logic that updates the tracker ...

try {
  // Before a critical operation, check the budget
  const check = guardrails.check(tracker);

  if (check.blocked) {
    throw new BudgetExceededError(check.reason);
  }

  // ... proceed with model call or other expensive operation ...

} catch (error) {
  if (error instanceof BudgetExceededError) {
    console.error(`Agent stopped due to budget limits: ${error.message}`);
    // Perform cleanup or notify the user
  } else {
    // Handle other types of errors
    console.error('An unexpected error occurred:', error);
  }
}
```
[Source 1]

## See Also

*   `Guardrails`: The class responsible for tracking resource usage and determining if a budget has been exceeded.
*   `YAAFError`: The base error class from which `BudgetExceededError` inherits.

## Sources

[Source 1]: src/utils/guardrails.ts