---
summary: Manages the integration of various Large Language Models (LLMs) into YAAF, providing a unified adapter interface.
primary_files:
 - src/models/openai.ts
 - src/models/resolver.ts
 - src/models/base.js
 - src/models/specs.js
title: LLM Integration
entity_type: subsystem
exports:
 - resolveModel
 - OpenAIChatModel
 - GeminiChatModel
 - AnthropicChatModel
 - BaseLLMAdapter
search_terms:
 - connect to different LLMs
 - how to use OpenAI with YAAF
 - configure LLM provider
 - Ollama integration
 - Groq with YAAF
 - LLM_BASE_URL environment variable
 - model adapter pattern
 - switching language models
 - provider-agnostic LLM
 - resolve chat model
 - custom LLM endpoint
 - Fireworks AI
 - Together AI
 - Perplexity AI
stub: false
compiled_at: 2026-04-25T00:29:51.640Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The LLM Integration subsystem provides a provider-agnostic layer for connecting YAAF agents to various Large Language Models ([LLM](../concepts/llm.md)). Its primary purpose is to abstract the specifics of different [LLM](../concepts/llm.md) provider APIs, offering a unified interface to the rest of the framework. This allows developers to switch between models from providers like OpenAI, Google, Anthropic, or any OpenAI-compatible service (e.g., Groq, Ollama) with minimal configuration changes. The subsystem is responsible for resolving which model to use based on configuration and environment variables, and instantiating the appropriate client adapter.

## Architecture

The subsystem is built around the Adapter design pattern. The core of this architecture is the `[[BaseLLMAdapter]]`, an abstract class that defines a common interface for all language models. This interface includes standard methods like `query()`, `summarize()`, `[[estimateTokens]]`, and `healthCheck()` [Source 1].

Concrete implementations for specific providers extend this base class:
- `OpenAIChatModel`: A versatile adapter for any provider that exposes an OpenAI-compatible chat completions API. This includes not only OpenAI but also services like Groq, Together AI, Fireworks, Perplexity, and local models served via Ollama or vLLM [Source 1].
- `[[GeminiChatModel]]`: An adapter for Google's Gemini models [Source 2].
- `[[AnthropicChatModel]]`: An adapter for Anthropic's Claude models [Source 2].

The `[[resolveModel]]` function acts as a factory and resolver. It inspects the agent's configuration and environment variables to determine which model adapter to instantiate. This logic follows a strict priority order to ensure predictable behavior [Source 2]. The subsystem also uses a model specification system, accessed via `[[resolveModelSpecs]]`, to manage model-specific attributes like context window size [Source 1].

## Integration Points

- **[Agent Core](./agent-core.md)**: The agent's core logic uses `[[resolveModel]]` during initialization to create the `[[ChatModel]]` instance it will use for all subsequent [LLM](../concepts/llm.md) interactions.
- **[Plugin System](./plugin-system.md)**: The `[[resolveModel]]` function can accept a `[[PluginHost]]` instance. If an LLM adapter is registered as a plugin, it will be prioritized over environment variable-based resolution, providing a key extension point [Source 2].
- **[Tokenization System](./tokenization-system.md)**: Other subsystems, particularly those concerned with managing context windows like the [Tokenization System](./tokenization-system.md) or [Context Management](./context-management.md), rely on the `[[estimateTokens]]` method exposed by the `[[BaseLLMAdapter]]` interface.

## Key APIs

- `[[resolveModel]]`: The primary function for instantiating a `[[ChatModel]]` based on an agent's configuration and environment variables [Source 2].
- `OpenAIChatModel`: A class that implements the `[[ChatModel]]` interface for any OpenAI-compatible API endpoint [Source 1].
- `[[GeminiChatModel]]`: A class that implements the `[[ChatModel]]` interface for Google Gemini models [Source 2].
- `[[AnthropicChatModel]]`: A class that implements the `[[ChatModel]]` interface for Anthropic Claude models [Source 2].
- `[[BaseLLMAdapter]]`: The abstract base class that defines the common interface for all model adapters, ensuring interoperability [Source 1].
- `[[OpenAIModelConfig]]`: The configuration interface for the `OpenAIChatModel`, allowing customization of parameters like API key, base URL, model name, and timeouts [Source 1].

## Configuration

Model selection and configuration are highly flexible, driven by a combination of direct configuration, plugins, and environment variables. The `[[resolveModel]]` function uses the following priority list [Source 2]:

1.  **Pre-built Instance**: A `chatModel` instance passed directly in the `[[ResolverConfig]]`.
2.  **Plugin Host**: An LLM adapter registered with the `[[PluginHost]]`.
3.  **`LLM_BASE_URL`**: If this environment variable is set, the system uses `OpenAIChatModel` with the specified URL, `LLM_API_KEY`, and `LLM_MODEL`.
4.  **`GEMINI_API_KEY`**: If set, the system uses `[[GeminiChatModel]]`.
5.  **`ANTHROPIC_API_KEY`**: If set, the system uses `[[AnthropicChatModel]]`.
6.  **`OPENAI_API_KEY`**: If set, the system uses `OpenAIChatModel` with the default OpenAI URL.
7.  **Error**: If none of the above conditions are met, an error is thrown.

The `OpenAIChatModel` itself can be configured with an `[[OpenAIModelConfig]]` object. This allows for fine-grained control over parameters such as [Source 1]:
- `apiKey`: The API key.
- `baseUrl`: The API endpoint (e.g., `https://api.groq.com/openai/v1`).
- `model`: The specific model name (e.g., `llama-3.3-70b-versatile`).
- `timeoutMs`: Request timeout.
- `contextWindowTokens`: The model's context window size.
- `maxOutputTokens`: The maximum number of tokens to generate.
- `parallelToolCalls`: Whether to allow the model to call multiple tools in one turn.
- `systemRole`: Can be set to `'developer'` for certain models.
- `reasoningEffort`: A parameter for `o-series` models to control the quality/latency trade-off.

## Extension Points

The primary method for extending this subsystem is to create a custom `[[ChatModel]]` implementation, typically by extending `[[BaseLLMAdapter]]`. This custom adapter can then be integrated into the framework in two ways:

1.  **Direct Instantiation**: An instance of the custom adapter can be passed directly into the `[[AgentConfig]]` via the `chatModel` property. This bypasses the `[[resolveModel]]` logic entirely [Source 2].
2.  **Plugin Registration**: The custom adapter can be registered with the `[[PluginHost]]`. The `[[resolveModel]]` logic gives plugins a high priority, making this the recommended approach for creating reusable, shareable model adapters [Source 2].

## Sources

- [Source 1]: `src/models/openai.ts`
- [Source 2]: `src/models/resolver.ts`