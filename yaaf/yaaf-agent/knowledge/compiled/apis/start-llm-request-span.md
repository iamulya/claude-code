---
summary: Starts an OpenTelemetry span for one ChatModel.complete() call.
export_name: startLLMRequestSpan
source_file: src/telemetry/tracing.ts
category: function
title: startLLMRequestSpan
entity_type: api
search_terms:
 - LLM call tracing
 - OpenTelemetry span for LLM
 - how to trace ChatModel.complete
 - instrumenting LLM requests
 - YAAF telemetry
 - agent observability
 - monitoring model calls
 - start LLM span
 - end LLM span
 - tracing parallel LLM calls
 - YAAF_OTEL_TRACES_EXPORTER
 - initYAAFTelemetry
stub: false
compiled_at: 2026-04-24T17:40:11.184Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `start[[[[[[[[LLM]]]]]]]]Request[[[[[[[[Span]]]]]]]]` function creates and starts an [OpenTelemetry](../concepts/open-telemetry.md) Span to [Trace](../concepts/trace.md) a single call to a language model via an interface like `ChatModel.complete()` [Source 1]. It is a core component of the YAAF telemetry subsystem, designed for performance monitoring and debugging of agent interactions with LLMs.

This function is intended to be used in pairs with `endLLMRequestSpan`. `startLLMRequestSpan` returns a `Span` object that must be passed to `endLLMRequestSpan` to correctly close the span and record its duration and outcome. This explicit passing of the span object is important for correctly tracing multiple [LLM Call](../concepts/llm-call.md)s that may be running in parallel [Source 1].

If an `agent.run` span is active in the current asynchronous context, the new `llm.request` span will automatically be created as its child, forming a structured trace for the agent's turn [Source 1].

Tracing is disabled by default and must be activated by setting environment variables (e.g., `YAAF_OTEL_TRACES_EXPORTER`) and calling `initYAAFTelemetry()` at application startup. If tracing is not enabled, this function becomes a no-op with zero performance overhead [Source 1].

## Signature

```typescript
export function startLLMRequestSpan(opts: { /* implementation-specific options */ }): Span;
```

### Parameters

-   **`opts`**: An object containing attributes to be attached to the span. The specific properties are not part of the public API but are used internally to build span attributes [Source 1].

### Returns

-   **`Span`**: The newly created OpenTelemetry `Span` object, or a no-op `Span` if tracing is disabled. This object must be captured and passed to `endLLMRequestSpan` [Source 1].

## Examples

The following example demonstrates the standard pattern for tracing an LLM Call. The span is started before the call, and `endLLMRequestSpan` is called within a `finally` block to ensure the span is closed even if the LLM call throws an error.

```typescript
import { startLLMRequestSpan, endLLMRequestSpan } from 'yaaf';
import { type Span } from '@opentelemetry/api';
import { myChatModel } from './my-model';

async function getCompletionWithTracing() {
  // Start the span, providing metadata about the request.
  const span: Span = startLLMRequestSpan({
    model: 'claude-3-opus',
    provider: 'anthropic',
  });

  try {
    const response = await myChatModel.complete({
      messages: [{ role: 'user', content: 'Hello, world!' }],
    });

    // On success, end the span with completion metadata.
    endLLMRequestSpan(span, {
      finishReason: response.finishReason,
      tokenUsage: response.usage,
    });

    return response;
  } catch (error) {
    // On failure, end the span and record the error.
    endLLMRequestSpan(span, { error });
    throw error; // Re-throw the original error.
  }
}
```

## See Also

-   `endLLMRequestSpan`
-   `startAgentRunSpan`
-   `executeInSpan`

## Sources

[Source 1]: src/telemetry/tracing.ts