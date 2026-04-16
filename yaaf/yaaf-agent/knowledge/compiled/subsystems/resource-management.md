---
title: Resource Management Subsystem
entity_type: subsystem
summary: Logical subsystem for tracking costs and enforcing safety limits across agent operations.
primary_files:
  - src/utils/guardrails.ts
  - src/utils/costTracker.ts
exports:
  - Guardrails
  - CostTracker
  - BudgetExceededError
stub: false
compiled_at: 2026-04-16T14:39:40.105Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/guardrails.ts
confidence: 0.9
---

## Purpose
The Resource Management subsystem provides usage-based budget limits and cost policies for YAAF agents. Its primary objective is to prevent runaway agent loops from consuming unbounded resources, ensuring that LLM operations remain within predefined financial and computational boundaries. It serves as a safety layer that monitors session-wide and call-specific metrics.

## Architecture
The subsystem is structured around two primary components: tracking and enforcement.

### Cost Tracking
The `CostTracker` (defined in `src/utils/costTracker.ts`) serves as the data provider for the subsystem. It aggregates usage metrics across the lifecycle of an agent session, including token counts and calculated USD costs based on provider-specific pricing.

### Guardrails and Policy Enforcement
The `Guardrails` class implements the logic for evaluating current usage against configured limits. It employs a three-tier protection model to manage resource consumption:

1.  **Warning**: Emitted when resource usage reaches a specific threshold (default 80%). This allows the system to notify users or logs without interrupting the agent.
2.  **Error**: An escalated state (default 95%) indicating that the budget is nearly exhausted.
3.  **Blocked**: A hard stop enforced when a limit is reached or exceeded. The agent is prevented from proceeding with further model calls.

## Key APIs
The subsystem exposes several types and classes to manage resource safety:

### Guardrails
The central class for checking budget status.
*   `check(tracker: CostTracker)`: Evaluates the current state of the provided tracker against the guardrail configuration. It returns a `GuardrailCheckResult` containing the status and specific details for each resource.
*   **Events**: Supports listeners for `warning` and `blocked` events to allow for reactive UI updates or logging.

### BudgetExceededError
A specialized `YAAFError` thrown when an operation is attempted after a resource limit has been reached.

### GuardrailCheckResult
An object returned by the check method that includes:
*   `status`: The highest severity status found (`ok`, `warning`, `error`, or `blocked`).
*   `blocked`: A boolean flag indicating if the agent should stop.
*   `details`: An array of `GuardrailDetail` objects providing granular data (percentage used, current value, and limit) for each tracked resource.

## Configuration
Developers configure resource limits via the `GuardrailConfig` object, which can be passed to the `Guardrails` constructor.

| Field | Description | Default |
|-------|-------------|---------|
| `maxCostUSD` | Maximum USD cost per session. | Infinity |
| `maxTokensPerSession` | Maximum total tokens (input + output) per session. | Infinity |
| `maxTurnsPerRun` | Maximum model calls per single `run()` execution. | Infinity |
| `maxInputTokensPerCall` | Maximum input tokens allowed for a single model call. | Infinity |
| `warningPct` | Percentage of budget at which to emit a 'warning'. | 80 |
| `errorPct` | Percentage of budget at which to emit an 'error'. | 95 |

### Example Implementation
```ts
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
if (check.blocked) throw new BudgetExceededError(check.reason);
```

## Extension Points
The subsystem is designed to be integrated into the agent's execution loop. While the core logic resides in `Guardrails`, developers can extend behavior by:
*   **Custom Event Listeners**: Attaching specific logic to the `warning` or `blocked` events (e.g., triggering a UI modal for user approval to increase budget).
*   **Manual Checks**: Invoking `guardrails.check()` at different stages of the agent lifecycle beyond just model calls, such as before expensive tool executions.