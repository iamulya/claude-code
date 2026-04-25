---
summary: The subsystem responsible for integrating with various Large Language Models, providing a unified API for interaction.
primary_files:
 - src/models/base.ts
 - src/plugin/types.js
title: LLM Adapters
entity_type: subsystem
exports:
 - BaseLLMAdapter
search_terms:
 - connecting to LLMs
 - LLM provider integration
 - how to add a new model
 - model adapter pattern
 - BaseLLMAdapter class
 - unified LLM interface
 - querying language models
 - streaming LLM responses
 - LLM health check
 - token estimation
 - YAAF model support
 - complete() method
 - stream() method
stub: false
compiled_at: 2026-04-24T18:16:19.124Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [LLM](../concepts/llm.md) Adapters subsystem provides a standardized, provider-agnostic interface for interacting with various Large Language Models (LLMs). It abstracts the unique APIs and requirements of different LLM providers, allowing the core YAAF agent logic to communicate with any supported model through a single, consistent API. This simplifies the process of adding support for new models and switching between them.

## Architecture

The central component of this subsystem is the `BaseLLMAdapter` abstract class [Source 1]. This class serves as the foundation for all concrete LLM adapter implementations. By inheriting from `PluginBase`, LLM adapters are treated as standard plugins within the YAAF framework [Source 1].

`BaseLLMAdapter` provides shared implementations for common functionalities such as `query()`, `summarize()`, `estimateTokens()`, and `healthCheck()`. These methods are implemented in terms of a core abstract method, `complete()`, which must be implemented by each specific adapter subclass [Source 1].

A concrete LLM adapter subclass is responsible for:
- Implementing the `complete(params)` method to handle the full API call to the target LLM, including support for [Tools](./tools.md) [Source 1].
- Optionally providing a custom implementation for `stream(params)` to handle Server-Sent Events (SSE) [Streaming](../concepts/streaming.md). A default fallback implementation is provided by the base class [Source 1].
- Defining read-only properties specific to the model: `model` (the model identifier string), `contextWindowTokens`, and `maxOutputTokens` [Source 1].
- Implementing a constructor that calls `super(name)` with a unique name for the plugin [Source 1].

## Key APIs

The primary public API of this subsystem is the interface defined by the `BaseLLMAdapter` class.

- **`BaseLLMAdapter`**: An abstract class that all model adapters must extend. It provides the core contract for LLM interaction [Source 1].
- **`complete(params: LLMQueryParams): Promise<LLMResponse>`**: The fundamental method that subclasses must implement to execute a full, non-streaming call to the LLM provider [Source 1].
- **`stream(params: LLMQueryParams)`**: An optional method for initiating a streaming response from the LLM [Source 1].
- **`query()`**: A high-level convenience method for simple requests, built on top of `complete()` [Source 1].
- **`summarize()`**: A convenience method for text summarization [Source 1].
- **`estimateTokens()`**: A utility method to estimate the number of tokens for a given text, using functionality from `src/utils/tokens.js` [Source 1].
- **`healthCheck()`**: A method to verify that the adapter can successfully communicate with the underlying LLM service [Source 1].

The subsystem also relies on several key type definitions from `src/plugin/types.js`, including `LLMAdapter`, `LLMQueryParams`, `LLMResponse`, and `LLMMessage` [Source 1].

## Extension Points

The primary mechanism for extending this subsystem is to create a new class that inherits from `BaseLLMAdapter`. To add support for a new LLM or provider, a developer must create a new adapter class, implement the required abstract methods and properties, and register it as a plugin within the YAAF agent [Source 1].

## Sources

[Source 1]: src/models/base.ts