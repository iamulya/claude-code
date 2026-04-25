---
summary: Provides utilities for creating and managing LLM (Large Language Model) clients, supporting both text and vision capabilities with auto-detection of providers.
primary_files:
 - src/knowledge/compiler/llmClient.ts
title: LLM Client System
entity_type: subsystem
exports:
 - LLMCallFn
 - VisionCallFn
 - LLMClientOptions
 - makeKBLLMClient
 - makeKBVisionClient
 - autoDetectKBClients
search_terms:
 - connect to LLM
 - LLM provider integration
 - OpenAI client
 - Anthropic client
 - Gemini client
 - vision model API
 - multimodal LLM call
 - auto-detect API key
 - how to call a large language model
 - text generation function
 - image prompt function
 - YAAF LLM configuration
stub: false
compiled_at: 2026-04-24T18:16:44.844Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [LLM](../concepts/llm.md) Client System provides a standardized, provider-agnostic interface for interacting with Large Language Models (LLMs) [Source 1]. Its primary purpose is to abstract the complexities of different LLM provider APIs (such as Gemini, OpenAI, and Anthropic) into simple, unified functions for both text-only and vision-capable interactions. This allows other parts of the YAAF framework, such as the "Phase C" features for [Heal](../concepts/heal.md)ing, [Discovery](../concepts/discovery.md), and vision, to perform [LLM Call](../concepts/llm-call.md)s without being coupled to a specific provider's implementation [Source 1]. The system also simplifies setup by auto-detecting providers and API keys from environment variables [Source 1].

## Architecture

The subsystem is architected around a set of factory functions that produce standardized call functions. The core components are:

*   **`LLMClientOptions`**: A configuration object that allows developers to explicitly specify the `apiKey`, `model`, and `provider`. If these options are omitted, the system attempts to auto-detect them from the environment [Source 1].
*   **Factory Functions**: `makeKBLLMClient` and `makeKBVisionClient` are the primary functions for creating LLM clients. They accept an `LLMClientOptions` object and return a function that conforms to a standard signature [Source 1].
*   **Call Functions**: The factory functions produce one of two types of call functions:
    *   `LLMCallFn`: A simple text-in, text-out function for standard LLM queries [Source 1].
    *   `VisionCallFn`: A function that accepts a text prompt along with a base64-encoded image and its MIME type for multimodal queries [Source 1].
*   **Provider Support**: The system is designed to support multiple LLM providers, specifically "gemini", "openai", and "anthropic" [Source 1].
*   **Fallback Mechanism**: The `makeKBVisionClient` function includes a fallback mechanism. If the selected provider does not natively support vision capabilities, it will return a text-only client instead [Source 1].
*   **Auto-detection**: The `autoDetectKBClients` utility function attempts to create both text and vision clients, returning `null` if no API key can be found in the environment [Source 1].

## Integration Points

The call functions produced by this subsystem are intended for use by other internal YAAF systems. The source material explicitly notes that the `LLMCallFn` is used for "[Phase C features](../concepts/phase-c-features.md) (Heal, discovery, vision)" within the framework [Source 1]. Any component requiring interaction with an external LLM can use this system to obtain a configured client function.

## Key APIs

The primary public APIs exposed by this subsystem are types and factory functions for creating LLM clients [Source 1].

*   **`LLMCallFn`**: A type definition for a function that performs a text-only LLM Call. It accepts an object with `system` and `user` prompts and returns a `Promise<string>`.
*   **`VisionCallFn`**: A type definition for a function that performs a vision-capable LLM call. It accepts `system` and `user` prompts, along with `imageBase64` and `imageMimeType` for the image data.
*   **`LLMClientOptions`**: An interface for the configuration object used to create clients. It allows overriding the `apiKey`, `model`, and `provider`.
*   **`makeKBLLMClient(options?: LLMClientOptions)`**: A factory function that returns a text-only `LLMCallFn`. It auto-detects the provider and API key if not specified in the options.
    ```typescript
    const llm = makeKBLLMClient()
    const answer = await llm({ system: 'You are a linter.', user: 'Fix this wikilink.' })
    ```
*   **`makeKBVisionClient(options?: LLMClientOptions)`**: A factory function that returns a `VisionCallFn`. It falls back to a text-only client if the provider does not support vision.
*   **`autoDetectKBClients(options?: LLMClientOptions)`**: A utility function that attempts to create and return both text and vision clients. It returns `null` if no API key can be found.

## Configuration

Configuration of the [LLM Client](../concepts/llm-client.md) System is handled through the `LLMClientOptions` object passed to the factory functions (`makeKBLLMClient`, `makeKBVisionClient`, `autoDetectKBClients`). The system follows a clear priority order:

1.  **Explicit Options**: Values provided directly in the `LLMClientOptions` object (`apiKey`, `model`, `provider`) will always be used [Source 1].
2.  **Environment Variables**: If options are not provided explicitly, the system will attempt to auto-detect the provider and corresponding API key from the process environment variables [Source 1].

This allows for flexible configuration, where developers can either hard-code credentials for specific use cases or rely on a more general environment-based setup for deployment.

## Sources

[Source 1]: src/knowledge/compiler/llmClient.ts