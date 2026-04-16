---
summary: Function signature for the LLM call used by the relevance engine to keep the framework model-agnostic.
export_name: RelevanceQueryFn
source_file: src/memory/relevance.ts
category: type
title: RelevanceQueryFn
entity_type: api
stub: false
compiled_at: 2026-04-16T14:30:02.622Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/relevance.ts
confidence: 1
---

## Overview
`RelevanceQueryFn` is a TypeScript type definition that defines the contract for performing Large Language Model (LLM) calls within the YAAF memory relevance system. 

The framework uses this abstraction to remain provider-agnostic. Instead of hardcoding a specific LLM client, the `MemoryRelevanceEngine` requires an implementation of this function to analyze memory headers and select the most relevant documents for a given user query. This allows developers to use any model (such as Anthropic's Claude Sonnet or OpenAI's GPT-4o) or custom adapter to power the memory selection process.

## Signature / Constructor
```typescript
export type RelevanceQueryFn = (params: {
  system: string
  userMessage: string
  maxTokens: number
  signal?: AbortSignal
}) => Promise<string>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `system` | `string` | The system prompt, typically containing the memory index (`MEMORY.md`) and instructions for selection. |
| `userMessage` | `string` | The user's query or the current context used to determine relevance. |
| `maxTokens` | `number` | The maximum number of tokens the LLM should generate for the selection response. |
| `signal` | `AbortSignal` | (Optional) An abort signal to cancel the request. |

## Examples
The following example demonstrates how to implement a `RelevanceQueryFn` using a hypothetical LLM adapter and pass it to the `MemoryRelevanceEngine`.

```typescript
import { MemoryRelevanceEngine, type RelevanceQueryFn } from 'yaaf';

// Implementation of the relevance query function
const myLlmAdapter: RelevanceQueryFn = async ({ system, userMessage, maxTokens, signal }) => {
  const response = await callLlmProvider({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens,
    abortSignal: signal
  });
  
  return response.text;
};

// Injecting the function into the engine
const engine = new MemoryRelevanceEngine(myLlmAdapter);

const memories = await engine.findRelevant(
  'How do I configure the build system?',
  allHeaders
);
```

## See Also
* `MemoryRelevanceEngine`
* `MemoryHeader`