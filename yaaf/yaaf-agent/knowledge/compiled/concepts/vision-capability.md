---
summary: The ability of an LLM to process and understand image inputs, often alongside text prompts.
title: Vision Capability
entity_type: concept
see_also:
 - concept:LLM
 - concept:Phase C features
 - api:VisionCallFn
 - api:makeKBVisionClient
 - api:autoDetectKBClients
search_terms:
 - multimodal LLM
 - image processing in agents
 - how to use images with YAAF
 - vision-enabled models
 - LLM image input
 - base64 image prompt
 - YAAF vision support
 - image understanding
 - visual reasoning
 - process images with LLM
 - makeKBVisionClient usage
 - VisionCallFn type
stub: false
compiled_at: 2026-04-25T00:26:10.523Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Vision Capability in YAAF refers to the ability of a Large Language Model ([LLM](./llm.md)) to accept and interpret image data as part of its input, in addition to standard text prompts. This allows agents to perform tasks that require understanding visual information, such as analyzing diagrams, reading text from screenshots, or describing scenes. This multimodal functionality is used for certain advanced framework features, such as those designated as [Phase C features](./phase-c-features.md) [Source 1].

## How It Works in YAAF

The core abstraction for this capability is the `[[VisionCallFn]]` type. This function signature defines the interface for making a call to a vision-enabled [LLM](./llm.md). It accepts a parameter object containing the text prompt (both `system` and `user` parts), the image data as a Base64-encoded string (`imageBase64`), and the image's MIME type (`imageMimeType`) [Source 1].

Developers can create a concrete implementation of this function using the `[[makeKBVisionClient]]` factory. This function automatically detects the configured [LLM](./llm.md) provider from environment variables and instantiates a corresponding client. According to the source documentation, if the detected provider does not natively support vision, `[[makeKBVisionClient]]` will fall back to a text-only client [Source 1].

The `[[autoDetectKBClients]]` utility function provides a convenient way to create both text and vision clients at once [Source 1].

The `[[VisionCallFn]]` type is defined as follows [Source 1]:

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

## Configuration

While the provider and model are typically auto-detected from environment variables, they can be explicitly overridden by passing an `LLMClientOptions` object to the `[[makeKBVisionClient]]` function. This allows for fine-grained control over which provider, model, or API key is used for the vision call [Source 1].

```typescript
import { makeKBVisionClient } from 'yaaf';
import * as fs from 'fs/promises';

// Define explicit options
const options = {
  provider: 'anthropic',
  model: 'claude-3-opus-20240229',
  apiKey: process.env.ANTHROPIC_API_KEY,
};

// Create a vision-capable client with specific options
const visionLLM = makeKBVisionClient(options);

// Example usage
async function analyzeImage(imagePath: string) {
  const imageData = await fs.readFile(imagePath);
  const imageBase64 = imageData.toString('base64');

  const response = await visionLLM({
    system: 'You are an expert image analyst.',
    user: 'What is depicted in this image?',
    imageBase64: imageBase64,
    imageMimeType: 'image/png',
  });

  console.log(response);
}
```

## See Also

- [LLM](./llm.md)
- [Phase C features](./phase-c-features.md)
- [VisionCallFn](../apis/vision-call-fn.md)
- [makeKBVisionClient](../apis/make-kb-vision-client.md)
- [autoDetectKBClients](../apis/auto-detect-kb-clients.md)

## Sources

[Source 1] Source: src/knowledge/compiler/llmClient.ts