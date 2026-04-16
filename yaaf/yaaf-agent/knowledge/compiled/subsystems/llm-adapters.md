---
title: LLM Adapters
entity_type: subsystem
summary: Normalizes communication between YAAF and various LLM providers through a unified interface.
primary_files:
  - src/models/base.ts
  - src/models/anthropic.ts
  - src/models/specs.ts
stub: false
compiled_at: 2026-04-16T14:30:42.796Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/anthropic.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/openai.ts
confidence: 0.95
---

## Purpose
The LLM Adapters subsystem serves as the translation layer between the YAAF framework and various Large Language Model (LLM) providers. Its primary goal is to normalize disparate API signatures, authentication schemes, and message formats into a unified interface. This allows the rest of the framework to interact with models from different providers (such as OpenAI and Anthropic) or local inference engines (such as Ollama) without provider-specific logic in the core agent loops.

## Architecture
The subsystem is built on a hierarchical structure that promotes code reuse while allowing for provider-specific overrides.

### BaseLLMAdapter
The `BaseLLMAdapter` class provides the foundational implementation for all adapters. It includes high-level utility methods such as:
- `query()`: Standardized request-response interaction.
- `summarize()`: Specialized logic for text condensation.
- `estimateTokens()`: Utility for calculating context usage.
- `healthCheck()`: Verification of API connectivity and credentials.

### Concrete Implementations
- **OpenAIChatModel**: A versatile adapter that supports the OpenAI Chat Completions API. Due to the industry-wide adoption of this format, it also serves as the adapter for providers like Groq, Together AI, Fireworks, Perplexity, and local runtimes like Ollama or vLLM.
- **AnthropicChatModel**: A specialized adapter for the Anthropic Messages API. It handles unique Anthropic requirements such as top-level system prompts and specific tool-calling schemas.

### Model Specification Registry
The subsystem utilizes `resolveModelSpecs` to automatically determine context window sizes and output token limits based on the model name, reducing the manual configuration required by developers.

## Key APIs
The adapters expose several critical methods for model interaction:

- `complete()`: Performs a standard chat completion.
- `stream()`: Returns an async generator for real-time token streaming.
- `query()`: A high-level wrapper for single-turn interactions.
- `healthCheck()`: Validates the configuration and provider availability.

All adapters are designed to use the native `fetch` API, ensuring compatibility across different JavaScript runtimes without external SDK dependencies.

## Configuration
Adapters are configured via provider-specific configuration objects.

### OpenAI Configuration (`OpenAIModelConfig`)
Key fields include:
- `apiKey`: The provider's API key.
- `baseUrl`: Custom endpoint for compatible providers (e.g., `http://localhost:11434/v1` for Ollama).
- `systemRole`: Allows switching between `'system'` and `'developer'` roles (required for o-series reasoning models).
- `parallelToolCalls`: Boolean to enable or disable simultaneous tool execution.
- `reasoningEffort`: Controls the trade-off between quality and latency for reasoning models (`low`, `medium`, `high`).

### Anthropic Configuration (`AnthropicModelConfig`)
Key fields include:
- `apiKey`: Anthropic-specific API key.
- `apiVersion`: Header for API versioning (defaults to `2023-06-01`).
- `timeoutMs`: Request timeout, defaulting to 120,000ms to accommodate slower Claude 3 Opus tasks.

## Extension Points
The subsystem is designed to be provider-agnostic. Developers can extend the `BaseLLMAdapter` to support new providers by implementing the `complete()` and `stream()` methods. 

### Provider Differences Handled
The adapters abstract several significant differences between providers:
- **Authentication**: OpenAI uses Bearer tokens, while Anthropic uses `x-api-key` and `anthropic-version` headers.
- **System Prompts**: OpenAI treats system instructions as a message role, whereas Anthropic requires them as a top-level API field.
- **Tool Schemas**: OpenAI uses a `parameters` field, while Anthropic uses `input_schema`.
- **Tool Results**: Anthropic requires tool results to be returned in a user message with a specific `tool_result` block type.
- **Usage Tracking**: Normalizes field names like `input_tokens` and `cache_read_input_tokens`.