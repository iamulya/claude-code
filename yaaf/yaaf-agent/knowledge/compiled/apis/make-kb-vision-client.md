---
title: makeKBVisionClient
entity_type: api
summary: Creates a vision-capable LLM call function, falling back to text-only if the provider lacks native vision support.
export_name: makeKBVisionClient
source_file: src/knowledge/compiler/llmClient.ts
category: function
stub: false
compiled_at: 2026-04-16T14:25:52.072Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/llmClient.ts
confidence: 1
---

## Overview
`makeKBVisionClient` is a factory function used to create a vision-capable LLM client. It is designed for use in Phase C features of the YAAF knowledge compiler, such as vision-based discovery and healing. The function automatically detects the appropriate provider (Gemini, OpenAI, or Anthropic) from environment variables if not explicitly provided. If a selected provider does not natively support vision capabilities, the function is designed to fall back to a text-only client implementation.

## Signature / Constructor

```typescript
export function makeKBVisionClient(options?: LLMClientOptions): VisionCallFn
```

### Parameters
*   **options** (`LLMClientOptions`): Configuration for the LLM client.
    *   `apiKey` (string, optional): The API key for the provider. Auto-detected from environment variables if omitted.
    *   `model` (string, optional): The specific model to use. Auto-detected from the provider if omitted.
    *   `provider` ('gemini' | 'openai' | 'anthropic', optional): The LLM provider. Auto-detected from environment variables if omitted.

### Return Type
The function returns a `VisionCallFn`, which has the following signature:

```typescript
type VisionCallFn = (params: {
  system: string
  user: string
  imageBase64: string
  imageMimeType: string
  temperature?: number
  maxTokens?: number
}) => Promise<string>
```

## Examples

### Basic Usage with Auto-Detection
This example demonstrates creating a vision client using environment variables for configuration.

```typescript
import { makeKBVisionClient } from 'yaaf';

const vision = makeKBVisionClient();

const result = await vision({
  system: "You are a helpful assistant that describes images.",
  user: "What is depicted in this diagram?",
  imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  imageMimeType: "image/png"
});

console.log(result);
```

### Explicit Provider Configuration
This example demonstrates forcing a specific provider and model.

```typescript
import { makeKBVisionClient } from 'yaaf';

const vision = makeKBVisionClient({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.CUSTOM_OPENAI_KEY
});

const analysis = await vision({
  system: "Analyze the UI components in this screenshot.",
  user: "List all buttons found.",
  imageBase64: "...",
  imageMimeType: "image/jpeg",
  temperature: 0.2
});
```

## See Also
* `makeKBLLMClient`
* `autoDetectKBClients`