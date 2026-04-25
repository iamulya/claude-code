---
title: AnthropicModelConfig
entity_type: api
summary: A type alias for the configuration options required to instantiate an AnthropicChatModel.
export_name: AnthropicModelConfig
source_file: src/models/anthropic.ts
category: type
search_terms:
 - anthropic claude config
 - claude model settings
 - ANTHROPIC_API_KEY
 - configure anthropic model
 - AnthropicChatModel options
 - how to use claude api
 - yaaf anthropic integration
 - model parameters for claude
 - sonnet opus haiku config
 - anthropic sdk setup
stub: false
compiled_at: 2026-04-25T00:04:30.479Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
compiled_from_quality: unknown
confidence: 0.7
---

## Overview

`AnthropicModelConfig` is a TypeScript type that defines the configuration object for the [AnthropicChatModel](./anthropic-chat-model.md) class. This object contains all the necessary parameters to connect to and interact with the Anthropic API, such as the API key and the specific model to be used (e.g., `claude-3-opus-20240229`).

The [resolveModel](./resolve-model.md) function can automatically create an [AnthropicChatModel](./anthropic-chat-model.md) instance by detecting the `ANTHROPIC_API_KEY` environment variable, which populates the corresponding field in this configuration object [Source 1].

## Signature

The provided source material does not include the definition of the `AnthropicModelConfig` type. It is imported from `src/models/anthropic.ts` but its structure is not detailed [Source 1]. Based on its usage with the [AnthropicChatModel](./anthropic-chat-model.md) and the behavior of [resolveModel](./resolve-model.md), it can be inferred to contain properties such as `apiKey` and `model`.

```typescript
// Imported from 'src/models/anthropic.ts'
// The full definition is not available in the provided source.
export type AnthropicModelConfig = {
  apiKey?: string;
  model?: string;
  // ... other Anthropic-specific options
};
```

## Examples

### Manual Configuration

This example shows how to manually create a configuration object and instantiate an [AnthropicChatModel](./anthropic-chat-model.md).

```typescript
import { AnthropicChatModel, type AnthropicModelConfig } from 'yaaf';

const config: AnthropicModelConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-sonnet-20240229',
  // Other parameters like temperature, top_p, etc. would go here.
};

const anthropicModel = new AnthropicChatModel(config);
```

## See Also

-   [AnthropicChatModel](./anthropic-chat-model.md): The chat model class that uses this configuration.
-   [resolveModel](./resolve-model.md): A factory function that can automatically create an [AnthropicChatModel](./anthropic-chat-model.md) from environment variables.

## Sources

[Source 1]: src/models/resolver.ts