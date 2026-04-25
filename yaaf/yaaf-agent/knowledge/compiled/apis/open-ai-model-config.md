---
summary: Configuration options for the OpenAIChatModel, including API key, base URL, model name, and various operational parameters.
export_name: OpenAIModelConfig
source_file: src/models/openai.ts
category: type
title: OpenAIModelConfig
entity_type: api
search_terms:
 - OpenAI model settings
 - configure OpenAIChatModel
 - OpenAI API key
 - set base URL for LLM
 - Groq model configuration
 - Ollama model settings
 - LLM request timeout
 - context window size
 - parallel tool calls
 - reasoning effort
 - system role developer
 - custom headers for API
 - max output tokens
 - connect to local LLM
stub: false
compiled_at: 2026-04-24T17:24:26.624Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`OpenAIModelConfig` is a TypeScript type alias that defines the configuration object for the `OpenAIChatModel` class [Source 1]. It allows users to specify connection details, model identifiers, and operational parameters for interacting with any OpenAI-compatible chat completions API.

This configuration is provider-agnostic, enabling `OpenAIChatModel` to connect not only to OpenAI but also to other services like Groq, Together AI, Perplexity, and local instances running via Ollama or vLLM [Source 1]. The properties cover everything from authentication and model selection to timeouts, token limits, and provider-specific features like [Reasoning Effort](../concepts/reasoning-effort.md) for o-series models [Source 1].

## Signature

`OpenAIModelConfig` is a type alias for an object with the following properties:

```typescript
export type OpenAIModelConfig = {
  /** API key — or 'ollama', 'local', etc. for local providers */
  apiKey: string;
  /** Base URL (default: https://api.openai.com/v1) */
  baseUrl?: string;
  /** Model name (default: gpt-4o-mini) */
  model?: string;
  /** Request timeout in ms (default: 60_000) */
  timeoutMs?: number;
  /** Extra headers to send with every request */
  headers?: Record<string, string>;
  /** Context window size in tokens (default: 128_000) */
  contextWindowTokens?: number;
  /** Maximum output tokens per completion (default: 4_096) */
  maxOutputTokens?: number;
  /**
   * Role name to use for system messages.
   * - `'system'` — standard role for GPT-4 class models (default)
   * - `'developer'` — required for o1, o3, o4 and future reasoning models
   *
   * When not set, YAAF auto-detects based on the model name prefix:
   * models starting with `o1`, `o3`, or `o4` default to `'developer'`.
   */
  systemRole?: "system" | "developer";
  /**
   * Allow the model to call multiple tools in parallel within a single turn.
   * Defaults to `true` (OpenAI API default). Set to `false` to force sequential
   * tool calls — useful when tools have side-effects that depend on ordering.
   */
  parallelToolCalls?: boolean;
  /**
   * Reasoning effort for o-series models (o1, o3, o4).
   * Controls the trade-off between response quality and latency/cost.
   * - `'low'` — fastest, cheapest, least reasoning
   * - `'medium'` — balanced (default for o3-mini)
   * - `'high'` — most thorough reasoning
   *
   * Ignored for non-reasoning models.
   */
  reasoningEffort?: "low" | "medium" | "high";
};
```
[Source 1]

## Examples

The following examples demonstrate how to use an `OpenAIModelConfig` object to instantiate an `OpenAIChatModel` for different providers.

### Connecting to OpenAI

This is the default configuration, specifying only the required API key. Other properties like `baseUrl` and `model` will use their default values.

```typescript
import { OpenAIChatModel } from 'yaaf';

const config: OpenAIModelConfig = {
  apiKey: process.env.OPENAI_API_KEY!,
};

const model = new OpenAIChatModel(config);
```
[Source 1]

### Connecting to Groq

To connect to a third-party provider like Groq, the `baseUrl` and `model` name must be specified.

```typescript
import { OpenAIChatModel } from 'yaaf';

const config: OpenAIModelConfig = {
  apiKey: process.env.GROQ_API_KEY!,
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'llama-3.3-70b-versatile',
};

const model = new OpenAIChatModel(config);
```
[Source 1]

### Connecting to a Local Ollama Instance

For local models served by Ollama, a conventional API key like `'ollama'` is used, and the `baseUrl` points to the local server.

```typescript
import { OpenAIChatModel } from 'yaaf';

const config: OpenAIModelConfig = {
  apiKey: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3.1',
};

const model = new OpenAIChatModel(config);
```
[Source 1]

## See Also

*   `OpenAIChatModel`: The class that consumes this configuration object to create a model instance.

## Sources

[Source 1]: src/models/openai.ts