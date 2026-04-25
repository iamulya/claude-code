---
summary: Google Gemini ChatModel + LLMAdapter + Streaming, using the `@google/genai` SDK, supporting Google AI Studio and Vertex AI.
export_name: GeminiChatModel
source_file: src/models/gemini.ts
category: class
title: GeminiChatModel
entity_type: api
search_terms:
 - Google Gemini integration
 - how to use Gemini with YAAF
 - Vertex AI model adapter
 - Google AI Studio adapter
 - genai SDK wrapper
 - streaming Gemini responses
 - tool calling with Gemini
 - Gemini 1.5 Pro
 - BaseLLMAdapter implementation
 - connect to Google LLM
 - Gemini thinking budget
 - YAAF LLM provider
stub: false
compiled_at: 2026-04-24T17:08:05.355Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/gemini.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `GeminiChatModel` class is a concrete implementation of the `Base[[[[[[[[LLM]]]]]]]]Adapter` for integrating Google's Gemini family of models into a YAAF agent [Source 1]. It utilizes the official `@google/genai` SDK, which must be installed as a peer dependency (`npm install @google/genai`) [Source 1].

This class provides a unified interface for two primary ways of accessing Gemini models [Source 1]:
1.  **Google AI Studio**: Authenticated via an `apiKey`.
2.  **Google Cloud Vertex AI**: Authenticated via a Google Cloud `project` and `location`.

As an extension of `BaseLLMAdapter`, `GeminiChatModel` implements the core `complete()` and `stream()` methods, handling the translation between YAAF's standardized message format and the format required by the Gemini API [Source 1].

## Signature / Constructor

The `GeminiChatModel` is instantiated with a configuration object of type `GeminiModelConfig`. The configuration varies depending on whether Google AI Studio or Vertex AI is being used [Source 1].

```typescript
import { GeminiChatModel } from 'yaaf';

// For Google AI Studio
const model = new GeminiChatModel({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-pro-latest',
  temperature: 0.7,
  maxOutputTokens: 8192,
});

// For Vertex AI
const model = new GeminiChatModel({
  vertexAI: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: 'us-central1',
  model: 'gemini-1.5-pro',
});
```

### Configuration (`GeminiModelConfig`)

The configuration object can take one of two forms [Source 1]:

**For Google AI Studio:**

```typescript
export type GeminiModelConfig = {
  apiKey: string;
  vertexAI?: false;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  contextWindowTokens?: number;
  thinkingBudget?: number;
};
```

**For Vertex AI:**

```typescript
export type GeminiModelConfig = {
  vertexAI: true;
  project: string;
  location: string;
  apiKey?: string; // Optional, can use Application Default Credentials
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  contextWindowTokens?: number;
  thinkingBudget?: number;
};
```

**Key Properties:**

*   `apiKey` (`string`): Your API key for Google AI Studio.
*   `vertexAI` (`boolean`): Set to `true` to use Vertex AI.
*   `project` (`string`): Your Google Cloud project ID (required for Vertex AI).
*   `location` (`string`): The Google Cloud region for your Vertex AI endpoint (required for Vertex AI).
*   `model` (`string`, optional): The specific Gemini model to use (e.g., `'gemini-1.5-pro'`).
*   `temperature` (`number`, optional): Controls the randomness of the output.
*   `maxOutputTokens` (`number`, optional): The maximum number of tokens to generate.
*   `contextWindowTokens` (`number`, optional): Overrides the model's default [Context Window](../concepts/context-window.md) size.
*   `thinkingBudget` (`number`, optional): Enables and configures the "thinking" phase for tool-calling models.
    *   `undefined` (default): Disables thinking for SDK compatibility.
    -   `0`: Explicitly disables thinking.
    -   `N > 0`: Allows the model to use up to `N` tokens in a "thinking chain" before responding, which is useful for complex reasoning with [Tools](../subsystems/tools.md) [Source 1].

## Methods & Properties

As an implementation of `BaseLLMAdapter`, `GeminiChatModel` provides the following core methods:

*   `complete()`: Sends a request to the Gemini API and returns the entire response at once.
*   `stream()`: Sends a request and returns an async iterator that yields response chunks as they become available.

These methods handle the necessary message format conversions and API calls to the underlying `@google/genai` SDK [Source 1].

## Examples

### Using with Google AI Studio

This example shows how to instantiate the model using an API key for Google AI Studio [Source 1].

```typescript
import { GeminiChatModel } from 'yaaf';

const model = new GeminiChatModel({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-pro-latest',
});

const response = await model.complete({
  messages: [{ role: 'user', content: 'Hello, world!' }],
});

console.log(response.content);
```

### Using with Vertex AI

This example demonstrates configuration for a Vertex AI endpoint, which typically uses Application Default Credentials for authentication [Source 1].

```typescript
import { GeminiChatModel } from 'yaaf';

const model = new GeminiChatModel({
  vertexAI: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: 'us-central1',
  model: 'gemini-1.5-pro',
});

const response = await model.complete({
  messages: [{ role: 'user', content: 'Tell me about Vertex AI.' }],
});

console.log(response.content);
```

### [Streaming](../concepts/streaming.md) Responses

The `stream()` method provides an asynchronous iterator for handling real-time responses [Source 1].

```typescript
import { GeminiChatModel } from 'yaaf';

const model = new GeminiChatModel({ apiKey: process.env.GEMINI_API_KEY! });
const messages = [{ role: 'user', content: 'Write a short poem about TypeScript.' }];

for await (const delta of model.stream({ messages })) {
  process.stdout.write(delta.content ?? '');
}
// Output will be streamed token by token.
```

### Registering as a Plugin

`GeminiChatModel` can be registered directly with an `AgentHost` instance, making it available to the agent as the primary LLM [Source 1].

```typescript
import { AgentHost, GeminiChatModel } from 'yaaf';

const host = new AgentHost();
await host.register(new GeminiChatModel({ apiKey: '...' }));

// The agent can now access the model via the host
const model = host.getLLMAdapter()!;
const result = await model.complete({
  messages: [{ role: 'user', content: 'Ping' }],
});
```

## See Also

*   `BaseLLMAdapter`: The abstract base class that `GeminiChatModel` extends, defining the standard interface for all [LLM Adapters](../subsystems/llm-adapters.md) in YAAF.

## Sources

[Source 1]: src/models/gemini.ts