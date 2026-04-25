---
summary: Abstract base class for all YAAF LLM adapter implementations, providing common methods and requiring subclasses to implement core LLM interaction logic.
export_name: BaseLLMAdapter
source_file: src/models/base.ts
category: class
title: BaseLLMAdapter
entity_type: api
search_terms:
 - LLM adapter base class
 - create new LLM provider
 - how to add a new model
 - implementing LLMAdapter
 - abstract model adapter
 - YAAF model integration
 - LLM provider abstraction
 - complete method implementation
 - stream method implementation
 - model plugin base
 - shared LLM logic
 - custom LLM integration
stub: false
compiled_at: 2026-04-24T16:52:24.900Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`Base[[[[[[[[LLM]]]]]]]]Adapter` is an abstract class that serves as the foundation for all Large Language Model (LLM) adapters within the YAAF framework [Source 1]. It is designed to simplify the process of integrating new LLM providers by providing a common structure and shared implementations for several standard methods.

Developers creating a new LLM adapter should extend this class. By doing so, they inherit default implementations for methods like `query()`, `summarize()`, `estimateTokens()`, and `healthCheck()`. These shared methods are implemented in terms of the core abstract methods and properties that the subclass must provide, such as `complete()` and `model` details [Source 1]. This approach ensures a consistent API across all adapters while centralizing common logic.

## Signature / Constructor

The class is defined as an abstract class that extends `PluginBase` and implements the `LLMAdapter` and `[[[[[[[[Streaming]]]]]]]]ChatModel` interfaces.

```typescript
import { PluginBase } from "../plugin/base.js";
import type { LLMAdapter, StreamingChatModel } from "../plugin/types.js";

export abstract class BaseLLMAdapter extends PluginBase implements LLMAdapter, StreamingChatModel {
  // ...
}
```

The constructor of any subclass must call `super(name)` with a unique string identifier for the plugin [Source 1].

## Methods & Properties

Subclasses of `BaseLLMAdapter` are required to implement a set of abstract properties and methods. The base class provides several concrete methods that rely on these implementations.

### Abstract Members (to be implemented by subclass)

These must be implemented by any class that extends `BaseLLMAdapter` [Source 1].

*   **`readonly model: string`**
    The unique identifier for the specific LLM model being used (e.g., `gpt-4-turbo`).

*   **`readonly contextWindowTokens: number`**
    The maximum number of tokens the model can accept in its [Context Window](../concepts/context-window.md).

*   **`readonly maxOutputTokens: number`**
    The maximum number of tokens the model can generate in a single response.

*   **`complete(params: LLMQueryParams): Promise<LLMResponse>`**
    The core method for making a full, non-Streaming call to the LLM. It should handle all aspects of the API request, including tool support.

*   **`stream(params: LLMQueryParams): AsyncIterable<LLMResponse>`**
    An optional method for handling Server-Sent Events (SSE) streaming from the LLM. `BaseLLMAdapter` provides a default fallback implementation if this is not overridden [Source 1].

### Concrete Members (provided by `BaseLLMAdapter`)

These methods are implemented in the base class and are available to all subclasses. Their logic is expressed in terms of the abstract `complete()` method [Source 1].

*   `query()`
*   `summarize()`
*   `estimateTokens()`
*   `healthCheck()`

## Examples

The following example shows the basic structure of a custom LLM adapter created by extending `BaseLLMAdapter`.

```typescript
import { 
  BaseLLMAdapter, 
  LLMQueryParams, 
  LLMResponse 
} from 'yaaf';

// A conceptual example of a custom LLM adapter.
class MyCustomLLMAdapter extends BaseLLMAdapter {
  // Required properties providing model metadata.
  readonly model: string = 'my-custom-model-v1';
  readonly contextWindowTokens: number = 8192;
  readonly maxOutputTokens: number = 2048;

  constructor() {
    // Provide a unique name for this plugin via super().
    super('my-custom-llm-adapter');
  }

  // Required implementation for the core LLM call.
  async complete(params: LLMQueryParams): Promise<LLMResponse> {
    // In a real implementation, this would contain the logic
    // to call the custom LLM's API endpoint with the provided
    // messages, tools, and other parameters.
    console.log(`Calling ${this.model} with params:`, params);
    // ... API call logic ...
    
    // Return a response conforming to the LLMResponse type.
    return {
      role: 'assistant',
      content: 'This is a response from my custom model.',
    };
  }

  // Optionally, override the stream method for native streaming support.
  async *stream(params: LLMQueryParams): AsyncIterable<LLMResponse> {
    // Implementation for streaming responses from the custom LLM API.
    // ...
  }
}
```

## Sources

[Source 1] src/models/base.ts