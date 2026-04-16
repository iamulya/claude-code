---
title: OpenAIChatModel
entity_type: api
summary: An OpenAI-compatible LLM adapter supporting chat completions, streaming, and tool calling across various providers.
export_name: OpenAIChatModel
source_file: src/models/openai.ts
category: class
stub: false
compiled_at: 2026-04-16T14:31:08.666Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/openai.ts
confidence: 1
---

## Overview
`OpenAIChatModel` is a provider-agnostic adapter designed to interface with any Large Language Model (LLM) provider that exposes an OpenAI-compatible chat completions API. This includes OpenAI's own services, as well as alternative providers such as Groq, Together AI, Fireworks, Perplexity, and local runtimes like Ollama or vLLM.

The class extends `BaseLLMAdapter` and provides implementations for standard chat completion and streaming. It uses the native environment `fetch` API, requiring no external SDK dependencies.

## Signature / Constructor

### Constructor
```typescript
constructor(config: OpenAIModelConfig)
```

### OpenAIModelConfig
The configuration object for initializing the model:

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | The API key for the provider. Use 'ollama' or 'local' for local providers. |
| `baseUrl` | `string` | The base URL for the API. Defaults to `https://api.openai.com/v1`. |
| `model` | `string` | The specific model identifier. Defaults to `gpt-4o-mini`. |
| `timeoutMs` | `number` | Request timeout in milliseconds. Defaults to `60_000`. |
| `headers` | `Record<string, string>` | Optional extra headers to include in every request. |
| `contextWindowTokens` | `number` | The total context window size. Defaults to `128_000`. |
| `maxOutputTokens` | `number` | Maximum tokens allowed in the response. Defaults to `4_096`. |
| `systemRole` | `'system' \| 'developer'` | The role name for system messages. Defaults to `'system'`, or `'developer'` for o-series models. |
| `parallelToolCalls` | `boolean` | Whether to allow multiple tool calls in one turn. Defaults to `true`. |
| `reasoningEffort` | `'low' \| 'medium' \| 'high'` | Reasoning effort for o-series models (o1, o3, o4). |

## Methods & Properties

### Public Methods
*   **complete()**: Performs a standard chat completion request.
*   **stream()**: Returns an async iterable for streaming chat completion deltas.
*   **query()**: (Inherited) High-level method for simple text prompts.
*   **summarize()**: (Inherited) Utility for condensing text content.
*   **estimateTokens()**: (Inherited) Provides a heuristic or provider-specific token count estimation.
*   **healthCheck()**: (Inherited) Verifies connectivity and API key validity with the provider.

## Examples

### Basic Usage
```typescript
import { OpenAIChatModel } from 'yaaf';

const model = new OpenAIChatModel({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

const response = await model.complete({
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### Streaming Completions
```typescript
const model = new OpenAIChatModel({ apiKey: process.env.OPENAI_API_KEY! });

for await (const delta of model.stream({ messages })) {
  process.stdout.write(delta.content ?? '');
}
```

### Using Alternative Providers
The adapter can be configured for any OpenAI-compatible endpoint, such as Groq or a local Ollama instance.

```typescript
// Groq Configuration
const groq = new OpenAIChatModel({
  apiKey: process.env.GROQ_API_KEY!,
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'llama-3.3-70b-versatile',
});

// Local Ollama Configuration
const ollama = new OpenAIChatModel({
  apiKey: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3.1',
});
```

## See Also
*   `BaseLLMAdapter` (Base class providing shared LLM logic)