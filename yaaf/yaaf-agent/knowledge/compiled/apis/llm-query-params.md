---
summary: Type definition for parameters passed to LLM query methods.
export_name: LLMQueryParams
source_file: src/plugin/types.js
category: type
title: LLMQueryParams
entity_type: api
search_terms:
 - LLM input parameters
 - model query arguments
 - how to pass messages to LLM
 - LLMAdapter query type
 - BaseLLMAdapter complete method params
 - LLM function call parameters
 - tool use arguments
 - chat completion request type
 - LLM streaming parameters
 - model configuration for query
 - what to pass to query method
 - LLM request structure
stub: false
compiled_at: 2026-04-24T17:18:36.057Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`[[[[[[[[LLM]]]]]]]]QueryParams` is a TypeScript type that defines the standard structure for parameters passed to methods that interact with a large language model. It serves as a consistent interface for all LLM adapter plugins, ensuring that core framework components can query different models in a provider-agnostic way.

This type is used as the input for key methods on the `LLMAdapter` interface and its implementations, such as `BaseLLMAdapter`. These methods include `query()`, `complete()`, and `stream()` [Source 1]. By standardizing the query parameters, `LLMQueryParams` encapsulates all necessary information for an [LLM Call](../concepts/llm-call.md), such as the message history, model-specific settings, and any [Tools](../subsystems/tools.md) the model can use.

## Signature

The `LLMQueryParams` type is imported from `src/plugin/types.js` [Source 1]. While the source material does not provide its detailed definition, it is used as the sole parameter in the primary methods of the `LLMAdapter` interface.

A conceptual usage in a method signature is as follows:

```typescript
import type { LLMQueryParams, LLMResponse } from 'yaaf';

interface LLMAdapter {
  // ... other properties and methods
  query(params: LLMQueryParams): Promise<LLMResponse>;
  complete(params: LLMQueryParams): Promise<LLMResponse>;
  stream(params: LLMQueryParams): AsyncGenerator<any, void, unknown>;
}
```

## Examples

The following example demonstrates how a custom `LLMAdapter` implementation would use the `LLMQueryParams` type as part of its method signature, fulfilling the `LLMAdapter` contract.

```typescript
import { BaseLLMAdapter } from 'yaaf';
import type { LLMQueryParams, LLMResponse, LLMMessage } from 'yaaf';

// A simplified, hypothetical adapter for a custom LLM provider.
class MyCustomLLMAdapter extends BaseLLMAdapter {
  public readonly model = 'my-custom-model-v1';
  public readonly contextWindowTokens = 8192;
  public readonly maxOutputTokens = 2048;

  constructor() {
    super('my-custom-llm-adapter');
  }

  /**
   * The core method that sends a request to the LLM provider.
   * It receives all necessary information in the `params` object.
   */
  public async complete(params: LLMQueryParams): Promise<LLMResponse> {
    console.log(`Sending request for model: ${this.model}`);
    console.log('Messages:', params.messages);
    console.log('Tools available:', params.tools?.map(t => t.name));

    // In a real implementation, this would make an API call
    // to the LLM provider using the data from `params`.
    const responseMessage: LLMMessage = {
      role: 'assistant',
      content: 'This is a response from my custom model.',
    };

    return {
      message: responseMessage,
      usage: {
        promptTokens: 100, // dummy values
        completionTokens: 20,
        totalTokens: 120,
      },
    };
  }
}
```

## Sources

[Source 1]: src/models/base.ts