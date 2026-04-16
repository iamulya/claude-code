---
title: Guardrails Concept
entity_type: concept
summary: Framework-level safety mechanism for monitoring and limiting resource consumption like tokens, cost, and turns.
stub: false
compiled_at: 2026-04-16T14:39:37.963Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/guardrails.ts
confidence: 0.95
---

## What It Is
Guardrails are a safety and resource management abstraction in YAAF designed to prevent agents from consuming excessive resources. They implement usage-based budget limits and cost policies to mitigate the risks associated with runaway agent loops or unexpectedly expensive model interactions. By providing a structured way to monitor and halt execution, Guardrails ensure that LLM-powered applications remain within predictable financial and operational boundaries.

## How It Works in YAAF
The Guardrails system operates by tracking specific resource metrics against predefined limits. It categorizes usage into four distinct status levels:

1.  **OK**: Usage is within safe parameters.
2.  **Warning**: Usage has reached a specific threshold (defaulting to 80% of the limit), triggering an event to notify the system or developer.
3.  **Error**: Usage has reached a critical threshold (defaulting to 95%), signaling that the UI should prompt the user or that the agent is nearing a hard stop.
4.  **Blocked**: A hard stop where the budget is fully exceeded. At this stage, the agent is prevented from proceeding with further model calls.

The framework monitors four primary resource types defined in the `GuardrailResource` type:
*   **Cost**: Total USD spent during a session.
*   **Tokens**: Total input and output tokens consumed in a session.
*   **Turns**: The number of model calls (turns) within a single `run()` execution.
*   **Input Tokens**: The size of the input for a single specific model call.

The core implementation resides in the `Guardrails` class. During execution, the framework or developer calls the `check()` method, passing a tracker (such as a `CostTracker`) to evaluate the current state. If a limit is breached, the system can throw a `BudgetExceededError`, which is a specialized `YAAFError`.

## Configuration
Guardrails are configured using the `GuardrailConfig` object. If a specific limit is not provided, it defaults to `Infinity`, effectively disabling that specific check.

```typescript
const guardrails = new Guardrails({
  maxCostUSD: 5.00,          // $5 per session limit
  maxTokensPerSession: 500_000,
  maxTurnsPerRun: 50,        // Prevent infinite loops
  warningPct: 80,            // Emit warning at 80% usage
  errorPct: 95               // Escalate at 95% usage
});

// Example of handling events
guardrails.on('warning', ({ resource, current, limit }) => {
  console.warn(`Approaching ${resource} limit: ${current}/${limit}`);
});

// Checking status during execution
const check = guardrails.check(tracker);
if (check.blocked) {
  throw new BudgetExceededError(check.reason);
}
```

## Sources
* `src/utils/guardrails.ts`