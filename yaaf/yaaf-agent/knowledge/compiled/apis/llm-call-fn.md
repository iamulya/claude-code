---
title: LLMCallFn
entity_type: api
summary: Type definition for a standard text-in/text-out LLM call function used in knowledge compilation.
export_name: LLMCallFn
source_file: src/knowledge/compiler/llmClient.ts
category: type
stub: false
compiled_at: 2026-04-16T14:25:59.788Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/llmClient.ts
confidence: 0.9
---

## Overview
`LLMCallFn` is a TypeScript type definition representing a standardized interface for text-based Large Language Model (LLM) interactions within the YAAF knowledge subsystem. It defines a simple text-in/text-out contract used primarily during knowledge compilation for "Phase C" features, which include healing, discovery, and vision-related processing.

This type allows the knowledge compiler to remain provider-agnostic by interacting with a consistent function signature regardless of whether the underlying model is provided by OpenAI, Anthropic, or Google Gemini.

## Signature
```typescript
export type LLMCallFn = (params: {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}) => Promise<string>
```

### Parameters
*   `system`: A string containing the system instructions or persona for the LLM.
*   `user`: A string containing the specific user prompt or data to be processed.
*   `temperature` (optional): A number controlling the randomness of the model's output.
*   `maxTokens` (optional): An integer specifying the maximum number of tokens the model should generate.

## Examples
The following example demonstrates how an `LLMCallFn` is typically instantiated using the `makeKBLLMClient` factory and then invoked.

```typescript
import { makeKBLLMClient, LLMCallFn } from 'yaaf/knowledge';

// Create a client that adheres to the LLMCallFn signature
const llm: LLMCallFn = makeKBLLMClient();

// Use the function to process a request
const answer = await llm({ 
  system: 'You are a linter.', 
  user: 'Fix this wikilink.' 
});
```

## See Also
* `VisionCallFn`
* `makeKBLLMClient`
* `autoDetectKBClients`