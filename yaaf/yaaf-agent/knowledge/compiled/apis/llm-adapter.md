---
summary: Interface defining the contract for all YAAF LLM adapter implementations.
export_name: LLMAdapter
source_file: src/plugin/types.js
category: interface
title: LLMAdapter
entity_type: api
search_terms:
 - LLM provider integration
 - how to add a new LLM
 - model adapter contract
 - OpenAI adapter
 - Anthropic adapter
 - LLM interface
 - connecting to language models
 - model abstraction layer
 - LLM query interface
 - complete method
 - stream method
 - BaseLLMAdapter
 - custom LLM implementation
stub: false
compiled_at: 2026-04-24T17:18:10.850Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[LLM]]]]]]]]Adapter` interface is the core contract for integrating Large Language Models (LLMs) into the YAAF framework. It defines a standardized set of methods and properties that any class must implement to act as a bridge to an external LLM provider, such as OpenAI, Anthropic, or a local model server.

By conforming to this interface, different LLM providers become interchangeable within the framework, allowing agents to switch models without changing their core logic.

While one can implement this interface directly, the recommended approach is to extend the `BaseLLMAdapter` abstract class, which provides default implementations for several methods, simplifying the creation of new adapters [Source 1].

## Signature

`LLMAdapter` is a TypeScript interface. Its structure can be inferred from the `BaseLLMAdapter` class which implements it [Source 1].

```typescript
import type { LLMQueryParams, LLMResponse, LLMMessage } from "./types.js";
import type { Plugin } from "./base.js";

export interface LLMAdapter extends Plugin {
  /**
   * The unique identifier for the specific model being used (e.g., "gpt-4-turbo").
   */
  readonly model: string;

  /**
   * The maximum number of tokens the model can process in a single context (input + output).
   */
  readonly contextWindowTokens: number;

  /**
   * The maximum number of tokens the model can generate in a single response.
   */
  readonly maxOutputTokens: number;

  /**
   * The primary method for making a full-featured call to the LLM,
   * supporting complex parameters like [[[[[[[[Tools]]]]]]]] and system prompts.
   */
  complete(params: LLMQueryParams): Promise<LLMResponse>;

  /**
   * Performs a [[[[[[[[Streaming]]]]]]]] chat completion, yielding chunks of the response as they
   * become available.
   */
  stream(params: LLMQueryParams): AsyncIterable<any>; // The chunk type may vary

  /**
   * A simplified method for basic chat-like queries.
   */
  query(messages: LLMMessage[]): Promise<LLMResponse>;

  /**
   * A utility method to summarize a given block of text.
   */
  summarize(text: string): Promise<string>;

  /**
   * Estimates the number of tokens a given string or set of messages would consume.
   */
  estimateTokens(content: string | LLMMessage[]): Promise<number>;

  /**
   * Checks the health and connectivity of the connection to the LLM provider.
   */
  healthCheck(): Promise<{ ok: boolean; details?: any }>;
}
```

## Methods & Properties

### Properties

*   **`model: string`** (readonly)
    The unique identifier for the LLM, such as `gpt-4o` or `claude-3-opus-20240229`. This is used for logging and identification. [Source 1]

*   **`contextWindowTokens: number`** (readonly)
    The maximum number of tokens the model can accept in its [Context Window](../concepts/context-window.md) (including both input prompts and generated output). [Source 1]

*   **`maxOutputTokens: number`** (readonly)
    The maximum number of tokens the model can generate in a single completion. [Source 1]

### Methods

*   **`complete(params: LLMQueryParams): Promise<LLMResponse>`**
    The core method for interacting with the LLM. It takes a comprehensive set of parameters, including messages, Tools, and other model-specific options, and returns the full response. This is the primary method that custom adapters must implement. [Source 1]

*   **`stream(params: LLMQueryParams): AsyncIterable<any>`**
    Initiates a Streaming connection to the LLM, typically for Server-Sent Events (SSE). This allows for processing the model's output token by token as it is generated. `BaseLLMAdapter` provides a default fallback implementation if this is not overridden. [Source 1]

*   **`query(messages: LLMMessage[]): Promise<LLMResponse>`**
    A convenience method for simpler, non-streaming chat interactions. `BaseLLMAdapter` implements this by calling `complete`. [Source 1]

*   **`summarize(text: string): Promise<string>`**
    A utility method for text summarization. `BaseLLMAdapter` implements this by calling `complete` with a predefined summarization prompt. [Source 1]

*   **`estimateTokens(content: string | LLMMessage[]): Promise<number>`**
    Calculates the token count for a given string or list of messages according to the model's [tokenization](../concepts/tokenization.md) scheme. `BaseLLMAdapter` provides a shared implementation. [Source 1]

*   **`healthCheck(): Promise<{ ok: boolean; details?: any }>`**
    Performs a check to ensure the adapter is correctly configured and can communicate with the LLM provider's API. `BaseLLMAdapter` provides a shared implementation. [Source 1]

## Examples

The following example shows the skeleton of a custom LLM adapter created by extending `BaseLLMAdapter`, which implements the `LLMAdapter` interface. The developer only needs to provide the constructor, required properties, and the `complete` method.

```typescript
import { BaseLLMAdapter } from 'yaaf/models';
import type { LLMQueryParams, LLMResponse } from 'yaaf/plugin';

// A fictional client for "My Custom LLM"
import { MyCustomLLMClient } from './my-custom-llm-client';

class MyCustomLLMAdapter extends BaseLLMAdapter {
  // Required properties from the LLMAdapter interface
  public readonly model = 'my-custom-model-v1';
  public readonly contextWindowTokens = 8192;
  public readonly maxOutputTokens = 2048;

  private readonly client: MyCustomLLMClient;

  constructor(apiKey: string) {
    // The name passed to super() is a unique plugin identifier
    super('my-custom-llm-adapter');
    this.client = new MyCustomLLMClient({ apiKey });
  }

  // The core method that must be implemented
  public async complete(params: LLMQueryParams): Promise<LLMResponse> {
    // 1. Translate YAAF's LLMQueryParams into the format
    //    expected by the custom LLM's SDK.
    const providerRequest = this.transformRequest(params);

    // 2. Call the provider's API.
    const providerResponse = await this.client.createCompletion(providerRequest);

    // 3. Translate the provider's response back into YAAF's
    //    standard LLMResponse format.
    const yaafResponse = this.transformResponse(providerResponse);

    return yaafResponse;
  }

  // Private helper methods for transformation logic
  private transformRequest(params: LLMQueryParams) { /* ... */ }
  private transformResponse(response: any): LLMResponse { /* ... */ }
}
```

## See Also

*   `BaseLLMAdapter`: The recommended abstract base class for creating custom [LLM Adapters](../subsystems/llm-adapters.md). It provides default implementations for many of the methods in the `LLMAdapter` interface.

## Sources

*   [Source 1] `src/models/base.ts`