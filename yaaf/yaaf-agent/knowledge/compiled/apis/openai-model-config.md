---
title: OpenAIModelConfig
entity_type: api
summary: Configuration options for the OpenAIChatModel adapter, including API keys, base URLs, and model-specific settings.
export_name: OpenAIModelConfig
source_file: src/models/openai.ts
category: type
stub: false
compiled_at: 2026-04-16T14:31:15.011Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/openai.ts
confidence: 1
---

## Overview
`OpenAIModelConfig` defines the parameters required to initialize an OpenAI-compatible chat model adapter. It is used to manage authentication, endpoint routing, and model-specific behaviors such as token limits and reasoning effort. 

Because it targets the standard OpenAI Chat Completions API, this configuration is compatible with a wide range of providers beyond OpenAI, including Groq, Together AI, Fireworks, Perplexity, and local runtimes like Ollama, vLLM, or LiteLLM.

## Signature
```typescript
export type OpenAIModelConfig = {
  apiKey: string
  baseUrl?: string
  model?: string
  timeoutMs?: number
  headers?: Record<string, string>
  contextWindowTokens?: number
  maxOutputTokens?: number
  systemRole?: 'system' | 'developer'
  parallelToolCalls?: boolean
  reasoningEffort?: 'low' | 'medium' | 'high'
}
```

## Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | **Required.** The API key for authentication. For local providers (e.g., Ollama), this can be a placeholder string. |
| `baseUrl` | `string` | The base URL for the API. Defaults to `https://api.openai.com/v1`. |
| `model` | `string` | The specific model identifier to use. Defaults to `gpt-4o-mini`. |
| `timeoutMs` | `number` | Request timeout in milliseconds. Defaults to `60,000`. |
| `headers` | `Record<string, string>` | Extra HTTP headers to include with every request. |
| `contextWindowTokens` | `number` | The total context window size in tokens. Defaults to `128,000`. |
| `maxOutputTokens` | `number` | The maximum number of tokens allowed in a single completion. Defaults to `4,096`. |
| `systemRole` | `'system' \| 'developer'` | The role name used for system messages. `system` is the standard for most models. `developer` is required for OpenAI reasoning models (o1, o3, o4). If omitted, YAAF auto-detects this based on the model name. |
| `parallelToolCalls` | `boolean` | Whether to allow the model to call multiple tools in parallel. Defaults to `true`. |
| `reasoningEffort` | `'low' \| 'medium' \| 'high'` | Controls the trade-off between response quality and latency for o-series reasoning models. Ignored for non-reasoning models. |

## Examples

### Standard OpenAI Configuration
```typescript
const config: OpenAIModelConfig = {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  systemRole: 'developer' // Explicitly set for reasoning-capable workflows
};
```

### Groq Cloud Configuration
```typescript
const groqConfig: OpenAIModelConfig = {
  apiKey: process.env.GROQ_API_KEY!,
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'llama-3.3-70b-versatile',
};
```

### Local Ollama Configuration
```typescript
const localConfig: OpenAIModelConfig = {
  apiKey: 'ollama', // Placeholder required by the type
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3.1',
};
```

### Reasoning Model Configuration
```typescript
const reasoningConfig: OpenAIModelConfig = {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'o3-mini',
  reasoningEffort: 'high',
  parallelToolCalls: false // Force sequential tool execution
};
```