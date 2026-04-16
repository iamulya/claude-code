---
title: BaseLLMAdapter
entity_type: api
summary: Abstract base class for all YAAF LLM adapter implementations, providing shared logic for querying, summarization, and token estimation.
export_name: BaseLLMAdapter
source_file: src/models/base.ts
category: class
stub: false
compiled_at: 2026-04-16T14:30:49.246Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/base.ts
confidence: 0.98
---

## Overview
`BaseLLMAdapter` is the foundational abstract class for all Large Language Model (LLM) integrations within the YAAF framework. It extends the plugin system to provide a standardized interface for interacting with different model providers (such as OpenAI, Anthropic, or local runners).

The class implements the boilerplate logic for common operations like `query()`, `summarize()`, and `estimateTokens()`, allowing developers to create new provider adapters by implementing a single core `complete()` method and defining model constraints.

## Signature / Constructor

```typescript
export abstract class BaseLLMAdapter extends PluginBase implements LLMAdapter, StreamingChatModel {
  protected constructor(name: string);
}
```

### Parameters
- `name`: A unique string identifier for the plugin instance, passed to the `PluginBase` constructor.

## Methods & Properties

### Abstract Properties
Subclasses must define these properties to describe the specific model's capabilities:
- `readonly model: string`: The unique identifier for the model (e.g., "gpt-4o").
- `readonly contextWindowTokens: number`: The maximum number of tokens the model can process in a single context window.
- `readonly maxOutputTokens: number`: The maximum number of tokens the model can generate in a single response.

### Abstract Methods
- `abstract complete(params: LLMQueryParams): Promise<LLMResponse>`: The primary implementation of the LLM call, including support for tool/function calling.
- `abstract stream(params: LLMQueryParams): AsyncIterable<LLMResponse>`: Implementation for Server-Sent Events (SSE) streaming. While abstract in the interface, the base class may provide a default fallback.

### Shared Methods
These methods provide default implementations used by the framework:
- `query(params: LLMQueryParams): Promise<LLMResponse>`: Executes a standard completion request using the underlying `complete()` implementation.
- `summarize(text: string, options?: any): Promise<string>`: A convenience method that wraps `query()` to generate a summary of the provided text.
- `estimateTokens(messages: LLMMessage[]): number`: Calculates the approximate token count for a set of messages using internal utility functions.
- `healthCheck(): Promise<boolean>`: Validates the connectivity and availability of the LLM provider.

## Examples

### Implementing a Custom Adapter
The following example demonstrates how to extend `BaseLLMAdapter` to create a minimal provider integration.

```typescript
import { BaseLLMAdapter, LLMQueryParams, LLMResponse } from 'yaaf';

export class MyCustomProvider extends BaseLLMAdapter {
  readonly model = "my-custom-model-v1";
  readonly contextWindowTokens = 8192;
  readonly maxOutputTokens = 2048;

  constructor() {
    super('my-custom-provider-plugin');
  }

  async complete(params: LLMQueryParams): Promise<LLMResponse> {
    // Implementation for calling the specific provider API
    const response = await fetch('https://api.myprovider.ai/v1/chat', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  async *stream(params: LLMQueryParams): AsyncIterable<LLMResponse> {
    // Implementation for streaming responses
  }
}
```

## See Also
- `PluginBase`
- `LLMAdapter`
- `LLMQueryParams`