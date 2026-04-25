---
title: Observability
entity_type: concept
summary: YAAF provides observability through optional callback hooks in key subsystems, allowing developers to monitor internal events like model routing and retry attempts for logging and telemetry.
search_terms:
 - how to log YAAF events
 - monitoring agent behavior
 - telemetry in YAAF
 - onRetry callback
 - onRoute callback
 - debugging agent decisions
 - instrumenting YAAF
 - logging retry attempts
 - tracking model routing
 - YAAF hooks
 - agent performance monitoring
 - instrumentation callbacks
stub: false
compiled_at: 2026-04-24T17:59:26.079Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Observability in YAAF refers to the mechanisms that allow developers to gain insight into the internal state and decision-making processes of agents. Rather than being a distinct subsystem, it is a cross-cutting concern implemented as a pattern of optional callback functions exposed at critical points within the framework.

This pattern enables developers to hook into the agent's lifecycle to implement logging, send metrics to telemetry systems, or perform real-time debugging. It addresses the need to understand why an agent made a particular choice, how it is recovering from transient errors, and how it is performing in terms of cost and latency.

## How It Works in YAAF

YAAF's approach to observability is decentralized, with individual components offering specific hooks in their configuration objects. [when](../apis/when.md) an event of interest occurs, the framework component invokes the provided callback function, passing a context object with relevant data about the event.

Two prominent examples of this pattern are found in [Model Routing](./model-routing.md) and [Retry Logic](./retry-logic.md):

1.  **Model Routing**: The `RouterChatModel` is a component that dynamically chooses between a fast, inexpensive [LLM](./llm.md) and a more capable, expensive one. It exposes an `onRoute` callback in its configuration. This function is called immediately after the routing decision is made, providing the outcome (`'fast'` or `'capable'`) and the context (messages, [Tools](../subsystems/tools.md), iteration number) that informed the decision [Source 1]. This allows for detailed logging of model selection, which is crucial for cost analysis and quality tuning.

2.  **Retry Logic**: The `withRetry` utility, used for handling transient API errors, provides an `onRetry` callback. This function is invoked before each retry attempt. The callback receives an object containing the current attempt number, the maximum number of retries, the error that triggered the retry, and the calculated backoff delay in milliseconds [Source 2]. This is useful for monitoring the frequency and nature of transient failures and understanding the resilience of the agent's interactions with external services.

## Configuration

Developers can enable observability by providing callback functions in the configuration objects of relevant YAAF components.

### Router Observability

The `onRoute` callback can be supplied when instantiating a `RouterChatModel` to log each routing decision.

```typescript
import { RouterChatModel, GeminiChatModel, type RoutingDecision, type RouterContext } from 'yaaf';

const logRoute = (decision: RoutingDecision, ctx: RouterContext) => {
  console.log(`Routing decision: ${decision}`, {
    iteration: ctx.iteration,
    messageCount: ctx.messages.length,
    toolCount: ctx.tools?.length ?? 0,
  });
};

const model = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
  onRoute: logRoute, // Hook for observability
});
```
This configuration logs the routing choice and the key factors that influenced it for every [LLM Call](./llm-call.md) made through this model [Source 1].

### Retry Observability

The `onRetry` callback is provided to the `withRetry` utility to monitor transient errors and recovery attempts.

```typescript
import { withRetry } from 'yaaf';

async function fallibleOperation() {
  // An operation that might fail, e.g., an API call
  if (Math.random() > 0.5) {
    throw new Error("Transient network error");
  }
  return { success: true };
}

await withRetry(
  (attempt) => fallibleOperation(),
  {
    maxRetries: 5,
    onRetry: (info) => {
      console.warn(`Retrying operation...`, {
        attempt: info.attempt,
        maxRetries: info.maxRetries,
        delayMs: info.delayMs,
        error: info.error,
      });
    },
  }
);
```
This example logs a warning with detailed context each time the `fallibleOperation` fails and a retry is scheduled [Source 2].

## Sources

[Source 1]: src/models/router.ts
[Source 2]: src/utils/retry.ts