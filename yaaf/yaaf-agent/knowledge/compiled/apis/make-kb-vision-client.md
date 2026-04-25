---
summary: Creates a vision-capable LLM call function, auto-detecting provider from environment variables, with fallback to text-only.
export_name: makeKBVisionClient
source_file: src/knowledge/compiler/llmClient.ts
category: function
title: makeKBVisionClient
entity_type: api
search_terms:
 - vision LLM client
 - create multimodal agent
 - image processing with LLM
 - how to use vision models
 - Gemini vision API
 - OpenAI vision API
 - Anthropic vision API
 - LLM with image input
 - multimodal call function
 - auto-detect LLM provider
 - YAAF vision client
 - text-only fallback for vision
 - LLMClientOptions
stub: false
compiled_at: 2026-04-24T17:20:48.531Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `makeKBVisionClient` function is a factory that creates and returns a vision-capable [LLM](../concepts/llm.md) (Large Language Model) call function. This returned function, of type `VisionCallFn`, can process both text and image inputs in a single request [Source 1].

This factory is designed for convenience and production use. It automatically detects the LLM provider (e.g., Gemini, OpenAI, Anthropic) and corresponding API key from environment variables. Users can also explicitly override these settings via an options object [Source 1].

A key feature is its graceful degradation: if the auto-detected or specified provider does not natively support vision capabilities, `makeKBVisionClient` falls back to creating a text-only client. This ensures that an application can still function, albeit without image processing, if the environment is not configured for a multimodal model [Source 1].

## Signature

The `makeKBVisionClient` function accepts an optional `LLMClientOptions` object to override the default auto-detection behavior. It returns a `VisionCallFn` [Source 1].

```typescript
export function makeKBVisionClient(options?: LLMClientOptions): VisionCallFn;
```

### Parameters

The function accepts a single optional `options` object of type `LLMClientOptions`:

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

The function returns an asynchronous function of type `VisionCallFn`:

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

- **`system`**: The [System Prompt](../concepts/system-prompt.md) to guide the model's behavior.
- **`user`**: The user's text prompt.
- **`imageBase64`**: A base64-encoded string representing the image.
- **`imageMimeType`**: The MIME type of the image (e.g., `image/png`, `image/jpeg`).
- **`temperature`** (optional): The sampling temperature for the model's response.
- **`maxTokens`** (optional): The maximum number of tokens to generate.

The returned function resolves to a `Promise<string>` containing the model's text response [Source 1].

## Examples

The following example demonstrates creating a vision client and using it to analyze a local image file. This assumes an environment variable for a supported vision provider (e.g., `OPENAI_API_KEY`) is set.

```typescript
import { makeKBVisionClient } from 'yaaf';
import * as fs from 'fs';
import * as path from 'path';

// Create the vision client. It will auto-detect the provider
// and API key from environment variables.
const visionClient = makeKBVisionClient();

// Read an image file and encode it in base64
const imagePath = path.join(__dirname, 'my-image.png');
const imageAsBase64 = fs.readFileSync(imagePath).toString('base64');

async function describeImage() {
  try {
    const description = await visionClient({
      system: 'You are an expert image analyst. Describe the image in one sentence.',
      user: 'What is in this image?',
      imageBase64: imageAsBase64,
      imageMimeType: 'image/png',
      maxTokens: 100,
    });

    console.log('Model Description:', description);
  } catch (error) {
    console.error('Failed to analyze image:', error);
  }
}

describeImage();
```

## See Also

- `makeKBLLMClient`: A related factory for creating a text-only [LLM Client](../concepts/llm-client.md).
- `autoDetectKBClients`: A function to auto-detect and create both text and vision clients simultaneously.
- `VisionCallFn`: The type definition for the function returned by `makeKBVisionClient`.
- `LLMClientOptions`: The configuration options type for the client factories.

## Sources

[Source 1] `src/knowledge/compiler/llmClient.ts`