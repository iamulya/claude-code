---
title: GenerateFn
entity_type: api
summary: The `GenerateFn` type defines a simple asynchronous function signature for calling an LLM, decoupled from specific YAAF model implementations for testability.
export_name: GenerateFn
source_file: src/knowledge/compiler/extractor/extractor.ts
category: type
search_terms:
 - LLM function signature
 - model abstraction
 - decouple LLM calls
 - testable LLM function
 - how to mock model calls
 - generic model interface
 - system and user prompt function
 - asynchronous LLM wrapper
 - create GenerateFn from BaseLLMAdapter
 - ConceptExtractor model input
 - YAAF model adapter
 - makeGenerateFn helper
stub: false
compiled_at: 2026-04-24T17:08:20.802Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/extractor.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `GenerateFn` type defines a simple, asynchronous function signature for making a call to a Large Language Model ([LLM](../concepts/llm.md)). It accepts a [System Prompt](../concepts/system-prompt.md) and a user prompt, and returns a `Promise` that resolves to the LLM's string response [Source 1].

The primary purpose of `GenerateFn` is to decouple components that need to call an LLM, such as the `ConceptExtractor`, from any specific model implementation (e.g., `GeminiChatModel`, `OpenAIChatModel`). This abstraction makes the components more modular and significantly easier to test, as the `GenerateFn` can be replaced with a mock function during unit tests without needing a live model connection [Source 1].

## Signature

```typescript
export type GenerateFn = (
  systemPrompt: string, 
  userPrompt: string
) => Promise<string>;
```

**Parameters:**

*   `systemPrompt` (`string`): The system prompt or instructions for the LLM.
*   `userPrompt` (`string`): The user-provided prompt or content for the LLM to process.

**Returns:**

*   `Promise<string>`: A promise that resolves to the text content of the LLM's response.

## Examples

A `GenerateFn` can be created from any YAAF-compatible model adapter that conforms to the `BaseLLMAdapter` interface. The following example demonstrates how to wrap a `GeminiChatModel` instance to create a `GenerateFn` [Source 1].

```typescript
import { GeminiChatModel } from 'yaaf/models/gemini';
import type { GenerateFn } from 'yaaf';

// 1. Instantiate a concrete model adapter
const model = new GeminiChatModel({ 
  model: 'gemini-1.5-flash', 
  apiKey: process.env.GEMINI_API_KEY 
});

// 2. Create a function that matches the GenerateFn signature
const generateFn: GenerateFn = async (system, user) => {
  const result = await model.complete({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.1,
    maxTokens: 2048,
  });
  
  // Return the string content, or an empty string if null/undefined
  return result.content ?? '';
};

// 3. The generateFn can now be passed to components that require it
// For example, the ConceptExtractor:
// const extractor = new ConceptExtractor(ontology, registry, generateFn);
```

## See Also

*   **ConceptExtractor**: A class within the knowledge compilation pipeline that uses a `GenerateFn` to perform LLM-based classification and analysis of source content.
*   **[makeGenerateFn](./make-generate-fn.md)**: A convenience helper function provided by YAAF to create a `GenerateFn` from any YAAF-compatible model adapter.

## Sources

[Source 1] src/knowledge/compiler/extractor/extractor.ts
[Source 2] src/knowledge/compiler/extractor/index.ts