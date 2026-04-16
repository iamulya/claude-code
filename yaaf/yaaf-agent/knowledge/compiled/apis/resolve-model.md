---
title: resolveModel
entity_type: api
summary: Constructs a ChatModel from configuration, handling provider auto-detection and plugin overrides.
export_name: resolveModel
source_file: src/models/resolver.ts
category: function
stub: false
compiled_at: 2026-04-16T14:31:17.392Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/resolver.ts
confidence: 0.95
---

## Overview
`resolveModel` is a central utility function used to instantiate a `ChatModel` based on provided configuration settings. It abstracts the complexity of provider selection, environment variable detection, and plugin-based overrides, allowing the agent lifecycle management to remain decoupled from specific LLM implementations.

The function supports native providers (OpenAI, Gemini, Anthropic) as well as OpenAI-compatible providers (e.g., Groq, Ollama) via pre-defined base URL mappings.

## Signature / Constructor

```typescript
export function resolveModel(
  config: ResolverConfig, 
  pluginHost?: PluginHost
): ChatModel
```

### Parameters
- `config`: A configuration object (typically derived from `AgentConfig`) containing provider settings, model names, and optional pre-constructed model instances.
- `pluginHost`: An optional host object used to check for registered `LLMAdapter` plugins that might override standard resolution.

### Resolution Priority
The function determines which model to return using the following priority:
1. **Direct Instance**: If `config.chatModel` is already provided, it is used directly.
2. **Plugin Override**: If a `pluginHost` is provided and contains a registered `LLMAdapter`, the adapter's model is used.
3. **Explicit Gemini**: If `config.provider` is set to `'gemini'`, a `GeminiChatModel` is constructed.
4. **OpenAI-Compatible**: If any other provider string is specified, an `OpenAIChatModel` is constructed. If the provider name exists in `KNOWN_BASE_URLS`, the corresponding base URL is applied.
5. **Auto-detection**: If no provider is specified, the function checks environment variables:
    - `GEMINI_API_KEY` triggers `GeminiChatModel`.
    - `OPENAI_API_KEY` triggers `OpenAIChatModel`.

## Methods & Properties

### KNOWN_BASE_URLS
A constant record of well-known base URLs for OpenAI-compatible providers. When these keys are used as the `provider` in configuration, `resolveModel` automatically configures the `OpenAIChatModel` to point to the correct endpoint.

| Provider | Base URL |
| :--- | :--- |
| `groq` | `https://api.groq.com/openai/v1` |
| `ollama` | `http://localhost:11434/v1` |
| `together` | `https://api.together.xyz/v1` |
| `fireworks` | `https://api.fireworks.ai/inference/v1` |
| `perplexity` | `https://api.perplexity.ai` |
| `deepseek` | `https://api.deepseek.com/v1` |

## Examples

### Basic OpenAI Resolution
```typescript
import { resolveModel } from 'yaaf';

const model = resolveModel({
  provider: 'openai',
  model: 'gpt-4-turbo'
});
```

### Resolving an OpenAI-Compatible Provider
```typescript
import { resolveModel } from 'yaaf';

// Automatically uses Groq's base URL
const model = resolveModel({
  provider: 'groq',
  model: 'llama3-70b-8192'
});
```

### Environment-Based Auto-detection
```typescript
import { resolveModel } from 'yaaf';

// If GEMINI_API_KEY is set in the environment, this resolves to GeminiChatModel
const model = resolveModel({});
```

## See Also
- `ChatModel`
- `OpenAIChatModel`
- `GeminiChatModel`
- `AnthropicChatModel`