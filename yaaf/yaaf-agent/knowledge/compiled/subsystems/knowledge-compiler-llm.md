---
title: Knowledge Compiler LLM Subsystem
entity_type: subsystem
summary: A specialized subsystem providing provider-agnostic LLM and vision client utilities for knowledge base compilation and maintenance.
primary_files:
  - src/knowledge/compiler/llmClient.ts
exports:
  - LLMCallFn
  - VisionCallFn
  - LLMClientOptions
  - makeKBLLMClient
  - makeKBVisionClient
  - autoDetectKBClients
stub: false
compiled_at: 2026-04-16T14:25:46.043Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/llmClient.ts
confidence: 0.95
---

## Purpose
The Knowledge Compiler LLM Subsystem provides a simplified, provider-agnostic interface for interacting with Large Language Models (LLMs) specifically for knowledge base operations. It abstracts the complexities of different model providers (OpenAI, Anthropic, Gemini) into standardized functional interfaces. 

This subsystem is primarily utilized for "Phase C" features of the knowledge compiler, which include:
*   **Healing**: Correcting or updating existing knowledge entries.
*   **Discovery**: Identifying new information or relationships within the source material.
*   **Vision**: Processing visual data to extract knowledge.

## Architecture
The subsystem is designed around a functional factory pattern. Rather than exposing complex class hierarchies, it provides factory functions that return specialized call functions.

### Key Components
*   **LLMCallFn**: A standard text-in/text-out interface. It accepts a system prompt, a user prompt, and optional parameters like temperature and token limits.
*   **VisionCallFn**: An extension of the text interface that accepts Base64-encoded images and their corresponding MIME types.
*   **Provider Detection**: Logic to automatically identify the appropriate provider and model based on environment variables or explicit configuration.

## Key APIs

### Factory Functions
*   `makeKBLLMClient(options)`: Creates an `LLMCallFn`. It handles provider-specific implementation details internally.
*   `makeKBVisionClient(options)`: Creates a `VisionCallFn`. If the selected provider does not natively support vision, the subsystem is designed to fall back to a text-only client.
*   `autoDetectKBClients(options)`: A convenience utility that attempts to initialize both text and vision clients simultaneously. It returns `null` if no valid API keys are detected in the environment.

### Types
```typescript
export type LLMCallFn = (params: {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}) => Promise<string>

export type VisionCallFn = (params: {
  system: string
  user: string
  imageBase64: string
  imageMimeType: string
  temperature?: number
  maxTokens?: number
}) => Promise<string>
```

## Configuration
The subsystem is configured via the `LLMClientOptions` object. If options are omitted, the system attempts to auto-detect settings from environment variables.

| Field | Description | Supported Values |
|-------|-------------|------------------|
| `apiKey` | Explicit API key for the provider. | String |
| `model` | The specific model identifier to use. | String |
| `provider` | The LLM service provider. | `gemini`, `openai`, `anthropic` |

### Example Usage
```typescript
import { makeKBLLMClient } from './llmClient';

const llm = makeKBLLMClient({
  provider: 'anthropic',
  apiKey: 'your-api-key'
});

const answer = await llm({ 
  system: 'You are a knowledge base assistant.', 
  user: 'Summarize the architectural boundaries of this subsystem.' 
});
```

## Sources
* `src/knowledge/compiler/llmClient.ts`