---
title: Model Specs Registry
entity_type: subsystem
summary: A built-in registry in YAAF that stores context and output token limits for various LLM models, used for automatic ContextManager configuration.
primary_files:
 - src/model-specs.ts
exports:
 - ModelSpecs
 - resolveModelSpecs
 - registerModelSpecs
search_terms:
 - LLM context window size
 - model token limits
 - automatic context manager setup
 - how to configure context size
 - register custom model
 - fine-tuned model configuration
 - gpt-4o context limit
 - claude 3.5 sonnet token limit
 - resolveModelSpecs usage
 - registerModelSpecs usage
 - YAAF auto mode
 - contextWindowTokens
 - maxOutputTokens
stub: false
compiled_at: 2026-04-25T00:30:02.822Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/compaction.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/specs.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Model Specs Registry solves the problem of manually configuring [LLM](../concepts/llm.md) token limits for agents. Different models have varying [context window](../concepts/context-window.md) sizes and maximum output token lengths. Requiring developers to look up and specify these numbers for each agent is tedious and error-prone [Source 2].

This subsystem provides a centralized, built-in registry that maps well-known model names to their respective `contextWindowTokens` and `maxOutputTokens` [Source 2]. This enables a "zero-config" path for components like the [ContextManager](../apis/context-manager.md), which can automatically configure themselves based on the agent's specified model, simplifying agent setup and preventing misconfiguration [Source 1, Source 2].

## Architecture

The Model Specs Registry is fundamentally a key-value store that maps model name strings to [ModelSpecs](../apis/model-specs.md) objects [Source 2]. YAAF ships with a pre-populated registry covering over 40 models from major providers [Source 1].

The core logic resides in the [resolveModelSpecs](../apis/resolve-model-specs.md) function, which uses a multi-step matching strategy to find the appropriate specs for a given model name [Source 2]:
1.  **Exact Match**: It first looks for an exact match in the registry.
2.  **Prefix Match**: If no exact match is found, it attempts a prefix or substring match. This allows dated model versions (e.g., `'claude-3-5-sonnet-20241022'`) to correctly resolve to their base model entry (e.g., `'claude-3-5-sonnet'`) [Source 1, Source 2].
3.  **Fallback**: If no match is found, it returns a set of conservative fallback values to ensure functionality [Source 2].

The built-in registry includes specifications for the following model families [Source 1]:

| Family              | Models covered                                                    |
| ------------------- | ----------------------------------------------------------------- |
| **OpenAI GPT-4o**   | `gpt-4o`, `gpt-4o-mini`, dated snapshots                          |
| **OpenAI o-series** | `o1`, `o1-mini`, `o3`, `o3-mini`                                  |
| **OpenAI GPT-4**    | `gpt-4-turbo`, `gpt-4`, `gpt-4-32k`, `gpt-3.5-turbo`              |
| **Google Gemini**   | `gemini-2.5-pro/flash`, `gemini-2.0-flash`, `gemini-1.5-pro/flash`|
| **Anthropic Claude**| `claude-opus-4`, `claude-sonnet-4`, `claude-3-5-sonnet/haiku`, `claude-3-*` |
| **Meta Llama**      | `llama-3.3-70b`, `llama-3.1-*`, `llama-3.2-*`                     |
| **Mistral / Mixtral**| `mistral-large/small`, `mixtral-8x7b/8x22b`                       |
| **DeepSeek**        | `deepseek-chat`, `deepseek-coder`, `deepseek-r1`                  |

The registry is extensible at runtime, allowing developers to add or modify entries [Source 2].

## Integration Points

The Model Specs Registry is primarily used by other YAAF subsystems that need to be aware of [LLM](../concepts/llm.md) token limits:

*   **[Context Management](./context-management.md)**: The [ContextManager](../apis/context-manager.md) uses the registry when configured in `'auto'` mode. It calls [resolveModelSpecs](../apis/resolve-model-specs.md) with the agent's model name to set its `contextWindowTokens` and `maxOutputTokens` properties automatically [Source 1].
*   **[Agent Core](./agent-core.md)**: The `Agent` class constructor leverages the registry for its `'auto'` configuration mode, which creates and configures a [ContextManager](../apis/context-manager.md) instance on the developer's behalf [Source 1]. The `AgentRunner` also uses it for setting up defaults [Source 2].

## Key APIs

The public API surface for this subsystem consists of two functions and one type definition [Source 2].

*   **[resolveModelSpecs](../apis/resolve-model-specs.md)**: Queries the registry for a given model name and returns a [ModelSpecs](../apis/model-specs.md) object. It employs a prefix-matching strategy for flexibility [Source 2].
    ```typescript
    import { resolveModelSpecs } from 'yaaf';

    const specs = resolveModelSpecs('gpt-4o');
    // → { contextWindowTokens: 128_000, maxOutputTokens: 16_384 }

    const specsForDatedModel = resolveModelSpecs('claude-3-5-sonnet-20241022');
    // → { contextWindowTokens: 200_000, maxOutputTokens: 8_192 }
    ```
*   **[registerModelSpecs](../apis/register-model-specs.md)**: Adds a new model and its specifications to the registry at runtime. This is used for custom, fine-tuned, or newly released models not yet included in YAAF's built-in list [Source 2].
    ```typescript
    import { registerModelSpecs } from 'yaaf';

    // Register a private/fine-tuned model
    registerModelSpecs('my-fine-tuned-llama', {
      contextWindowTokens: 32_000,
      maxOutputTokens: 4_096,
    });
    ```
*   **[ModelSpecs](../apis/model-specs.md)**: A type that defines the structure for model specifications, containing `contextWindowTokens` and `maxOutputTokens` [Source 2].
    ```typescript
    export type ModelSpecs = {
      /** Total context window in tokens (input + output) */
      contextWindowTokens: number;
      /** Maximum output tokens the model can generate per call */
      maxOutputTokens: number;
    };
    ```

## Extension Points

The primary way to extend the Model Specs Registry is by using the [registerModelSpecs](../apis/register-model-specs.md) function. This allows developers to add support for private models, fine-tuned models, or models from providers not covered by the default registry [Source 2].

By default, attempting to register a model name that already exists will not overwrite the built-in entry. To explicitly replace an existing specification, the `overwrite: true` option must be passed [Source 2].

```typescript
import { registerModelSpecs } from 'yaaf';

// Overwrite an existing built-in entry (rarely needed)
registerModelSpecs(
  'gpt-4o',
  { contextWindowTokens: 200_000, maxOutputTokens: 16_384 },
  { overwrite: true }
);
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/compaction.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/specs.ts