---
title: ResolverConfig
entity_type: api
summary: Configuration object used by the `resolveModel` function to instantiate a `ChatModel` from provider settings, environment variables, or a pre-built instance.
export_name: ResolverConfig
source_file: src/models/resolver.ts
category: type
search_terms:
 - model resolution configuration
 - how to configure LLM provider
 - select chat model
 - resolveModel config
 - LLM_BASE_URL settings
 - GEMINI_API_KEY config
 - ANTHROPIC_API_KEY config
 - OPENAI_API_KEY config
 - configure OpenAI compatible model
 - set up Ollama
 - Groq configuration
 - YAAF model setup
 - provider settings
stub: false
compiled_at: 2026-04-25T00:12:22.187Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
compiled_from_quality: unknown
confidence: 0.7
---

## Overview

`ResolverConfig` is a type alias for the configuration object passed to the [resolveModel](./resolve-model.md) function. Its purpose is to specify which Large Language Model (LLM) to use and how to connect to it.

This configuration works in conjunction with a set of environment variables to provide a flexible and layered approach to model selection. The [resolveModel](./resolve-model.md) function follows a specific priority order to determine which model to instantiate, with properties in the `ResolverConfig` object often taking precedence.

The resolution priority is as follows [Source 1]:
1.  A pre-built `chatModel` instance provided in the config.
2.  An LLM adapter registered with a `PluginHost`.
3.  Environment variables for OpenAI-compatible endpoints (`LLM_BASE_URL`).
4.  Provider-specific API key environment variables (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
5.  Legacy `provider` and `model` properties in the config.

## Signature

While `ResolverConfig` is a flexible type that can accommodate various provider-specific settings, its core properties are used to guide the model resolution logic. The following is an illustrative representation of its structure.

```typescript
import type { ChatModel } from "../agents/runner.js";
import type { OpenAIModelConfig } from "./openai.js";
import type { GeminiModelConfig } from "./gemini.js";
import type { AnthropicModelConfig } from "./anthropic.js";

export type ResolverConfig = {
  /**
   * A pre-built ChatModel instance. If provided, it is used directly,
   * bypassing all other resolution logic.
   */
  chatModel?: ChatModel;

  /**
   * The name of the provider (e.g., 'openai', 'gemini', 'anthropic').
   * This is a legacy option but still supported.
   */
  provider?: string;

  /**
   * The model name to use (e.g., 'gpt-4o', 'claude-3-opus-20240229').
   * This can override defaults when using environment variables or the `provider` field.
   */
  model?: string;
} & Partial<OpenAIModelConfig> & Partial<GeminiModelConfig> & Partial<AnthropicModelConfig>;
```

## Properties

### `chatModel`
- **Type:** `ChatModel` (optional)
- **Description:** A fully instantiated `ChatModel` object. If this property is present, [resolveModel](./resolve-model.md) immediately returns it, and all other configuration options and environment variables are ignored. This is the highest-priority resolution path.

### `provider`
- **Type:** `string` (optional)
- **Description:** A string identifier for the LLM provider, such as `'openai'`, `'gemini'`, or `'anthropic'`. This property is used with the `model` property as a fallback resolution mechanism if environment variables are not set.

### `model`
- **Type:** `string` (optional)
- **Description:** The specific model identifier to use, like `'gpt-4o'` or `'claude-3-sonnet-20240229'`. This can be used to override the default model when a provider is determined via an environment variable (e.g., `GEMINI_API_KEY`).

## Examples

### 1. Providing a Pre-built Model

This example demonstrates the highest-priority resolution path. The provided `mockModel` will be returned directly by `resolveModel`.

```typescript
import { resolveModel, type ResolverConfig } from 'yaaf';
import type { ChatModel, ChatStream } from 'yaaf';

// A mock ChatModel for demonstration
const mockModel: ChatModel = {
  chat: async function* (messages, options) {
    yield { type: 'text', text: 'Hello from mock model!' };
  },
  getCostTracker: () => ({ takeSnapshot: () => ({ totalCost: 0 }) }),
};

const config: ResolverConfig = {
  chatModel: mockModel,
};

const model = resolveModel(config); // model is mockModel
```

### 2. Using `provider` and `model` Properties

This shows the legacy method of specifying a model, which is used if no environment variables or plugins can resolve a model.

```typescript
import { resolveModel, type ResolverConfig } from 'yaaf';

// This assumes OPENAI_API_KEY is set in the environment
const config: ResolverConfig = {
  provider: 'openai',
  model: 'gpt-4o',
};

const model = resolveModel(config);
// Resolves to an OpenAIChatModel instance for gpt-4o
```

### 3. Relying on Environment Variables

When an empty or partial config is passed, `resolveModel` falls back to environment variables.

```typescript
import { resolveModel, type ResolverConfig } from 'yaaf';

// Assuming ANTHROPIC_API_KEY is set in the environment
// and LLM_MODEL is set to 'claude-3-haiku-20240307'

const config: ResolverConfig = {
  // No model-specific properties
};

const model = resolveModel(config);
// Resolves to an AnthropicChatModel instance for the Haiku model
```

## See Also

-   [resolveModel](./resolve-model.md): The function that consumes `ResolverConfig` to instantiate a `ChatModel`.
-   [ChatModel](./chat-model.md): The interface for LLM chat models that `resolveModel` returns.
-   [AgentConfig](./agent-config.md): The main agent configuration object, which often includes a `ResolverConfig`.

## Sources

[Source 1]: src/models/resolver.ts