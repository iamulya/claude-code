---
title: Model Resolution
entity_type: concept
summary: The framework's logic for selecting and initializing LLM providers based on configuration, environment variables, and plugins.
related_subsystems:
  - models
  - agents
stub: false
compiled_at: 2026-04-16T14:31:21.508Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/resolver.ts
confidence: 0.9
---

## What It Is
Model Resolution is the centralized process in YAAF for determining which Large Language Model (LLM) provider to use and how to initialize its corresponding client. This mechanism abstracts provider-specific initialization logic away from the agent's lifecycle management, allowing the framework to remain provider-agnostic. It ensures that agents can be configured via explicit settings, environment variables, or external plugins without changing the core agent implementation.

## How It Works in YAAF
The resolution logic is primarily handled by the `resolveModel` function defined in `src/models/resolver.ts`. This function constructs a `ChatModel` instance by evaluating configuration and environment state according to a specific hierarchy of priority.

### Resolution Priority
The resolver evaluates the following sources in order:
1.  **Direct Instance**: If `config.chatModel` is already constructed and provided, it is used directly.
2.  **Plugin Adapter**: If a `PluginHost` is provided and contains a registered `LLMAdapter`, the framework uses the plugin to resolve the model.
3.  **Explicit Gemini Provider**: If `config.provider` is explicitly set to `'gemini'`, the framework initializes a `GeminiChatModel`.
4.  **OpenAI-Compatible Providers**: For any other provider string, the framework attempts to build an `OpenAIChatModel`. This supports both native OpenAI services and OpenAI-compatible APIs.
5.  **Environment Auto-detection**: If no provider is specified, the resolver checks for the presence of specific environment variables:
    *   `GEMINI_API_KEY` defaults the provider to Gemini.
    *   `OPENAI_API_KEY` defaults the provider to OpenAI.

### Known Base URLs
For OpenAI-compatible providers, the resolver maintains a registry of `KNOWN_BASE_URLS`. This allows developers to specify a provider by name rather than providing a full URL:

| Provider Name | Base URL |
| :--- | :--- |
| `groq` | `https://api.groq.com/openai/v1` |
| `ollama` | `http://localhost:11434/v1` |
| `together` | `https://api.together.xyz/v1` |
| `fireworks` | `https://api.fireworks.ai/inference/v1` |
| `perplexity` | `https://api.perplexity.ai` |
| `deepseek` | `https://api.deepseek.com/v1` |

## Configuration
Developers configure model resolution through the `ResolverConfig` object. This configuration can specify the provider, model name, and API credentials.

```typescript
import { resolveModel } from './models/resolver.js';

// Example: Explicitly configuring an OpenAI-compatible provider
const model = resolveModel({
  provider: 'groq',
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama3-70b-8192'
});

// Example: Relying on environment auto-detection
// If OPENAI_API_KEY is set in the environment:
const autoModel = resolveModel({});
```

If the resolver cannot determine a provider and no valid API keys are detected in the environment, the `resolveModel` function throws an error.