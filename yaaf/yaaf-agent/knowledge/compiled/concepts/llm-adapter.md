---
title: LLM Adapter
entity_type: concept
summary: A provider-agnostic abstraction layer that allows YAAF to communicate with different LLM providers using a unified interface.
related_subsystems:
  - Models
  - Plugins
stub: false
compiled_at: 2026-04-16T14:30:53.638Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/base.ts
confidence: 0.95
---

## What It Is
The LLM Adapter is a core abstraction in YAAF designed to decouple the framework's agent logic from specific Large Language Model (LLM) providers. By providing a unified interface, it allows developers to switch between different models—such as those from OpenAI, Anthropic, or local providers—without modifying the core agent implementation. This pattern ensures that YAAF remains provider-agnostic and production-grade by handling the nuances of different API signatures, token counting, and streaming capabilities behind a consistent contract.

## How It Works in YAAF
The primary implementation mechanism is the `BaseLLMAdapter` abstract class. This class serves as the shared base for all LLM adapter implementations within the framework. It extends `PluginBase`, meaning every LLM adapter in YAAF functions as a plugin, and it implements the `LLMAdapter` and `StreamingChatModel` interfaces.

The `BaseLLMAdapter` provides several high-level convenience methods that are used throughout the framework:
- `query()`: The standard interaction method for sending prompts and receiving responses.
- `summarize()`: Specialized logic for condensing text.
- `estimateTokens()`: Calculates the token count for a given input, typically delegating to internal utility functions.
- `healthCheck()`: Verifies the connectivity and availability of the underlying model provider.

These high-level methods are implemented in terms of a single abstract method, `complete()`, which subclasses must implement. This architecture ensures that adding support for a new provider only requires implementing the specific communication logic for that provider's API.

### Subclass Requirements
To create a functional adapter, a subclass must provide:
- **`complete(params)`**: The core logic for the LLM call, including support for tool/function calling.
- **`stream(params)`**: Support for Server-Sent Events (SSE) streaming (though the base class provides a default fallback).
- **`model`**: A read-only string identifier for the specific model.
- **`contextWindowTokens`**: The maximum number of tokens the model can handle in its context window.
- **`maxOutputTokens`**: The maximum number of tokens the model can generate in a single response.
- **`constructor`**: A call to the superclass constructor with a unique plugin name.

## Configuration
Developers implement specific adapters by extending `BaseLLMAdapter`. Configuration typically involves defining the model's technical limits and the specific API call logic.

```typescript
import { BaseLLMAdapter } from '../models/base.js';
import type { LLMQueryParams, LLMResponse } from '../plugin/types.js';

export class CustomProviderAdapter extends BaseLLMAdapter {
  readonly model = "custom-model-name";
  readonly contextWindowTokens = 128000;
  readonly maxOutputTokens = 4096;

  constructor() {
    // Initialize with a unique plugin name
    super('custom-provider-adapter');
  }

  async complete(params: LLMQueryParams): Promise<LLMResponse> {
    // Implementation of the provider-specific API call logic
    // This method is used by query(), summarize(), etc.
  }
}
```

## Sources
- `src/models/base.ts`