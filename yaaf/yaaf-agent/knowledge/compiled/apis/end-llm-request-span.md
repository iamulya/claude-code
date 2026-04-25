---
summary: Ends an OpenTelemetry span associated with a ChatModel.complete() call.
export_name: endLLMRequestSpan
source_file: src/telemetry/tracing.ts
category: function
title: endLLMRequestSpan
entity_type: api
search_terms:
 - end LLM span
 - finish tracing LLM call
 - OpenTelemetry span end
 - YAAF tracing API
 - instrument ChatModel complete
 - how to trace LLM requests
 - telemetry for language models
 - complete LLM request trace
 - span lifecycle management
 - YAAF observability
 - endLLMRequestSpan usage
 - startLLMRequestSpan pair
 - tracing parallel LLM calls
 - add attributes to span on completion
stub: false
compiled_at: 2026-04-24T17:04:07.521Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `end[[[[[[[[LLM]]]]]]]]Request[[[[[[[[Span]]]]]]]]` function concludes an [OpenTelemetry](../concepts/open-telemetry.md) tracing Span that was initiated by `startLLMRequestSpan` [Source 1]. It is a core part of the YAAF tracing subsystem, used to instrument the duration and metadata of calls to a `ChatModel.complete()` method.

This function must be called with the `Span` object returned from the corresponding `startLLMRequestSpan` call. This explicit passing of the span object is crucial for correctly tracing multiple [LLM Call](../concepts/llm-call.md)s that may be running in parallel [Source 1].

Like other functions in the YAAF tracing module, `endLLMRequestSpan` is a no-op and incurs zero performance overhead if tracing is not enabled [Source 1].

## Signature

```typescript
export function endLLMRequestSpan(
  span: Span,
  meta?: { /* ... */ }
): void;
```

### Parameters

-   **`span`**: `Span`
    The `Span` object that was returned by the corresponding `startLLMRequestSpan` call. This is a required parameter.

-   **`meta`**: `object` (optional)
    An optional object containing attributes to add to the span just before it is ended. This can be used to record final details about the LLM Call, such as token counts or stop reasons.

## Examples

The most common usage pattern is to wrap an LLM call in a `try...finally` block to ensure the span is always ended, even if the operation fails.

```typescript
import { startLLMRequestSpan, endLLMRequestSpan, Span } from 'yaaf';
import { myChatModel } from './my-app'; // Hypothetical chat model

async function generateSummary(text: string) {
  // 1. Start the span before making the LLM call
  const span: Span = startLLMRequestSpan({
    modelProvider: 'openai',
    modelName: 'gpt-4o',
  });

  try {
    const result = await myChatModel.complete({
      messages: [{ role: 'user', content: `Summarize: ${text}` }],
    });

    // 2. End the span on success, optionally adding final metadata
    endLLMRequestSpan(span, {
      'llm.usage.prompt_tokens': result.usage?.promptTokens,
      'llm.usage.completion_tokens': result.usage?.completionTokens,
    });

    return result.content;
  } catch (error) {
    // Handle the error as needed
    // The 'finally' block will still ensure the span is ended
    throw error;
  } finally {
    // 3. Ensure the span is ended even if an error occurs
    // If endLLMRequestSpan was already called in the try block,
    // calling it again on an ended span is a safe no-op.
    endLLMRequestSpan(span);
  }
}
```

## See Also

-   `startLLMRequestSpan`: The function used to begin the span that `endLLMRequestSpan` concludes.

## Sources

[Source 1]: src/telemetry/tracing.ts