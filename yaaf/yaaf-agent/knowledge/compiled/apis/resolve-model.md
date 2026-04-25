---
title: resolveModel
entity_type: api
summary: Resolves and constructs a `ChatModel` instance based on agent configuration and environment variables, applying a defined resolution priority.
export_name: resolveModel
source_file: src/models/resolver.ts
category: function
search_terms:
 - configure LLM provider
 - select chat model
 - environment variables for model
 - LLM_BASE_URL
 - GEMINI_API_KEY
 - ANTHROPIC_API_KEY
 - OPENAI_API_KEY
 - model resolution priority
 - how to use Ollama with YAAF
 - connect to OpenAI compatible API
 - set up Groq
 - use local LLM
 - model provider auto-detection
 - unified model configuration
 - ChatModel factory
stub: false
compiled_at: 2026-04-24T17:32:50.378Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `resolveModel` function is a key utility in YAAF for instantiating a `ChatModel`. It acts as a centralized resolver that determines which language model provider to use based on a cascading set of rules, prioritizing explicit configuration, plugins, and environment variables [Source 1].

This function simplifies agent configuration by providing a unified strategy for connecting to various [LLM](../concepts/llm.md) providers, including native SDKs for Google Gemini, Anthropic Claude, and OpenAI, as well as any OpenAI-compatible API endpoint like Ollama, Groq, or DeepSeek. It inspects the provided configuration and environment variables to automatically detect and construct the appropriate `ChatModel` instance. If no valid configuration can be found, it throws an error detailing the available options [Source 1].

## Signature

```typescript
export function resolveModel(
  config: ResolverConfig,
  pluginHost?: PluginHost
): ChatModel;
```

**Parameters:**

*   `config: ResolverConfig`: An object containing configuration details. The resolver primarily checks for a pre-built `chatModel` instance within this object. It also supports legacy `provider` and `model` properties for backward compatibility [Source 1].
*   `pluginHost?: PluginHost`: An optional `PluginHost` instance. If provided, the resolver will check if an LLM plugin has been registered to serve as the `ChatModel` [Source 1].

**Returns:**

*   `ChatModel`: A concrete instance of a class that implements the `ChatModel` interface, such as `OpenAIChatModel`, `GeminiChatModel`, or `AnthropicChatModel` [Source 1].

## Resolution Logic

`resolveModel` follows a strict priority order to determine which `ChatModel` to return. It evaluates the options sequentially and uses the first valid one it finds [Source 1].

### Resolution Priority

1.  **`config.chatModel`**: If a pre-constructed `ChatModel` instance is passed directly in the configuration object, it is returned immediately.
2.  **PluginHost Adapter**: If a `pluginHost` is provided and an LLM plugin is registered, the adapter from the plugin is used.
3.  **`LLM_BASE_URL` Environment Variable**: If this variable is set, the resolver configures an `OpenAIChatModel` to point to the specified URL, enabling support for any OpenAI-compatible API. The `LLM_MODEL` and `LLM_API_KEY` variables are used in this mode.
4.  **`GEMINI_API_KEY` Environment Variable**: If set, it constructs a `GeminiChatModel`. The default model can be overridden with `LLM_MODEL`.
5.  **`ANTHROPIC_API_KEY` Environment Variable**: If set, it constructs an `AnthropicChatModel`. The default model can be overridden with `LLM_MODEL`.
6.  **`OPENAI_API_KEY` Environment Variable**: If set, it constructs an `OpenAIChatModel` pointing to the official OpenAI API. The default model can be overridden with `LLM_MODEL`.
7.  **Error**: If none of the above conditions are met, the function throws an error that clearly lists the valid configuration options [Source 1].

### Environment Variables

The resolver relies heavily on a set of environment variables for auto-detection [Source 1].

#### Universal Variables

These variables can be used with any provider.

*   `LLM_MODEL`: Specifies the model name to use (e.g., `gpt-4o`, `claude-3-opus-20240229`).
*   `LLM_API_KEY`: The API key, primarily used for OpenAI-compatible providers [when](./when.md) `LLM_BASE_URL` is set.
*   `LLM_BASE_URL`: The base URL for an OpenAI-compatible API endpoint. Setting this variable activates the generic OpenAI-compatible mode. Examples include:
    *   **Ollama**: `http://localhost:11434/v1`
    *   **Groq**: `https://api.groq.com/openai/v1`
    *   **DeepSeek**: `https://api.deepseek.com/v1`

#### Provider-Specific API Keys

These variables are used to auto-detect a specific provider when `LLM_BASE_URL` is not set.

*   `GEMINI_API_KEY`: Activates the native Google Gemini SDK.
*   `ANTHROPIC_API_KEY`: Activates the native Anthropic Claude SDK.
*   `OPENAI_API_KEY`: Activates the native OpenAI SDK.

### Backward Compatibility

To maintain compatibility with older versions, `resolveModel` supports several aliases and legacy configuration properties [Source 1].

*   `OPENAI_BASE_URL` is an alias for `LLM_BASE_URL`.
*   `OPENAI_MODEL` is an alias for `LLM_MODEL` (only when using the OpenAI provider).
*   `YAAF_AGENT_MODEL` is an alias for `LLM_MODEL`.
*   `config.provider` and `config.model` properties in the configuration object are still supported.

## Examples

### Example 1: Using an OpenAI-Compatible Endpoint (Ollama)

This example shows how to configure an agent to use a local Ollama model by setting environment variables.

```bash
# Set environment variables in your shell
export LLM_BASE_URL="http://localhost:11434/v1"
export LLM_MODEL="llama3"
# LLM_API_KEY is often not required for local Ollama
```

```typescript
// In your agent's code:
import { Agent, resolveModel } from 'yaaf';

// The config object can be minimal when using environment variables
const config = {};

// resolveModel will automatically detect the environment variables
// and create an OpenAIChatModel configured for Ollama.
const chatModel = resolveModel(config);

const agent = new Agent({
  chatModel: chatModel,
  // ... other agent configuration
});
```

### Example 2: Using a Native SDK (Google Gemini)

This example demonstrates configuration via a provider-specific API key.

```bash
# Set environment variables in your shell
export GEMINI_API_KEY="your-google-api-key"
export LLM_MODEL="gemini-1.5-pro"
```

```typescript
// In your agent's code:
import { Agent, resolveModel } from 'yaaf';

const config = {};

// resolveModel detects GEMINI_API_KEY and instantiates GeminiChatModel
// using the model specified by LLM_MODEL.
const chatModel = resolveModel(config);

const agent = new Agent({
  chatModel: chatModel,
  // ... other agent configuration
});
```

## Sources

[Source 1]: src/models/resolver.ts