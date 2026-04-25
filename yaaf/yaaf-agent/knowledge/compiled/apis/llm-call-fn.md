---
summary: A simple text-in/text-out LLM call function.
export_name: LLMCallFn
source_file: src/knowledge/compiler/llmClient.ts
category: type
title: LLMCallFn
entity_type: api
search_terms:
 - LLM function type
 - text generation function
 - call large language model
 - LLM client signature
 - system prompt user prompt
 - text-in text-out LLM
 - Phase C features
 - heal function LLM
 - discovery function LLM
 - language model invocation
 - makeKBLLMClient return type
 - asynchronous llm call
stub: false
compiled_at: 2026-04-24T17:18:02.914Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`[[[[[[[[LLM]]]]]]]]CallFn` is a TypeScript type alias that defines the signature for a standardized, asynchronous function that performs a text-based call to a Large Language Model (LLM). It represents a simple text-in, text-out interface, abstracting away the specifics of the underlying LLM provider [Source 1].

This function type is used for all "Phase C" features within the YAAF [Knowledge Compiler](../subsystems/knowledge-compiler.md), which include functionalities like healing, [Discovery](../concepts/discovery.md), and vision-related text processing [Source 1]. Functions that conform to this type, such as the one returned by `makeKBLLMClient`, serve as the primary mechanism for interacting with LLMs for these tasks.

## Signature

`LLMCallFn` is an asynchronous function type that accepts a single parameters object and returns a `Promise<string>`.

```typescript
export type LLMCallFn = (params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}) => Promise<string>;
```

### Parameters

The function receives a single object with the following properties:

- **`system`**: `string`
  - The [System Prompt](../concepts/system-prompt.md), which provides high-level instructions or context to the LLM for the conversation.

- **`user`**: `string`
  - The user prompt, which contains the specific query or input for the LLM to process.

- **`temperature`**: `number` (optional)
  - A parameter to control the randomness of the LLM's output. Higher values result in more creative responses, while lower values produce more deterministic output.

- **`maxTokens`**: `number` (optional)
  - The maximum number of tokens (words or parts of words) that the LLM should generate in its response.

### Return Value

- **`Promise<string>`**
  - A promise that resolves to a string containing the text-based response from the LLM.

## Examples

The most common way to obtain a function of this type is by using the `makeKBLLMClient` factory. The returned function can then be used to make calls to the configured LLM.

```typescript
import { makeKBLLMClient, LLMCallFn } from 'yaaf';

// The makeKBLLMClient function returns a concrete implementation of LLMCallFn.
const llm: LLMCallFn = makeKBLLMClient({
  provider: 'openai',
});

async function getGreeting(language: string): Promise<string> {
  const response = await llm({
    system: `You are a helpful translator. You only respond with the translated text.`,
    user: `Translate "Hello, world!" into ${language}.`,
    temperature: 0.2,
  });
  return response;
}

const greetingInFrench = await getGreeting('French');
console.log(greetingInFrench); // Expected output: "Bonjour, le monde !"
```

## See Also

- `makeKBLLMClient`: A factory function that creates an `LLMCallFn`.
- `VisionCallFn`: A similar function type for vision-capable LLMs.

## Sources

[Source 1]: src/knowledge/compiler/llmClient.ts