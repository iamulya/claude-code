---
summary: Options for configuring an LLM client, including API key, model, and provider.
export_name: LLMClientOptions
source_file: src/knowledge/compiler/llmClient.ts
category: type
title: LLMClientOptions
entity_type: api
search_terms:
 - configure LLM client
 - LLM provider selection
 - set API key for LLM
 - choose LLM model
 - Anthropic vs OpenAI vs Gemini
 - LLM client configuration
 - makeKBLLMClient options
 - makeKBVisionClient options
 - autoDetectKBClients options
 - override LLM provider
 - environment variable override
 - LLM client setup
stub: false
compiled_at: 2026-04-24T17:18:12.200Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`[[[[[[[[LLM]]]]]]]]ClientOptions` is a TypeScript type that defines the configuration object for creating [LLM Client](../concepts/llm-client.md)s within the YAAF framework [Source 1]. It is used by factory functions such as `makeKBLLMClient`, `makeKBVisionClient`, and `autoDetectKBClients` to specify or override settings that would otherwise be auto-detected from environment variables [Source 1].

This allows for explicit control over which LLM provider (e.g., OpenAI, Anthropic, Gemini), model, and API key to use for a given client instance, making the configuration more portable and less dependent on the execution environment [Source 1].

## Signature

The `LLMClientOptions` type is an object with the following optional properties:

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
[Source 1]

### Properties

- **`apiKey?: string`**
  - An optional string to explicitly provide the API key for the selected provider. If omitted, the framework attempts to auto-detect the key from environment variables (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) [Source 1].

- **`model?: string`**
  - An optional string to specify the exact model to use (e.g., `"gpt-4o"`, `"claude-3-opus-20240229"`). If omitted, a default model is chosen based on the selected provider [Source 1].

- **`provider?: "gemini" | "openai" | "anthropic"`**
  - An optional literal type to specify which LLM provider to use. If omitted, the framework attempts to auto-detect the provider based on which API keys are available in the environment [Source 1].

## Examples

### Explicitly Configuring a Client

This example demonstrates how to use `LLMClientOptions` to create an LLM Client that is explicitly configured to use a specific OpenAI model.

```typescript
import { makeKBLLMClient, LLMClientOptions } from 'yaaf';

// Define the configuration options
const options: LLMClientOptions = {
  provider: 'openai',
  model: 'gpt-4o',
  // The apiKey will be auto-detected from process.env.OPENAI_API_KEY
};

// Create the client with the specified options
const llm = makeKBLLMClient(options);

async function askQuestion() {
  const answer = await llm({
    system: 'You are an expert on agent frameworks.',
    user: 'What is YAAF?',
  });
  console.log(answer);
}

askQuestion();
```
[Source 1]

## See Also

- `makeKBLLMClient`: A factory function that creates a text-based LLM client using `LLMClientOptions`.
- `makeKBVisionClient`: A factory function that creates a vision-capable LLM client using `LLMClientOptions`.
- `autoDetectKBClients`: A function that attempts to create both text and vision clients based on available environment variables, which can be overridden by `LLMClientOptions`.

## Sources

[Source 1] src/knowledge/compiler/llmClient.ts