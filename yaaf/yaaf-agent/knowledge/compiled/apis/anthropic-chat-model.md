---
summary: A ChatModel implementation for interacting with Anthropic Claude LLMs.
export_name: AnthropicChatModel
source_file: src/models/anthropic.js
category: class
title: AnthropicChatModel
entity_type: api
search_terms:
 - Anthropic Claude integration
 - how to use Claude models
 - Claude API key
 - ANTHROPIC_API_KEY environment variable
 - YAAF Claude support
 - connect to Anthropic
 - Claude 3 Opus
 - Claude 3 Sonnet
 - Claude 3 Haiku
 - ChatModel for Claude
 - LLM provider Anthropic
 - using Claude with YAAF
stub: false
compiled_at: 2026-04-25T00:04:21.753Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`AnthropicChatModel` is the concrete class that implements the `[[ChatModel]]` interface for interacting with Anthropic's Claude family of [LLMs](../concepts/llm.md). It handles the specifics of communicating with the Anthropic API, using its native SDK [Source 1].

Within the YAAF framework, this model is typically not instantiated directly. Instead, it is automatically selected and configured by the `resolveModel` function when the `ANTHROPIC_API_KEY` environment variable is present. This allows for seamless switching between different [LLM](../concepts/llm.md) providers without changing application code [Source 1].

## Signature / Constructor

`AnthropicChatModel` is a class that implements the `[[ChatModel]]` interface. It is configured using an `[[AnthropicModelConfig]]` object.

```typescript
import type { ChatModel } from '../agents/runner.js';
import type { AnthropicModelConfig } from './anthropic.js';

class AnthropicChatModel implements ChatModel {
  constructor(config: AnthropicModelConfig) {
    // ... implementation
  }

  // ... ChatModel interface methods
}
```

The configuration, including the API key and model name, is typically derived from environment variables by the framework's model resolver [Source 1].

## Examples

### Configuration via Environment Variables

The most common way to use `AnthropicChatModel` is to configure it via environment variables. The YAAF agent's model resolver will automatically detect the `ANTHROPIC_API_KEY` and instantiate the class. The `LLM_MODEL` variable can be used to specify a particular Claude model [Source 1].

```typescript
// Set environment variables before running the application
// For example, in your .env file or shell:
//
// ANTHROPIC_API_KEY="sk-ant-..."
// LLM_MODEL="claude-3-sonnet-20240229"

import { resolveModel } from './models/resolver.js';
import type { AgentConfig } from './config.js';

// An empty config is sufficient if env vars are set
const config: AgentConfig = {};

// The resolver will return an instance of AnthropicChatModel
const chatModel = resolveModel(config);

// Now the model can be used in an agent
// const agent = new Agent({ chatModel, ... });
```

## See Also

- [ChatModel](./chat-model.md): The interface that `AnthropicChatModel` implements.
- [AnthropicModelConfig](./anthropic-model-config.md): The configuration object for this class.
- [LLM](../concepts/llm.md): The high-level concept of a Large Language Model.

## Sources

[Source 1]: src/models/resolver.ts