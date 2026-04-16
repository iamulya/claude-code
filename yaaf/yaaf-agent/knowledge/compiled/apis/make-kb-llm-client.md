---
title: makeKBLLMClient
entity_type: api
summary: Creates a text-based LLM call function with automatic provider detection from environment variables.
export_name: makeKBLLMClient
source_file: src/knowledge/compiler/llmClient.ts
category: function
stub: false
compiled_at: 2026-04-16T14:25:50.978Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/llmClient.ts
confidence: 1
---

## Overview
`makeKBLLMClient` is a factory function that creates a standardized text-based Large Language Model (LLM) client. It is designed to simplify the process of making LLM calls by automatically detecting the provider (OpenAI, Anthropic, or Gemini) and the necessary API keys from the environment.

This client is primarily used within the YAAF knowledge compiler to support Phase C features, such as healing, discovery, and vision-related processing.

## Signature / Constructor

```typescript
export function makeKBLLMClient(options?: LLMClientOptions): LLMCallFn;

export type LLMClientOptions = {
  /** Override API key (auto-detected from env if omitted) */
  apiKey?: string;
  /** Override model (auto-detected from provider if omitted) */
  model?: string;
  /** Override provider (auto-detected from env if omitted) */
  provider?: 'gemini' | 'openai' | 'anthropic';
};

/**
 * A simple text-in/text-out LLM call function.
 */
export type LLMCallFn = (params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}) => Promise<string>;
```

### Parameters
*   `options`: An optional `LLMClientOptions` object used to configure the client. If omitted, the function attempts to resolve configuration from environment variables.

### Return Value
Returns an `LLMCallFn`, which is an asynchronous function that accepts a system prompt and a user prompt and returns the model's text response as a string.

## Examples

### Basic Usage
The following example demonstrates creating a client with default environment-based configuration and executing a simple prompt.

```typescript
import { makeKBLLMClient } from 'yaaf';

const llm = makeKBLLMClient();

const answer = await llm({ 
  system: 'You are a linter.', 
  user: 'Fix this wikilink.' 
});

console.log(answer);
```

### Explicit Configuration
You can override the automatic detection by providing specific options.

```typescript
import { makeKBLLMClient } from 'yaaf';

const llm = makeKBLLMClient({
  provider: 'anthropic',
  model: 'claude-3-opus-20240229',
  apiKey: 'your-api-key-here'
});

const response = await llm({
  system: 'You are a helpful assistant.',
  user: 'Explain the concept of an agent framework.',
  temperature: 0.7
});
```

## See Also
*   `makeKBVisionClient`
*   `autoDetectKBClients`