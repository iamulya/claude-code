---
summary: Configuration interface for the `GeminiChatModel`, specifying the API key, model, temperature, token limits, and thinking budget for Google AI models.
export_name: GeminiModelConfig
source_file: src/models/gemini.ts
category: type
title: GeminiModelConfig
entity_type: api
search_terms:
 - Google Gemini configuration
 - GeminiChatModel settings
 - how to configure Gemini model
 - Gemini API key setup
 - set Gemini temperature
 - maxOutputTokens for Gemini
 - context window size Gemini
 - Gemini thinking budget
 - enable tool calling reasoning
 - Gemini 1.5 Pro config
 - Gemini model parameters
 - YAAF Google AI
 - configure reasoning chain
stub: false
compiled_at: 2026-04-24T17:08:05.175Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/gemini.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`GeminiModelConfig` is a TypeScript type that defines the configuration options for an instance of the `GeminiChatModel`. It is used to provide authentication credentials and set model parameters such as the model name, temperature, token limits, and reasoning capabilities [Source 1].

This configuration type is specifically for connecting to Google's Gemini models through Google AI Studio using an API key. It allows for fine-grained control over the model's behavior, including the `thinkingBudget` property, which is essential for enabling advanced tool-calling and reasoning features in compatible models [Source 1].

## Signature

The `GeminiModelConfig` is a union type. The following signature represents the configuration for using Google AI Studio [Source 1].

```typescript
export type GeminiModelConfig = {
  apiKey: string;
  vertexAI?: false;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  contextWindowTokens?: number;
  /**
   * Thinking budget for thinking-capable models (e.g. Gemini 2.5 Pro).
   * When [[[[[[[[Tools]]]]]]]] are present:
   * - `undefined` (default): Disables thinking (thinkingBudget: 0) for SDK compatibility
   * - `0`: Explicitly disable thinking
   * - `N > 0`: Allow up to N tokens of thinking chain
   *
   * Set this to a positive value to enable reasoning with tool-calling models.
   */
  thinkingBudget?: number;
};
```

### Properties

*   **`apiKey`**: `string` (required)
    The API key for authenticating with Google AI Studio [Source 1].

*   **`vertexAI`**: `false` (optional)
    Must be `false` or omitted [when](./when.md) using an `apiKey` [Source 1].

*   **`model`**: `string` (optional)
    The specific Gemini model to use, e.g., `'gemini-1.5-pro'` [Source 1].

*   **`temperature`**: `number` (optional)
    Controls the randomness of the output. Higher values result in more creative responses [Source 1].

*   **`maxOutputTokens`**: `number` (optional)
    The maximum number of tokens to generate in the response [Source 1].

*   **`contextWindowTokens`**: `number` (optional)
    The total token limit for the model's [Context Window](../concepts/context-window.md) [Source 1].

*   **`thinkingBudget`**: `number` (optional)
    Enables and controls the reasoning capabilities for models that support tool calling.
    *   If `undefined` (the default), thinking is disabled for SDK compatibility.
    *   If `0`, thinking is explicitly disabled.
    *   If greater than `0`, the model is allowed to use up to that many tokens for its internal reasoning chain when using Tools [Source 1].

## Examples

### Basic Configuration

This example shows a basic configuration for a `GeminiChatModel` instance using an API key from Google AI Studio.

```typescript
import type { GeminiModelConfig } from 'yaaf';

// Basic configuration for Google AI Studio
const config: GeminiModelConfig = {
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxOutputTokens: 2048,
};

// This config object would be passed to the GeminiChatModel constructor.
// const model = new GeminiChatModel(config);
```

### Enabling Tool-Calling Reasoning

To use a model's advanced reasoning and tool-calling features, set the `thinkingBudget` to a positive number.

```typescript
import type { GeminiModelConfig } from 'yaaf';

// Configuration to enable tool-calling reasoning with a thinking budget
const toolCallingConfig: GeminiModelConfig = {
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-pro', // A model that supports tool calling
  thinkingBudget: 8000, // Allow up to 8000 tokens for the reasoning chain
};

// This config enables the model to "think" before responding when tools are provided.
// const model = new GeminiChatModel(toolCallingConfig);
```

## See Also

*   `GeminiChatModel`: The agent framework class that uses this configuration type to interact with Google's Gemini models.

## Sources

[Source 1]: src/models/gemini.ts