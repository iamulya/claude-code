---
summary: The subsystem responsible for tracking resource usage, applying budget limits, and enforcing cost policies within YAAF agents.
primary_files:
 - src/utils/guardrails.ts
 - src/utils/costTracker.ts
title: Budget Management
entity_type: subsystem
exports:
 - Guardrails
 - GuardrailConfig
 - BudgetExceededError
search_terms:
 - cost control
 - prevent runaway agents
 - limit LLM usage
 - token budget
 - session cost limit
 - how to stop agent loops
 - resource guardrails
 - usage policies
 - max tokens per session
 - max cost per session
 - agent safety
 - budget exceeded error
stub: false
compiled_at: 2026-04-24T18:10:11.195Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Budget Management subsystem provides guardrails to prevent YAAF agents from consuming unbounded resources during execution [Source 1]. Its primary purpose is to enforce usage-based limits and cost policies, which is critical for preventing runaway agent loops that could lead to excessive costs or token consumption.

This subsystem implements a three-tiered protection model [Source 1]:
1.  **Warning**: Emits an event [when](../apis/when.md) resource usage approaches a configured threshold (e.g., 80% of the limit).
2.  **Error**: A more severe warning level, typically triggered closer to the limit (e.g., 95%), intended to prompt a user for action.
3.  **Blocked**: A hard stop that prevents the agent from proceeding once a limit has been exceeded.

## Architecture

The core of the subsystem is the `Guardrails` class, which is initialized with a configuration object defining various resource limits. It works in conjunction with a `CostTracker` instance, which is responsible for accumulating usage metrics like token counts, monetary cost, and the number of turns [Source 1].

The typical interaction pattern involves the agent's main execution loop querying the `Guardrails` instance before performing a resource-intensive operation, such as a model call. The `Guardrails.check()` method takes the current `CostTracker` state and evaluates it against the configured limits. It returns a `GuardrailCheckResult` object indicating the current status (`ok`, `warning`, `error`, or `blocked`). If the status is `blocked`, the agent is expected to halt execution, often by throwing a `BudgetExceededError` [Source 1].

The `Guardrails` class also functions as an event emitter, allowing other parts of the application to subscribe to budget-related events like `'warning'` and `'blocked'` [Source 1].

## Integration Points

The Budget Management subsystem integrates with other parts of the framework in several ways:

*   **Agent Execution Loop**: The agent's core logic must invoke `guardrails.check()` before each model call to ensure budget limits are not breached.
*   **CostTracker**: The `Guardrails` class is a consumer of data produced by a `CostTracker`. The `CostTracker` is responsible for tracking usage, while `Guardrails` is responsible for enforcing policies based on that usage [Source 1].
*   **UI/Logging**: Through its event-based API (`on('warning', ...)`), this subsystem can integrate with user interfaces to display warnings or with logging systems to record budget-related events [Source 1].

## Key APIs

*   **`Guardrails`**: The main class that enforces budget policies. It is configured with limits and checked against a `CostTracker` [Source 1].
*   **`GuardrailConfig`**: A configuration object that defines the specific limits for a session, such as `maxCostUSD`, `maxTokensPerSession`, and `maxTurnsPerRun` [Source 1].
*   **`Guardrails.check(tracker)`**: The primary method used to evaluate the current resource usage against the configured limits. It returns a `GuardrailCheckResult` with the overall status [Source 1].
*   **`BudgetExceededError`**: A specialized error class that should be thrown when the `check()` method indicates a `blocked` state, allowing for graceful termination of the agent's run [Source 1].

## Configuration

This subsystem is configured by instantiating the `Guardrails` class with a `GuardrailConfig` object. The configuration specifies the limits for various resources.

Key configuration properties include [Source 1]:
*   `maxCostUSD`: The maximum monetary cost in USD allowed per session.
*   `maxTokensPerSession`: The maximum total tokens (input and output) allowed per session.
*   `maxTurnsPerRun`: The maximum number of model calls allowed in a single agent `run()`.
*   `maxInputTokensPerCall`: The maximum number of input tokens for a single model call.
*   `warningPct`: The usage percentage at which to emit a `warning` event (default: 80).
*   `errorPct`: The usage percentage at which to emit an `error` event (default: 95).

### Example

```typescript
const guardrails = new Guardrails({
  maxCostUSD: 5.00, // $5 per session
  maxTokensPerSession: 500_000,
  maxTurnsPerRun: 50,
  warningPct: 80, // Warn at 80% usage
});

guardrails.on('warning', ({ resource, usage, limit }) => {
  console.warn(`Approaching ${resource} limit: ${usage}/${limit}`);
});

guardrails.on('blocked', ({ resource }) => {
  console.error(`${resource} budget exceeded — agent stopped`);
});

// In the agent loop, before each model call:
const check = guardrails.check(tracker); // tracker is a CostTracker instance
if (check.blocked) {
  throw new BudgetExceededError(check.reason);
}
```
[Source 1]

## Extension Points

The primary mechanism for extending the behavior of the Budget Management subsystem is through its event listener interface. Developers can register listeners for events such as `warning` to implement custom logic. This could include sending notifications, pausing the agent to request user confirmation, or dynamically adjusting agent behavior as it approaches its limits [Source 1].

## Sources

[Source 1]: `src/utils/guardrails.ts`