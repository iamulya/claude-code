---
title: AnthropicModelConfig
entity_type: api
summary: Configuration options for the AnthropicChatModel, including API keys, model versions, and token limits.
export_name: AnthropicModelConfig
source_file: src/models/anthropic.ts
category: type
stub: false
compiled_at: 2026-04-16T14:30:39.825Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/anthropic.ts
confidence: 1
---

## Overview
`AnthropicModelConfig` is a TypeScript type that defines the configuration parameters for the Anthropic model adapter within YAAF. It is used to initialize the `AnthropicChatModel` and provides the necessary credentials, model selection, and execution constraints required to interact with the Anthropic Messages API.

The configuration supports all Claude model families, including Claude 3, 3.5, and 3.7.

## Signature
```typescript
export type AnthropicModelConfig = {
  /** Anthropic API key */
  apiKey: string
  /** Model name (default: claude-sonnet-4) */
  model?: string
  /**
   * API version header (default: '2023-06-01').
   * Only change this if Anthropic releases a new stable version.
   */
  apiVersion?: string
  /** Request timeout in ms (default: 120_000 — Claude can be slow on long tasks) */
  timeoutMs?: number
  /** Extra headers sent with every request */
  headers?: Record<string, string>
  /** Context window size in tokens (auto-resolved from registry if omitted) */
  contextWindowTokens?: number
  /** Maximum output tokens per completion (auto-resolved from registry if omitted) */
  maxOutputTokens?: number
}
```

## Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | The API key used for authentication via the `x-api-key` header. |
| `model` | `string` | (Optional) The identifier of the model to use. Defaults to `claude-sonnet-4`. |
| `apiVersion` | `string` | (Optional) The value for the `anthropic-version` header. Defaults to `2023-06-01`. |
| `timeoutMs` | `number` | (Optional) The request timeout in milliseconds. Defaults to `120,000` to accommodate long-running Claude tasks. |
| `headers` | `Record<string, string>` | (Optional) Additional HTTP headers to include in every request to the Anthropic API. |
| `contextWindowTokens` | `number` | (Optional) The total token limit for the context window. If not provided, YAAF attempts to resolve this from its internal model registry. |
| `maxOutputTokens` | `number` | (Optional) The maximum number of tokens allowed in the generated response. If not provided, YAAF attempts to resolve this from its internal model registry. |

## Examples

### Basic Configuration
```typescript
import { AnthropicChatModel } from './src/models/anthropic.ts';

const config: AnthropicModelConfig = {
  apiKey: 'your-api-key-here',
  model: 'claude-3-5-sonnet-20240620'
};

const model = new AnthropicChatModel(config);
```

### Advanced Configuration with Timeouts
```typescript
const config: AnthropicModelConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-opus-20240229',
  timeoutMs: 180_000, // Extended timeout for complex reasoning
  maxOutputTokens: 4096
};
```