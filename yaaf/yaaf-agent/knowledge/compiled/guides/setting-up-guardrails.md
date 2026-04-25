---
summary: A guide on how to configure and integrate Guardrails into a YAAF agent to manage resource usage and prevent budget overruns.
title: Setting up Guardrails
entity_type: guide
difficulty: beginner
search_terms:
 - how to limit agent cost
 - prevent runaway LLM loops
 - YAAF budget control
 - agent resource management
 - set max tokens
 - cost tracking for agents
 - guardrail configuration
 - BudgetExceededError
 - limit model calls
 - session cost limit
 - token usage warning
 - agent safety limits
stub: false
compiled_at: 2026-04-24T18:07:59.545Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

This guide demonstrates how to implement and configure Guardrails in a YAAF agent. Guardrails are a crucial safety feature for preventing runaway agent execution from consuming excessive resources or incurring unexpected costs [Source 1]. By setting limits on metrics like token count, monetary cost, and the number of model calls, developers can ensure their agents operate within a predefined budget.

You will learn how to:
1.  Instantiate and configure the `Guardrails` class with specific limits.
2.  Listen for events [when](../apis/when.md) usage approaches these limits.
3.  Integrate checks into an agent's execution loop to stop it when a limit is exceeded.

## Prerequisites

Before implementing Guardrails, you should have a basic YAAF agent structure. This guide also assumes you have a `CostTracker` instance, which is responsible for tracking resource usage throughout an agent's session. The `Guardrails` class consumes data from the `CostTracker` to perform its checks [Source 1].

## Step-by-Step

The implementation involves three main steps: initializing the guardrails, listening for status events, and actively checking the limits before performing expensive operations.

### Step 1: Configure and Instantiate Guardrails

First, import the `Guardrails` class and instantiate it with your desired configuration. The configuration object allows you to set hard limits for various resources [Source 1].

```typescript
import { Guardrails, BudgetExceededError } from "yaaf-agent";
import type { CostTracker } from "yaaf-agent"; // Assuming CostTracker is available

// Define the budget for the agent's session
const guardrails = new Guardrails({
  maxCostUSD: 5.00,           // Max cost of $5.00 per session
  maxTokensPerSession: 500_000, // Max 500k tokens per session
  maxTurnsPerRun: 50,           // Max 50 model calls per run
  warningPct: 80,             // Emit a 'warning' event at 80% usage
});
```

### Step 2: Listen for Events

Guardrails use an event-based system to notify your application as it approaches the configured limits. There are three tiers of protection: `warning`, `error`, and `blocked` [Source 1]. You can listen for these events to log them or update the UI.

```typescript
guardrails.on('warning', ({ resource, current, limit }) => {
  console.warn(`Approaching ${resource} limit: ${current} / ${limit} used.`);
});

guardrails.on('blocked', ({ resource }) => {
  // This event fires when a check transitions to a 'blocked' state.
  console.error(`Budget for ${resource} exceeded. Agent will be stopped.`);
});
```

### Step 3: Integrate Checks into the Agent Loop

The most critical step is to check the guardrails before each potentially expensive operation, such as a model call. The `guardrails.check()` method takes a `CostTracker` instance and returns the current status. If the status is `blocked`, the agent's execution should be halted, typically by throwing an error [Source 1].

```typescript
// Assume 'costTracker' is an instance of CostTracker that is being
// updated throughout the agent's lifecycle.

function agentExecutionLoop(costTracker: CostTracker) {
  // --- Inside your agent's loop, before a model call ---

  // 1. Check the budget
  const check = guardrails.check(costTracker);

  // 2. Halt execution if a limit has been exceeded
  if (check.blocked) {
    throw new BudgetExceededError(check.reason);
  }

  // 3. If not blocked, proceed with the model call
  // ... call[[LLM]]() ...
}

// You should wrap your main agent logic in a try/catch block
// to handle the error gracefully.
try {
  // ... run agent ...
  agentExecutionLoop(costTracker);
} catch (error) {
  if (error instanceof BudgetExceededError) {
    console.error("Agent stopped due to budget limits:", error.message);
    // Perform cleanup or notify the user
  } else {
    // Handle other errors
  }
}
```

## Configuration Reference

The `Guardrails` constructor accepts a `GuardrailConfig` object with the following optional properties [Source 1]:

| Property                | Type     | Default    | Description                                                      |
| ----------------------- | -------- | ---------- | ---------------------------------------------------------------- |
| `maxCostUSD`            | `number` | `Infinity` | Maximum USD cost per session.                                    |
| `maxTokensPerSession`   | `number` | `Infinity` | Maximum total tokens (input + output) per session.               |
| `maxTurnsPerRun`        | `number` | `Infinity` | Maximum number of model calls per single `run()` invocation.     |
| `maxInputTokensPerCall` | `number` | `Infinity` | Maximum input tokens for a single model call.                    |
| `warningPct`            | `number` | `80`       | Percentage of budget usage at which to emit a `warning` event.   |
| `errorPct`              | `number` | `95`       | Percentage of budget usage at which to emit an `error` event.    |

## Common Mistakes

1.  **Checking After the Operation:** Placing the `guardrails.check()` call *after* an [LLM Call](../concepts/llm-call.md). The check must happen *before* the resource is consumed to prevent the final overrun.
2.  **Not Handling `BudgetExceededError`:** Failing to wrap the agent's execution logic in a `try...catch` block. This will result in an unhandled exception that crashes the process when a limit is reached.
3.  **Ignoring Events:** Configuring guardrails but not setting up listeners for `warning` or `error` events. These events provide a crucial early-warning system to inform the user or the system before a hard stop occurs.

## Next Steps

With Guardrails in place, consider the following enhancements:
*   **UI Integration:** Connect the `warning` and `error` events to your application's UI to provide real-time feedback to the user about resource consumption.
*   **Graceful Shutdown:** In your `catch` block for `BudgetExceededError`, implement logic for the agent to save its state or produce a summary of its work before terminating.
*   **Dynamic Configuration:** Load guardrail limits from a user's profile or application-level configuration file to allow for different budget tiers.

## Sources
[Source 1]: src/utils/guardrails.ts