---
summary: Manages interactions with Large Language Models, including adapters, token estimation, and response handling.
primary_files:
 - src/models/base.ts
 - src/plugin/types.ts
 - src/utils/tokens.js
title: LLM System
entity_type: subsystem
exports:
 - BaseLLMAdapter
 - LLMAdapter
 - LLMQueryParams
 - LLMResponse
 - LLMMessage
 - StreamingChatModel
 - estimateTokens
search_terms:
 - LLM interaction
 - how to connect to an LLM
 - LLM provider integration
 - language model adapter
 - token counting
 - estimate prompt size
 - LLM query and response
 - streaming LLM responses
 - BaseLLMAdapter implementation
 - YAAF model support
 - LLM abstraction layer
 - complete() method
stub: false
compiled_at: 2026-04-25T00:29:44.988Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The LLM System provides a standardized, provider-agnostic interface for interacting with various [Large Language Models](../concepts/llm.md). It abstracts the complexities of specific LLM APIs, allowing other parts of the YAAF framework to query models, handle responses, and estimate token usage in a uniform way. This subsystem is central to making agents portable across different model providers.

## Architecture

The core of the LLM System is a plugin-based adapter pattern. The central abstraction is the [LLMAdapter](../apis/llm-adapter.md) interface, which defines the contract for all interactions with an [LLM](../concepts/llm.md).

A key component is the [BaseLLMAdapter](../apis/base-llm-adapter.md), an abstract class that serves as the foundation for all concrete LLM adapter implementations [Source 1]. This base class provides shared logic for common operations like `query()`, `summarize()`, `healthCheck()`, and `estimateTokens()`. These methods are implemented in terms of a single abstract `complete()` method, which subclasses are required to implement. This design centralizes common functionality while delegating provider-specific details—such as API request formatting, authentication, and error handling—to the concrete adapter subclasses [Source 1].

Token estimation is handled by the `rawEstimateTokens` utility function, which provides a baseline mechanism for calculating the token count of messages before they are sent to the model [Source 1].

## Integration Points

- **[Agent Core](./agent-core.md)**: The agent's core logic relies on this subsystem to execute prompts and process the resulting [LLMResponse](../apis/llm-response.md).
- **[Plugin System](./plugin-system.md)**: The [Plugin System](./plugin-system.md) is responsible for discovering, loading, and making concrete [LLMAdapter](../apis/llm-adapter.md) implementations available to the agent at runtime.
- **[Token Management](./token-management.md)**: This subsystem uses the `estimateTokens` functionality to manage the size of the context window, ensuring that prompts do not exceed the model's limits.

## Key APIs

- [LLMAdapter](../apis/llm-adapter.md): The primary interface defining the contract for an LLM provider. It specifies methods for querying the model, streaming responses, and accessing model metadata.
- [BaseLLMAdapter](../apis/base-llm-adapter.md): The abstract base class that developers extend to create new LLM integrations. It simplifies adapter creation by providing default implementations for most methods, requiring only the `complete()` method and model-specific properties to be defined [Source 1].
- [StreamingChatModel](../apis/streaming-chat-model.md): An interface, implemented by [BaseLLMAdapter](../apis/base-llm-adapter.md), that defines the contract for models supporting streaming responses.
- [LLMQueryParams](../apis/llm-query-params.md): A type defining the parameters for a query to the LLM, including the list of [LLMMessages](../apis/llm-message.md), tools, and other model-specific settings.
- [LLMResponse](../apis/llm-response.md): A type representing the structured response from an LLM call, which may include a message, tool calls, or errors.
- [LLMMessage](../apis/llm-message.md): A type representing a single message within a conversation, with roles such as `system`, `user`, or `assistant`.
- [estimateTokens](../apis/estimate-tokens.md): A utility function used to estimate the number of tokens a given string or set of messages will consume.

## Extension Points

The primary method for extending the LLM System is to create a new LLM adapter. This is accomplished by creating a new class that extends [BaseLLMAdapter](../apis/base-llm-adapter.md). A developer must:
1.  Implement the abstract `complete(params)` method, which contains the logic for making the actual API call to the target LLM.
2.  Provide implementations for the readonly properties: `model`, `contextWindowTokens`, and `maxOutputTokens`.
3.  Call `super(name)` in the constructor with a unique name for the adapter plugin.
4.  Optionally, provide a custom, more efficient implementation of the `stream(params)` method to support server-sent events (SSE), overriding the default fallback [Source 1].

## Sources

[Source 1]: src/models/base.ts