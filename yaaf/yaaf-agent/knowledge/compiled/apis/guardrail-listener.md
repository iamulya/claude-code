---
export_name: GuardrailListener
source_file: src/utils/guardrails.ts
category: type
summary: A type for callback functions that listen to Guardrails events.
title: GuardrailListener
entity_type: api
search_terms:
 - guardrails event handler
 - listen for budget warnings
 - guardrails callback function
 - handle resource limit events
 - cost limit notification
 - token usage warning
 - agent budget monitoring
 - Guardrails.on callback
 - type for guardrail events
 - budget exceeded event
 - YAAF resource limits
stub: false
compiled_at: 2026-04-24T17:10:28.202Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `GuardrailListener` is a TypeScript type alias for a function that acts as a callback for events emitted by the `Guardrails` class [Source 1]. It is used to monitor an agent's resource consumption and react [when](./when.md) usage approaches or exceeds configured limits.

A function conforming to the `GuardrailListener` signature can be registered with a `Guardrails` instance to handle events like `'warning'`, which is triggered when resource usage surpasses a certain percentage of the defined budget [Source 1]. The listener receives a single argument, a `GuardrailEvent` object, containing detailed information about the specific limit being approached [Source 1].

## Signature

`GuardrailListener` is defined as a function type that accepts one argument and returns `void` [Source 1].

```typescript
export type GuardrailListener = (event: GuardrailEvent) => void;
```

### Parameters

-   **`event`**: `GuardrailEvent`
    An object containing details about the event that was triggered. The `GuardrailEvent` type is defined as [Source 1]:

    ```typescript
    export type GuardrailEvent = {
      type: "warning";
      resource: GuardrailResource;
      current: number;
      limit: number;
      pctUsed: number;
    };
    ```

    -   `type`: The type of event. Based on the provided source, this is always `"warning"` [Source 1].
    -   `resource`: The specific resource that triggered the event. Can be `"cost"`, `"tokens"`, `"turns"`, or `"input_tokens"` [Source 1].
    -   `current`: The current usage value for the resource [Source 1].
    -   `limit`: The configured limit for the resource [Source 1].
    -   `pctUsed`: The percentage of the limit that has been used [Source 1].

## Examples

The following example demonstrates how to define a `GuardrailListener` and attach it to a `Guardrails` instance to log warnings when resource usage exceeds 80% of the configured limit [Source 1].

```typescript
import { Guardrails, GuardrailListener } from 'yaaf';

// Create a Guardrails instance with specific limits
const guardrails = new Guardrails({
  maxCostUSD: 5.00, // $5 per session
  maxTokensPerSession: 500_000,
  warningPct: 80, // Warn at 80% usage
});

// Define a listener function that matches the GuardrailListener type
const handleWarning: GuardrailListener = ({ resource, current, limit }) => {
  console.warn(`Approaching ${resource} limit: ${current}/${limit}`);
};

// Register the listener for the 'warning' event
guardrails.on('warning', handleWarning);

// In an agent's execution loop, you would check the guardrails.
// If the cost tracker shows usage over 80% of $5.00, the
// handleWarning function will be called.
//
// const check = guardrails.check(tracker);
```

## See Also

-   `Guardrails`: The class that uses `GuardrailListener` to emit events about resource consumption.
-   `GuardrailEvent`: The type of the event object passed to the listener.
-   `GuardrailResource`: The type defining the different resources that can be monitored.

## Sources

[Source 1] src/utils/guardrails.ts