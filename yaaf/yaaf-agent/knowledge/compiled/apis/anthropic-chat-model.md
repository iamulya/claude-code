---
title: AnthropicChatModel
entity_type: api
summary: A provider-specific adapter for Anthropic's Claude models implementing the Messages API.
export_name: AnthropicChatModel
source_file: src/models/anthropic.ts
category: class
stub: false
compiled_at: 2026-04-16T14:30:32.700Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/anthropic.ts
confidence: 1
---

## Overview
`AnthropicChatModel` is a provider-specific adapter that enables YAAF agents to communicate with Anthropic's Claude series of models. It implements the Anthropic Messages API and supports both standard and streaming chat completions.

The class is designed to be lightweight and does not depend on external SDKs, utilizing the native `fetch` API for network requests. It handles the specific requirements of the Anthropic API, such as top-level system prompts, specific tool schema formats (`input_schema`), and specialized usage tracking including cache hits.

## Signature / Constructor

```typescript
export class AnthropicChatModel extends BaseLLMAdapter implements StreamingChatModel {
  constructor(config: AnthropicModelConfig);
}
```

### AnthropicModelConfig
The constructor accepts a configuration object with the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | **Required.** The Anthropic API key for authentication. |
| `model` | `string` | The model identifier (e.g., `claude-3-5-sonnet-20240620`). Defaults to `claude-sonnet-4`. |
| `apiVersion` | `string` | The `anthropic-version` header value. Defaults to `2023-06-01`. |
| `timeoutMs` | `number` | Request timeout in milliseconds. Defaults to `120,000`. |
| `headers` | `Record<string, string>` | Optional additional headers to include in requests. |
| `contextWindowTokens` | `number` | Maximum context window size. Auto-resolved from the registry if omitted. |
| `maxOutputTokens` | `number` | Maximum tokens allowed in the response. Auto-resolved from the registry if omitted. |

## Methods & Properties

### Implementation Details
`AnthropicChatModel` translates YAAF's internal representations into the Anthropic Messages format:
*   **Authentication**: Uses `x-api-key` and `anthropic-version` headers instead of Bearer tokens.
*   **System Prompts**: Automatically extracts system messages and passes them as a top-level `system` field in the API request.
*   **Tool Definitions**: Converts standard JSON Schema parameters into Anthropic's `input_schema` format.
*   **Tool Results**: Formats tool execution outputs as `tool_result` blocks within user messages.
*   **Usage Tracking**: Maps Anthropic's usage fields (`input_tokens`, `output_tokens`, and `cache_read_input_tokens`) to the framework's usage metrics.

## Examples

### Basic Initialization
```typescript
import { AnthropicChatModel } from 'yaaf';

const model = new AnthropicChatModel({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20240620'
});
```

### Usage within an Agent
```typescript
import { Agent, AnthropicChatModel } from 'yaaf';

const agent = new Agent({
  model: new AnthropicChatModel({
    apiKey: process.env.ANTHROPIC_API_KEY!
  })
});
```

## See Also
* [Anthropic Messages API Documentation](https://api.anthropic.com/v1/messages)