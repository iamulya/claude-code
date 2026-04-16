---
title: Model System
entity_type: subsystem
summary: The subsystem responsible for interfacing with Large Language Models through provider-agnostic adapters.
primary_files:
  - src/models/base.ts
  - src/models/resolver.ts
  - src/models/router.ts
exports:
  - BaseLLMAdapter
  - resolveModel
  - RouterChatModel
  - KNOWN_BASE_URLS
stub: false
compiled_at: 2026-04-16T14:30:53.141Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/base.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/resolver.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/router.ts
confidence: 0.9
---

## Purpose
The Model System provides a unified, provider-agnostic interface for interacting with Large Language Models (LLMs). It abstracts the complexities of different provider APIs (such as OpenAI, Anthropic, and Gemini) into a consistent set of methods for text generation, streaming, and token estimation. Additionally, it handles model instantiation through automated resolution and provides mechanisms for cost optimization via intelligent routing.

## Architecture
The subsystem is structured into three primary functional areas:

1.  **Base Abstraction**: The `BaseLLMAdapter` class serves as the foundation for all model implementations. It implements shared logic for high-level operations like summarization and token estimation, while requiring subclasses to implement the core communication logic.
2.  **Model Resolution**: The `resolveModel` utility centralizes the logic for determining which LLM provider to use based on developer configuration or environment variables.
3.  **Routing**: The `RouterChatModel` provides a wrapper around multiple models to implement tiered execution strategies, typically separating "fast/cheap" models from "capable/expensive" models.

### Key Classes
- **BaseLLMAdapter**: An abstract class extending `PluginBase`. It provides shared implementations of `query()`, `summarize()`, and `estimateTokens()` expressed in terms of an abstract `complete()` method.
- **RouterChatModel**: A specialized implementation of the `ChatModel` interface that routes requests to different underlying models based on context, such as the complexity of the task or the number of tools provided.

## Integration Points
The Model System integrates with several other framework components:
- **Plugin System**: LLM adapters are treated as plugins, extending `PluginBase` and interacting with the `PluginHost`.
- **Agent Configuration**: The system consumes `AgentConfig` to determine provider settings and API keys.
- **Agent Runner**: The `ChatModel` interface produced by this subsystem is the primary execution dependency for the agent's lifecycle management.

## Key APIs

### resolveModel
The primary entry point for constructing a model instance. It follows a specific priority order to resolve the model:
1.  Directly provided `chatModel` instances.
2.  Registered `LLMAdapter` plugins from a `PluginHost`.
3.  Explicit provider strings (e.g., 'gemini', 'openai').
4.  Auto-detection via environment variables (e.g., `OPENAI_API_KEY`, `GEMINI_API_KEY`).

### BaseLLMAdapter
Subclasses must implement the following members:
- `complete(params)`: The primary method for LLM calls, including tool support.
- `stream(params)`: Server-Sent Events (SSE) streaming support.
- `model`: A readonly string identifier for the model.
- `contextWindowTokens`: The maximum context window size.
- `maxOutputTokens`: The maximum allowed output tokens.

### RouterChatModel
Enables two-tier routing for cost optimization. It uses a `RouterContext` (containing messages, tools, and iteration count) to decide between a `fast` model and a `capable` model.

```typescript
const model = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
  route: ({ messages, tools }) => {
    if ((tools?.length ?? 0) > 5) return 'capable';
    return 'fast';
  },
});
```

## Configuration
The system supports a variety of OpenAI-compatible providers through `KNOWN_BASE_URLS`. These include:
- **Groq**: `https://api.groq.com/openai/v1`
- **Ollama**: `http://localhost:11434/v1`
- **Together**: `https://api.together.xyz/v1`
- **Fireworks**: `https://api.fireworks.ai/inference/v1`
- **Perplexity**: `https://api.perplexity.ai`
- **DeepSeek**: `https://api.deepseek.com/v1`

## Extension Points
Developers can extend the Model System in two primary ways:
1.  **Custom Adapters**: By extending `BaseLLMAdapter`, developers can add support for new LLM providers or local inference engines.
2.  **Custom Routing**: The `RouterChatModel` accepts a custom `route` function, allowing developers to implement sophisticated heuristics for model selection based on message content, token counts, or specific keywords (e.g., routing "architect" or "refactor" queries to more capable models).