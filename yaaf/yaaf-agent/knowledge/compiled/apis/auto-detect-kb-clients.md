---
title: autoDetectKBClients
entity_type: api
summary: Detects environment configuration to instantiate both text and vision LLM clients for the knowledge compiler.
export_name: autoDetectKBClients
source_file: src/knowledge/compiler/llmClient.ts
category: function
stub: false
compiled_at: 2026-04-16T14:25:54.531Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/llmClient.ts
confidence: 1
---

## Overview
`autoDetectKBClients` is a utility function used to initialize the Large Language Model (LLM) interfaces required by the YAAF knowledge compiler. It automatically identifies the available LLM provider (such as OpenAI, Anthropic, or Gemini) by inspecting environment variables or provided options. 

The function returns a pair of client functions: one for standard text processing and one for vision-capable tasks. If no valid API key or provider configuration is detected, the function returns `null`.

## Signature / Constructor

```typescript
export function autoDetectKBClients(options?: LLMClientOptions): {
  llm: LLMCallFn;
  vision: VisionCallFn;
} | null;
```

### Parameters
*   **options** (`LLMClientOptions`, optional): Configuration overrides for the detection logic.
    *   `apiKey`: Explicitly provide an API key instead of detecting it from the environment.
    *   `model`: Explicitly specify the model to use.
    *   `provider`: Force a specific provider (`'gemini' | 'openai' | 'anthropic'`).

### Return Type
Returns an object containing `llm` (an `LLMCallFn`) and `vision` (a `VisionCallFn`), or `null` if detection fails.

## Examples

### Basic Usage
This example demonstrates how to initialize clients using environment variables.

```typescript
import { autoDetectKBClients } from 'yaaf';

const clients = autoDetectKBClients();

if (clients) {
  const { llm, vision } = clients;

  // Standard text call
  const textResult = await llm({
    system: "You are a technical writer.",
    user: "Summarize the architecture of YAAF."
  });

  // Vision-capable call
  const visionResult = await vision({
    system: "Analyze the provided diagram.",
    user: "What are the main components shown?",
    imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    imageMimeType: "image/png"
  });
}
```

### Manual Configuration
This example shows how to bypass environment detection by providing explicit options.

```typescript
import { autoDetectKBClients } from 'yaaf';

const clients = autoDetectKBClients({
  provider: 'anthropic',
  apiKey: 'your-api-key-here',
  model: 'claude-3-opus-20240229'
});
```

## See Also
*   `makeKBLLMClient`: Creates only a text-based LLM client.
*   `makeKBVisionClient`: Creates only a vision-capable LLM client.
*   `LLMCallFn`: The type definition for text-based LLM calls.
*   `VisionCallFn`: The type definition for vision-based LLM calls.