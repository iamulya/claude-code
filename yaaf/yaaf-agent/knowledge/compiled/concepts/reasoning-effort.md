---
title: Reasoning Effort
entity_type: concept
summary: A configurable parameter for specific LLMs that controls the trade-off between response quality, latency, and cost by adjusting the model's computational budget.
see_also:
 - "[OpenAIModelConfig](../apis/open-ai-model-config.md)"
search_terms:
 - o-series model configuration
 - o1 model settings
 - o3 model parameters
 - o4 model effort
 - control LLM response quality
 - balance cost and latency
 - LLM reasoning budget
 - thoroughness vs speed
 - OpenAIModelConfig reasoning
 - low medium high reasoning
 - what is reasoning effort
 - how to configure reasoning effort
 - model quality vs cost
stub: false
compiled_at: 2026-04-25T00:23:34.245Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Reasoning Effort is a configurable parameter that allows developers to manage the trade-off between response quality, latency, and cost for certain Large Language Models (LLMs) [Source 1]. It provides a mechanism to instruct the model on how much computational budget to expend on a given task. A higher effort level generally results in more thorough and accurate responses but at the cost of increased latency and expense. Conversely, a lower effort level prioritizes speed and cost-efficiency, which may be suitable for simpler tasks where maximum reasoning capability is not required [Source 1].

In YAAF, this concept is exposed for specific models that support this feature, such as the "o-series" models (e.g., o1, o3, o4). The parameter is ignored by models that do not have this capability [Source 1].

## How It Works in YAAF

The Reasoning Effort parameter is typically set during the configuration of an LLM adapter, such as when instantiating an `OpenAIChatModel`. It accepts one of three predefined levels [Source 1]:

*   **`'low'`**: Prioritizes speed and low cost, allocating the least amount of computational resources for reasoning. This is the fastest and cheapest option [Source 1].
*   **`'medium'`**: Provides a balance between response quality, latency, and cost. The source material notes this is the default setting for the `o3-mini` model [Source 1].
*   **`'high'`**: Allocates the most computational resources to achieve the most thorough and highest-quality reasoning. This option typically has the highest latency and cost [Source 1].

This setting is passed to the underlying model provider as part of the API request for compatible models. For models that do not support this parameter, the setting is disregarded [Source 1].

## Configuration

Reasoning Effort is configured via the `reasoningEffort` property within the [OpenAIModelConfig](../apis/open-ai-model-config.md) object when initializing a model adapter.

```typescript
import { OpenAIChatModel } from 'yaaf-agent';

// Example configuring an o-series model for maximum reasoning quality.
const highlyCapableModel = new OpenAIChatModel({
  apiKey: process.env.O_SERIES_API_KEY!,
  baseUrl: 'https://api.example-provider.com/v1',
  model: 'o4-pro',
  reasoningEffort: 'high', // Request the most thorough reasoning
});

// Example configuring for speed and cost-efficiency.
const fastModel = new OpenAIChatModel({
  apiKey: process.env.O_SERIES_API_KEY!,
  baseUrl: 'https://api.example-provider.com/v1',
  model: 'o3-mini',
  reasoningEffort: 'low', // Prioritize speed and low cost
});
```

## See Also

*   [OpenAIModelConfig](../apis/open-ai-model-config.md): The API configuration object where `reasoningEffort` is set.

## Sources

[Source 1]: src/models/openai.ts