---
summary: A set of advanced YAAF features, including heal, discovery, and vision capabilities, often powered by LLM calls.
title: Phase C features
entity_type: concept
related_subsystems:
 - llm-client-system
see_also:
 - "[Heal](./heal.md)"
 - "[Discovery](./discovery.md)"
 - "[LLMCallFn](../apis/llm-call-fn.md)"
search_terms:
 - advanced agent capabilities
 - LLM-powered features
 - what is heal
 - what is discovery
 - vision capabilities in YAAF
 - LLMCallFn usage
 - self-healing agents
 - automatic tool discovery
 - intelligent agent functions
 - non-deterministic features
 - generative AI features
stub: false
compiled_at: 2026-04-25T00:22:57.639Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Phase C features are a category of advanced capabilities within the YAAF framework that rely on direct, often non-deterministic, calls to a Large Language Model (LLM) to function. This category includes features such as [Heal](./heal.md), [Discovery](./discovery.md), and vision processing [Source 1].

These features are distinct from the core deterministic logic of the agent framework. They handle tasks that require generative reasoning, interpretation, or correction, such as automatically fixing broken configurations ([Heal](./heal.md)), finding new tools or information ([Discovery](./discovery.md)), or interpreting image data.

## How It Works in YAAF

The technical foundation for all Phase C features is the [LLMCallFn](../apis/llm-call-fn.md) type, a simple text-in/text-out function signature for interacting with an LLM [Source 1]. This function typically accepts a system prompt, a user prompt, and optional parameters like temperature, returning a string promise from the model.

For vision-related capabilities, a specialized `VisionCallFn` is used, which extends the basic function to include a base64-encoded image and its MIME type as inputs [Source 1].

YAAF's LLM Client System provides factory functions like `makeKBLLMClient` and `makeKBVisionClient` to instantiate these call functions. These helpers automatically detect the configured LLM provider (e.g., Gemini, OpenAI, Anthropic) and API keys from environment variables, abstracting the specific implementation details away from the feature logic that consumes them [Source 1].

## Configuration

The behavior of the LLM calls that power Phase C features can be configured when the client function is created. The `LLMClientOptions` object allows for overriding auto-detected settings for the API key, model name, and provider.

```typescript
import { makeKBLLMClient } from 'yaaf';

// Auto-detects provider and API key from environment variables
const llm = makeKBLLMClient();

// Manually override the model for a specific feature
const discoveryLLM = makeKBLLMClient({
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
});

const result = await discoveryLLM({
  system: 'You are a helpful assistant.',
  user: 'What new tools are available in this project?'
});
```
[Source 1]

## See Also

- [Heal](./heal.md): A Phase C feature for auto-fixing errors.
- [Discovery](./discovery.md): A Phase C feature for finding resources or capabilities.
- [LLMCallFn](../apis/llm-call-fn.md): The core API type used by Phase C features.

## Sources

[Source 1]: src/knowledge/compiler/llmClient.ts