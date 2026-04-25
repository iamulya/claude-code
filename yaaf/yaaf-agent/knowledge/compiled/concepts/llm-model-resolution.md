---
title: LLM Model Resolution
entity_type: concept
summary: Describes the hierarchical strategy YAAF uses to determine which LLM `ChatModel` to instantiate based on configuration, environment variables, and plugin adapters.
primary_files:
 - src/models/resolver.ts
related_subsystems:
 - models
 - plugin
search_terms:
 - how to configure LLM provider
 - YAAF model selection
 - LLM_BASE_URL usage
 - OpenAI compatible provider setup
 - Gemini API key configuration
 - Anthropic API key configuration
 - agent model configuration priority
 - resolveModel function
 - environment variables for LLM
 - config.chatModel
 - LLM plugin adapter
 - YAAF_AGENT_MODEL
 - OPENAI_BASE_URL alias
stub: false
compiled_at: 2026-04-24T17:58:06.677Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

[LLM](./llm.md) Model Resolution is the internal process YAAF uses to select and instantiate a `ChatModel` for an agent [Source 1]. It provides a flexible, hierarchical system that allows developers to specify a language model provider through various means, including direct object configuration, plugins, and environment variables. This mechanism decouples the agent's core logic from the specific LLM implementation, enabling support for multiple providers, including OpenAI-compatible endpoints, without requiring code changes [Source 1].

## How It Works in YAAF

The model resolution logic is encapsulated in the `resolveModel` function, which is called during agent initialization [Source 1]. It attempts to find a valid model configuration by checking a series of sources in a specific order of precedence. The first valid source found is used, and the process stops. If no source can provide a model, an error is thrown [Source 1].

The resolution priority is as follows [Source 1]:

1.  **`config.chatModel`**: If a pre-instantiated `ChatModel` object is passed directly in the agent configuration, it is used immediately. This bypasses all other resolution steps.
2.  **PluginHost Adapter**: The system checks if an LLM plugin has been registered with the `PluginHost`. If found, the adapter from the plugin is used to provide the model.
3.  **`LLM_BASE_URL` Environment Variable**: If this variable is set, YAAF activates an OpenAI-compatible mode. It uses the `OpenAIChatModel` with the specified URL, along with the `LLM_MODEL` and `LLM_API_KEY` environment variables.
4.  **`GEMINI_API_KEY` Environment Variable**: If this key is present, YAAF instantiates the native `GeminiChatModel`. The `LLM_MODEL` variable can be used to override the default Gemini model.
5.  **`ANTHROPIC_API_KEY` Environment Variable**: If this key is present, YAAF instantiates the native `AnthropicChatModel`. The `LLM_MODEL` variable can be used to override the default Anthropic model.
6.  **`OPENAI_API_KEY` Environment Variable**: If this key is present, YAAF instantiates the native `OpenAIChatModel`. The `LLM_MODEL` variable can be used to override the default OpenAI model.
7.  **Error**: If none of the above conditions are met, the resolution fails, and an error is thrown that lists the available configuration options.

## Configuration

Model resolution is primarily configured via environment variables, which are organized into universal and provider-specific categories [Source 1].

### Universal Environment Variables

These variables can be used with any provider, particularly for OpenAI-compatible endpoints [Source 1].

*   `LLM_MODEL=<name>`: Specifies the model name to use (e.g., `gpt-4o`, `claude-3-opus-20240229`).
*   `LLM_API_KEY=<key>`: The API key for the service.
*   `LLM_BASE_URL=<url>`: The base URL for an OpenAI-compatible API. Setting this variable activates the generic OpenAI-compatible client. Examples include:
    *   **Ollama**: `http://localhost:11434/v1`
    *   **GLM**: `https://open.bigmodel.cn/api/paas/v4`
    *   **DeepSeek**: `https://api.deepseek.com/v1`
    *   **Groq**: `https://api.groq.com/openai/v1`
    *   **Qwen**: `https://dashscope.aliyuncs.com/compatible-mode/v1`

### Provider-Specific API Keys

[when](../apis/when.md) `LLM_BASE_URL` is not set, the presence of one of these variables auto-detects the provider and uses its native SDK [Source 1].

*   `GEMINI_API_KEY=<key>`: Activates the `GeminiChatModel`.
*   `ANTHROPIC_API_KEY=<key>`: Activates the `AnthropicChatModel`.
*   `OPENAI_API_KEY=<key>`: Activates the `OpenAIChatModel`.

### Backward Compatibility

YAAF maintains aliases for older environment variables to ensure backward compatibility [Source 1].

*   `OPENAI_BASE_URL` is an alias for `LLM_BASE_URL`.
*   `OPENAI_MODEL` is an alias for `LLM_MODEL` (only when using the OpenAI provider path).
*   `YAAF_AGENT_MODEL` is an alias for `LLM_MODEL`.

Additionally, older configuration properties like `config.provider` and `config.model` continue to be supported [Source 1].

## Sources

[Source 1]: src/models/resolver.ts