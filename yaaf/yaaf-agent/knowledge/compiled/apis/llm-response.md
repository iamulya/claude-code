---
summary: Type definition for the response structure returned by LLM query methods.
export_name: LLMResponse
source_file: src/plugin/types.js
category: type
title: LLMResponse
entity_type: api
search_terms:
 - LLM output type
 - model response structure
 - LLM adapter return value
 - what does query return
 - language model result format
 - YAAF model response
 - LLM query result
 - type for LLM completion
 - LLMAdapter response
 - BaseLLMAdapter output
 - model completion object
 - query result type
stub: false
compiled_at: 2026-04-24T17:18:41.164Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `[[[[[[[[LLM]]]]]]]]Response` type defines the standardized structure for the object returned by methods on an `LLMAdapter` that interact with a large language model. It serves as the return type for core methods such as `query()` and `complete()` within the framework's model adapters [Source 1].

By providing a consistent response shape, `LLMResponse` ensures that different LLM provider implementations can be used interchangeably within the YAAF ecosystem. Any component that consumes the output of an LLM can rely on this type for predictable access to the model's generated content, usage statistics, and other metadata.

## Signature

The specific fields of the `LLMResponse` type are defined in `src/plugin/types.js`. The provided source material references this type but does not include its detailed definition [Source 1]. It is used as the return type for asynchronous model operations.

```typescript
// The LLMResponse type is used as the return value for LLMAdapter methods.
// For example, a simplified adapter method signature would look like this:

interface LLMAdapter {
  query(params: LLMQueryParams): Promise<LLMResponse>;
  // ... other methods
}
```

## Examples

The following example demonstrates how the `LLMResponse` type is used [when](./when.md) interacting with an LLM adapter instance.

```typescript
import { type LLMAdapter, type LLMResponse, type LLMMessage } from 'yaaf';

// Assume 'myLLMAdapter' is an initialized instance of a class
// that implements the LLMAdapter interface.
declare const myLLMAdapter: LLMAdapter;

async function fetchGreeting(): Promise<void> {
  const messages: LLMMessage[] = [
    { role: 'user', content: 'Write a one-sentence greeting.' }
  ];

  try {
    // The 'query' method returns a Promise that resolves to an LLMResponse object.
    const response: LLMResponse = await myLLMAdapter.query({ messages });

    // The structure of the 'response' object is defined by the LLMResponse type.
    // While the exact fields are not in the source, one would typically access
    // the generated content and token usage like this:
    // console.log('Content:', response.choices[0].message.content);
    // console.log('Total Tokens:', response.usage.total_tokens);

  } catch (error) {
    console.error("Failed to query the LLM:", error);
  }
}
```

## Sources

[Source 1]: src/models/base.ts