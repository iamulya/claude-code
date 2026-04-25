---
title: RelevanceQueryFn
entity_type: api
summary: A type definition for a function that queries a large language model to determine memory relevance.
export_name: RelevanceQueryFn
source_file: src/memory/relevance.ts
category: type
search_terms:
 - memory relevance function
 - LLM adapter for memory
 - how to select relevant memories
 - model-agnostic memory query
 - inject LLM into relevance engine
 - custom LLM for memory selection
 - MemoryRelevanceEngine query function
 - asynchronous LLM call signature
 - relevance engine dependency injection
 - findRelevant memories implementation
 - user query memory filtering
 - pluggable LLM provider
stub: false
compiled_at: 2026-04-24T17:32:07.906Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`RelevanceQueryFn` is a TypeScript type alias that defines the function signature for querying a large language model ([LLM](../concepts/llm.md)) within the [Memory](../concepts/memory.md) relevance system [Source 1].

This function type is a key component of YAAF's provider-agnostic architecture. Instead of being tied to a specific LLM provider, the `MemoryRelevanceEngine` accepts a function of this type during its construction. The consumer of the framework is responsible for implementing this function, which acts as an adapter to their chosen LLM service. This allows the framework to remain flexible and decoupled from any single model provider [Source 1].

The `MemoryRelevanceEngine` invokes this function to ask an LLM to identify which memories from the memory store are most relevant to a given user query [Source 1].

## Signature

The `RelevanceQueryFn` is a function type that takes a single parameter object and returns a promise resolving to a string [Source 1].

```typescript
export type RelevanceQueryFn = (params: {
  system: string;
  userMessage: string;
  maxTokens: number;
  signal?: AbortSignal;
}) => Promise<string>;
```

### Parameters

The function receives a single object with the following properties:

-   `system: string`: The [System Prompt](../concepts/system-prompt.md) to be sent to the LLM.
-   `userMessage: string`: The user-facing message for the LLM, which typically includes the user's query and a list of available memories.
-   `maxTokens: number`: The maximum number of tokens the LLM should generate in its response.
-   `signal?: AbortSignal`: An optional `AbortSignal` to allow for cancellation of the asynchronous [LLM Call](../concepts/llm-call.md).

### Return Value

-   `Promise<string>`: A promise that resolves with the raw string response from the LLM.

## Examples

The most common use case is to provide an inline implementation of `RelevanceQueryFn` [when](./when.md) instantiating a `MemoryRelevanceEngine`. This example shows how to wrap a call to a hypothetical `callSonnet` function to match the required signature [Source 1].

```typescript
import { MemoryRelevanceEngine, RelevanceQueryFn } from 'yaaf';
// Assume callSonnet is an external function that communicates with an LLM API.
import { callSonnet } from './my-llm-provider.js';

// Implement the RelevanceQueryFn to adapt your LLM call.
const myRelevanceQueryFn: RelevanceQueryFn = async ({ system, userMessage, maxTokens }) => {
  const response = await callSonnet({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens,
  });
  return response.text;
};

// Pass the function to the MemoryRelevanceEngine constructor.
const engine = new MemoryRelevanceEngine(myRelevanceQueryFn);

// The engine will now use your custom function for relevance checks.
// const memories = await engine.findRelevant(
//   'How do I configure the build system?',
//   allMemoryHeaders,
// );
```

## See Also

-   `MemoryRelevanceEngine`: The class that consumes a `RelevanceQueryFn` to perform [Memory Relevance](../concepts/memory-relevance.md) checks.

## Sources

[Source 1]: src/memory/relevance.ts