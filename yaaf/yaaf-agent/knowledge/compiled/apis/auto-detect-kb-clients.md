---
summary: Automatically detects and creates both text and vision LLM clients, returning null if no API key is found.
export_name: autoDetectKBClients
source_file: src/knowledge/compiler/llmClient.ts
category: function
title: autoDetectKBClients
entity_type: api
search_terms:
 - create LLM client
 - auto detect LLM provider
 - initialize text and vision models
 - LLM client factory
 - knowledge base LLM
 - how to create a vision client
 - how to create a text client
 - YAAF LLM setup
 - find API key for LLM
 - gemini openai anthropic client
 - LLMClientOptions
 - instantiate LLM
 - vision and text functions
stub: false
compiled_at: 2026-04-24T16:51:58.022Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `autoDetectKBClients` function is a convenience factory used to instantiate both a text-only and a vision-capable [LLM](../concepts/llm.md) client simultaneously. It automatically detects the LLM provider (OpenAI, Anthropic, or Gemini) and the corresponding API key from environment variables.

This function is particularly useful for bootstrapping an application that requires both text and image processing capabilities, as it simplifies the setup process into a single call. If no supported API key is found in the environment, the function returns `null`, allowing for graceful error handling.

The returned clients are simple, asynchronous functions conforming to the `LLMCallFn` and `VisionCallFn` types, which are used for knowledge base compilation features like healing and [Discovery](../concepts/discovery.md).

## Signature

```typescript
export function autoDetectKBClients(
  options?: LLMClientOptions
): { llm: LLMCallFn; vision: VisionCallFn } | null;
```

### Parameters

- **`options`** `LLMClientOptions` (optional): An object to override the auto-detected configuration.

### Configuration (`LLMClientOptions`)

The `LLMClientOptions` type allows for manual configuration, bypassing environment variable detection:

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

The function returns an object containing `llm` and `vision` functions, or `null` if no API key can be found.

- **`llm`** `LLMCallFn`: A function for making text-only LLM calls.
  ```typescript
  export type LLMCallFn = (params: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<string>;
  ```

- **`vision`** `VisionCallFn`: A function for making vision-capable LLM calls.
  ```typescript
  export type VisionCallFn = (params: {
    system: string;
    user: string;
    imageBase64: string;
    imageMimeType: string;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<string>;
  ```

## Examples

### Basic Usage

This example shows how to call `autoDetectKBClients` and handle the case where no clients can be created.

```typescript
import { autoDetectKBClients } from 'yaaf';

async function initializeAndUseClients() {
  // Attempt to create clients by detecting provider from environment variables
  const clients = autoDetectKBClients();

  if (!clients) {
    console.error(
      "Could not detect LLM provider. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY."
    );
    return;
  }

  const { llm, vision } = clients;

  // Use the text client
  const textResponse = await llm({
    system: 'You are a helpful assistant.',
    user: 'What is YAAF?',
  });
  console.log('Text response:', textResponse);

  // Use the vision client (requires a base64 encoded image)
  // const visionResponse = await vision({
  //   system: 'Describe the contents of this image.',
  //   user: 'What is the main subject?',
  //   imageBase64: '...', // your base64 encoded image data
  //   imageMimeType: 'image/png',
  // });
  // console.log('Vision response:', visionResponse);
}

initializeAndUseClients();
```

### Overriding the Provider

This example demonstrates how to force the use of a specific provider and API key, ignoring environment variables.

```typescript
import { autoDetectKBClients } from 'yaaf';

async function initializeWithOverrides() {
  const clients = autoDetectKBClients({
    provider: 'openai',
    apiKey: 'sk-my-custom-openai-key',
    model: 'gpt-4o',
  });

  if (clients) {
    const response = await clients.llm({
      system: 'You are an expert on AI frameworks.',
      user: 'Explain the purpose of YAAF.',
    });
    console.log(response);
  } else {
    // This block would not be reached if apiKey is provided
    console.log('Client creation failed.');
  }
}

initializeWithOverrides();
```

## See Also

- `makeKBLLMClient`: A factory function to create only a text-based [LLM Client](../concepts/llm-client.md).
- `makeKBVisionClient`: A factory function to create only a vision-capable LLM Client.
- `LLMClientOptions`: The configuration type for specifying provider, model, and API key.
- `LLMCallFn`: The type definition for the returned text client.
- `VisionCallFn`: The type definition for the returned vision client.

## Sources

- [Source 1]: `src/knowledge/compiler/llmClient.ts`