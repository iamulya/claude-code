---
export_name: GeminiModelConfig
source_file: src/models/gemini.ts
category: type
summary: Configuration interface for initializing GeminiChatModel, covering API keys, Vertex AI settings, and model parameters.
title: GeminiModelConfig
entity_type: api
stub: false
compiled_at: 2026-04-16T14:31:09.303Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/gemini.ts
confidence: 0.95
---

## Overview
`GeminiModelConfig` is a TypeScript type used to configure instances of the Gemini chat model adapter within YAAF. It defines the parameters required to authenticate and interact with Google's Gemini LLMs using the official `@google/genai` SDK. 

The configuration supports two primary integration paths:
1.  **Google AI Studio**: Using an API key.
2.  **Vertex AI**: Using Google Cloud project and location details (as indicated by source documentation).

This type requires the peer dependency `@google/genai` (version 0.7.0 or higher) to be installed in the host project.

## Signature / Constructor
```typescript
export type GeminiModelConfig =
  | {
    apiKey: string
    vertexAI?: false
    model?: string
    temperature?: number
    maxOutputTokens?: number
    contextWindowTokens?: number
  }
```

## Methods & Properties
The following properties are available in the Google AI Studio configuration variant:

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | The API key used for authenticating with Google AI Studio. |
| `vertexAI` | `false` (optional) | Explicitly set to `false` when using the API key-based authentication path. |
| `model` | `string` (optional) | The identifier of the Gemini model to use (e.g., `gemini-1.5-pro`). |
| `temperature` | `number` (optional) | Controls the randomness of the model's output. |
| `maxOutputTokens` | `number` (optional) | The maximum number of tokens the model should generate in a single response. |
| `contextWindowTokens` | `number` (optional) | The total token limit for the model's context window. |

*Note: While the source code snippet provided is a union type that includes a Google AI Studio variant, the source documentation also specifies support for Vertex AI configurations requiring `project` and `location` fields when `vertexAI` is set to `true`.*

## Examples

### Google AI Studio Configuration
This is the most common configuration for rapid prototyping and individual use.
```typescript
import { GeminiChatModel } from './models/gemini';

const config: GeminiModelConfig = {
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-flash',
  temperature: 0.7
};

const model = new GeminiChatModel(config);
```

### Vertex AI Configuration
Used for enterprise-grade deployments on Google Cloud Platform.
```typescript
// Based on source documentation for Vertex AI support
const model = new GeminiChatModel({
  vertexAI: true,
  project: 'my-gcp-project',
  location: 'us-central1',
  model: 'gemini-1.5-pro',
});
```

## See Also
- `GeminiChatModel` (The class that consumes this configuration)
- `BaseLLMAdapter` (The base class for LLM implementations in YAAF)