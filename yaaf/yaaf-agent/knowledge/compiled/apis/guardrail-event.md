---
export_name: GuardrailEvent
source_file: src/utils/guardrails.ts
category: type
summary: Defines the structure of events emitted by the Guardrails class, such as 'warning' events.
title: GuardrailEvent
entity_type: api
search_terms:
 - guardrail events
 - budget warning event
 - resource limit notification
 - cost management events
 - token usage alerts
 - agent safety events
 - Guardrails class events
 - listening for budget warnings
 - Guardrails.on('warning', ...)
 - guardrail event payload
 - GuardrailListener type
 - resource consumption alert
stub: false
compiled_at: 2026-04-24T17:10:25.047Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `GuardrailEvent` type defines the data structure for events emitted by an instance of the `Guardrails` class [Source 1]. These events are triggered [when](./when.md) resource usage approaches or exceeds predefined thresholds.

This type is used as the parameter for `GuardrailListener` functions, allowing developers to react to budget-related events, such as logging a warning when token consumption is nearing its limit [Source 1]. The primary event type shown in the source is `'warning'` [Source 1].

## Signature

`GuardrailEvent` is a discriminated union type. The `type` property determines the shape of the rest of the object.

```typescript
export type GuardrailEvent =
  | {
      type: "warning";
      resource: GuardrailResource;
      current: number;
      limit: number;
      pctUsed: number;
    }
  // ... other potential event types
```

### Properties

*   `type: "warning"`: The type of event that occurred. Currently, only `'warning'` is defined [Source 1].
*   `resource: GuardrailResource`: The specific resource that triggered the event. Can be `"cost"`, `"tokens"`, `"turns"`, or `"input_tokens"` [Source 1].
*   `current: number`: The current usage value for the specified resource [Source 1].
*   `limit: number`: The configured limit for the resource [Source 1].
*   `pctUsed: number`: The percentage of the resource limit that has been consumed [Source 1].

## Examples

The following example demonstrates how to set up a listener for a `warning` event. The callback function receives a `GuardrailEvent` object and logs a message to the console.

```typescript
import { Guardrails } from 'yaaf';

const guardrails = new Guardrails({
  maxCostUSD: 5.00,
  maxTokensPerSession: 500_000,
  warningPct: 80, // Warn at 80% usage
});

// The listener function receives a GuardrailEvent object
guardrails.on('warning', ({ resource, current, limit }) => {
  console.warn(`Approaching ${resource} limit: ${current}/${limit}`);
});

guardrails.on('blocked', ({ resource }) => {
  console.error(`${resource} budget exceeded — agent stopped`);
});
```
*Note: The source code example uses `usage` as a destructured property name in its callback, while the type definition specifies `current`. The example above has been adjusted to match the type definition for clarity.* [Source 1]

## See Also

*   `Guardrails`: The class that emits `GuardrailEvent` objects.
*   `GuardrailListener`: The type definition for a function that handles a `GuardrailEvent`.
*   `GuardrailResource`: The type defining the possible resources that can be monitored.

## Sources

[Source 1]: src/utils/guardrails.ts