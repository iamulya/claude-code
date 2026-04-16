---
capabilities:
  - llm
summary: A YAAF plugin providing Google Gemini LLM capabilities through the GeminiChatModel class.
title: Gemini Plugin
entity_type: plugin
built_in: true
stub: false
compiled_at: 2026-04-16T14:31:04.296Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/gemini.ts
confidence: 0.9
---

## Overview
The Gemini Plugin enables integration with Google's Gemini large language models within the YAAF framework. It provides the `GeminiChatModel` class, which implements the `LLMAdapter` capability. This allows agents to perform text generation and streaming using both Google AI Studio and Google Cloud Vertex AI backends.

## Installation
The plugin requires the official Google Generative AI SDK as a peer dependency. This must be installed separately in the host project.

```bash
npm install @google/genai
```

**Peer Dependency Requirement:** `@google/genai` >= 0.7.0

## Configuration
The `GeminiChatModel` is initialized with a configuration object that determines the authentication method and model parameters. It supports two primary modes: Google AI Studio (via API key) and Vertex AI (via Google Cloud project credentials).

### Configuration Types
The configuration supports the following parameters:
- `model`: The specific Gemini model identifier (e.g., 'gemini-1.5-pro').
- `temperature`: Controls the randomness of the output.
- `maxOutputTokens`: The maximum number of tokens to generate.
- `contextWindowTokens`: The maximum context window size.

### Example: Google AI Studio
```typescript
import { GeminiChatModel } from 'yaaf/models/gemini';

const model = new GeminiChatModel({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-pro',
  temperature: 0.7
});

// Registration with a YAAF host
await host.register(model);
```

### Example: Vertex AI
```typescript
import { GeminiChatModel } from 'yaaf/models/gemini';

const model = new GeminiChatModel({
  vertexAI: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: 'us-central1',
  model: 'gemini-1.5-pro',
});
```

## Capabilities
The Gemini Plugin implements the following framework capabilities:

### LLM Adapter
The plugin extends `BaseLLMAdapter`, providing a standardized interface for the framework to interact with Gemini models. It handles the translation layer between YAAF's internal message formats and the requirements of the `@google/genai` SDK.

### Completion and Streaming
- **complete()**: Supports standard unary requests for text generation.
- **stream()**: Supports real-time token streaming. This allows developers to process model output as it is generated.

```typescript
const model = new GeminiChatModel({ apiKey: '...' });

for await (const delta of model.stream({ messages })) {
  process.stdout.write(delta.content ?? '');
}
```

## Sources
- `src/models/gemini.ts`