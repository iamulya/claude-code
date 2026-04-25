---
summary: Creates a text LLM call function, auto-detecting provider from environment variables.
export_name: makeKBLLMClient
source_file: src/knowledge/compiler/llmClient.ts
category: function
title: makeKBLLMClient
entity_type: api
search_terms:
 - create LLM client
 - text generation function
 - auto-detect LLM provider
 - LLM environment variables
 - OpenAI client factory
 - Anthropic client factory
 - Gemini client factory
 - how to call an LLM
 - simple LLM API
 - knowledge base LLM
 - Phase C features
 - LLMCallFn factory
 - text-in text-out LLM
stub: false
compiled_at: 2026-04-24T17:20:52.612Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `makeKB[[[[[[[[LLM]]]]]]]]Client` function is a factory that creates a simple, text-in/text-out function for making calls to a Large Language Model (LLM) [Source 1]. This returned function, of type `LLMCallFn`, is used internally for knowledge base compilation features such as healing and [Discovery](../concepts/discovery.md) [Source 1].

A key feature of `makeKBLLMClient` is its ability to auto-detect the LLM provider (Gemini, OpenAI, or Anthropic) and the corresponding API key from environment variables. This simplifies setup by removing the need for explicit configuration in many cases. However, developers can provide an `LLMClientOptions` object to override the auto-detected provider, model, or API key [Source 1].

## Signature

The function accepts an optional `options` object and returns a promise-based function of type `LLMCallFn` for interacting with the LLM [Source 1].

```typescript
export function makeKBLLMClient(options?: LLMClientOptions): LLMCallFn;
```

### Parameters

- **`options`** `LLMClientOptions` (optional)
  An object to override the default auto-detection behavior.

  ```typescript
  export type LLMClientOptions = {
    /** Override API key (auto-detected from env if omitted) */
    apiKey?: string;
    /** Override model (auto-detected from provider if omitted) */
    model?: string;
    /** Override provider (auto-detected from env if omitted) */
    provider?: "gemini" | "openai" | "anthropic";
  };
  ```

### Return Value

- **`LLMCallFn`**
  An asynchronous function that takes a [System Prompt](../concepts/system-prompt.md), a user prompt, and optional parameters, returning the LLM's text response as a string.

  ```typescript
  export type LLMCallFn = (params: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<string>;
  ```

## Examples

### Basic Usage with Auto-Detection

This example demonstrates creating and using an [LLM Client](../concepts/llm-client.md) by relying on environment variables for configuration [Source 1].

```typescript
import { makeKBLLMClient } from 'yaaf';

// Assumes relevant environment variables like OPENAI_API_KEY are set.
const llm = makeKBLLMClient();

async function lintLink() {
  const answer = await llm({
    system: 'You are a technical writer. Your task is to fix broken wikilinks.',
    user: 'Please correct the following text: some text'
  });
  console.log(answer);
}

lintLink();
```

### Overriding the Provider and Model

This example shows how to explicitly configure the client to use a specific provider and model, ignoring any environment variables [Source 1].

```typescript
import { makeKBLLMClient } from 'yaaf';

const llm = makeKBLLMClient({
  provider: 'anthropic',
  model: 'claude-3-haiku-20240307',
  apiKey: 'sk-ant-...' // Explicitly provide the API key
});

async function summarize() {
  const summary = await llm({
    system: 'You are a summarization expert.',
    user: 'Summarize the main points of the YAAF framework.'
  });
  console.log(summary);
}

summarize();
```

## See Also

- `makeKBVisionClient`: A similar factory for creating a vision-capable LLM client.
- `autoDetectKBClients`: A utility to create both text and vision clients simultaneously.
- `LLMCallFn`: The type definition for the returned text-only [LLM Call](../concepts/llm-call.md) function.
- `LLMClientOptions`: The type definition for the configuration object.

## Sources

[Source 1]: src/knowledge/compiler/llmClient.ts