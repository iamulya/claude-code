---
title: LLMClientOptions
entity_type: api
summary: Configuration options for KB LLM clients, allowing overrides for API keys, models, and providers.
export_name: LLMClientOptions
source_file: src/knowledge/compiler/llmClient.ts
category: type
stub: false
compiled_at: 2026-04-16T14:25:58.831Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/llmClient.ts
confidence: 1
---

## Overview
`LLMClientOptions` is a configuration object used to initialize LLM clients within the YAAF knowledge base compiler. It provides a mechanism to explicitly define the provider, model, and authentication credentials, overriding the framework's default behavior of auto-detecting these values from environment variables.

This type is primarily used as an argument for factory functions such as `makeKBLLMClient`, `makeKBVisionClient`, and `autoDetectKBClients`.

## Signature
```typescript
export type LLMClientOptions = {
  /** Override API key (auto-detected from env if omitted) */
  apiKey?: string
  /** Override model (auto-detected from provider if omitted) */
  model?: string
  /** Override provider (auto-detected from env if omitted) */
  provider?: 'gemini' | 'openai' | 'anthropic'
}
```

## Methods & Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | (Optional) The API key for the LLM provider. If omitted, the client attempts to resolve the key from environment variables. |
| `model` | `string` | (Optional) The specific model identifier to use. If omitted, the client uses a default model associated with the provider. |
| `provider` | `'gemini' \| 'openai' \| 'anthropic'` | (Optional) The LLM service provider. If omitted, the client attempts to auto-detect the provider based on available environment variables. |

## Examples

### Explicit Configuration
This example demonstrates passing explicit options to create a text-based LLM client.

```typescript
import { makeKBLLMClient, LLMClientOptions } from 'yaaf';

const options: LLMClientOptions = {
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'sk-...'
};

const llm = makeKBLLMClient(options);
const response = await llm({ 
  system: 'You are a helpful assistant.', 
  user: 'Explain LLMClientOptions.' 
});
```

### Partial Configuration
When only specific fields are provided, the framework fills in the remaining details via auto-detection.

```typescript
import { autoDetectKBClients } from 'yaaf';

// Only override the model, let the provider and API key be detected from ENV
const clients = autoDetectKBClients({
  model: 'claude-3-5-sonnet-20240620'
});
```

## See Also
- `makeKBLLMClient`
- `makeKBVisionClient`
- `autoDetectKBClients`