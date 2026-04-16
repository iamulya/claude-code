---
title: KNOWN_BASE_URLS
entity_type: api
summary: A mapping of provider names to their OpenAI-compatible API base URLs.
export_name: KNOWN_BASE_URLS
source_file: src/models/resolver.ts
category: constant
stub: false
compiled_at: 2026-04-16T14:31:23.351Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/resolver.ts
confidence: 0.9
---

## Overview
`KNOWN_BASE_URLS` is a static lookup table that maps popular LLM provider identifiers to their respective OpenAI-compatible API base URLs. It is primarily used by the model resolver to automatically configure the `OpenAIChatModel` when a specific provider is requested in the agent configuration.

By using these pre-defined keys, developers can switch between different inference providers (such as Groq, DeepSeek, or local Ollama instances) by specifying a simple string name rather than providing a full URL.

## Signature / Constructor
```typescript
export const KNOWN_BASE_URLS: Record<string, string>
```

## Methods & Properties
The constant contains the following provider mappings:

| Key | Base URL |
| :--- | :--- |
| `groq` | `https://api.groq.com/openai/v1` |
| `ollama` | `http://localhost:11434/v1` |
| `together` | `https://api.together.xyz/v1` |
| `fireworks` | `https://api.fireworks.ai/inference/v1` |
| `perplexity` | `https://api.perplexity.ai` |
| `deepseek` | `https://api.deepseek.com/v1` |

## Examples

### Accessing a Base URL
You can programmatically access the URL for a specific provider to configure a model manually.

```typescript
import { KNOWN_BASE_URLS } from 'yaaf';

const ollamaUrl = KNOWN_BASE_URLS['ollama'];
// Returns: 'http://localhost:11434/v1'
```

### Implicit Usage in Configuration
While `KNOWN_BASE_URLS` can be accessed directly, it is most commonly used implicitly via the agent configuration's `provider` field.

```typescript
const config = {
  provider: 'groq', // The resolver uses KNOWN_BASE_URLS to find the Groq endpoint
  model: 'llama3-8b-8192',
  apiKey: process.env.GROQ_API_KEY
};
```

## See Also
* `resolveModel` — The function that utilizes this constant to instantiate chat models.