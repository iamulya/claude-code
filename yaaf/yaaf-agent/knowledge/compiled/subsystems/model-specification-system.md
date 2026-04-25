---
summary: Provides a centralized registry and API for managing LLM model specifications, enabling auto-configuration of framework components.
primary_files:
 - src/models/specs.ts
title: Model Specification System
entity_type: subsystem
exports:
 - ModelSpecs
 - resolveModelSpecs
 - registerModelSpecs
search_terms:
 - model context window
 - LLM token limits
 - how to configure context size
 - register custom model
 - fine-tuned model configuration
 - auto-configure context manager
 - resolveModelSpecs function
 - registerModelSpecs function
 - model parameters
 - max output tokens
 - model spec registry
 - unknown model handling
 - context length
stub: false
compiled_at: 2026-04-24T18:16:59.593Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/specs.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Model Specification System provides a centralized registry for Large Language Model ([LLM](../concepts/llm.md)) characteristics, primarily [Context Window](../concepts/context-window.md) and maximum output token limits [Source 1]. Its purpose is to abstract away model-specific details, allowing other framework components like the ContextManager and AgentRunner to auto-configure their behavior based on the selected model. This eliminates the need for developers to manually look up and provide these values in their agent configuration [Source 1].

## Architecture

The subsystem is built around a registry that maps well-known model names to their corresponding specifications. It includes a pre-populated list of specifications for common models from providers such as OpenAI, Google (Gemini), Anthropic, Groq, and Meta [Source 1].

The core data structure is the `[[[[[[[[ModelSpecs]]]]]]]]` type, which contains two key properties:
- `contextWindowTokens`: The total number of tokens (input + output) the model can handle.
- `maxOutputTokens`: The maximum number of tokens the model can generate in a single response.

[when](../apis/when.md) a model's specifications are requested, the `resolveModelSpecs` function employs a multi-step matching strategy to find the most appropriate entry [Source 1]:
1.  **Exact Match**: It first looks for an exact match for the provided model name in the registry.
2.  **Prefix/Substring Match**: If no exact match is found, it attempts to find a registered model name that is a prefix or substring of the requested name. This handles variations like date-suffixed model identifiers (e.g., `'claude-3-5-sonnet-20241022'` matching the base `'claude-3-5-sonnet'`).
3.  **Fallback**: If no match is found, the function returns a set of conservative fallback values to ensure safe operation.

The registry is not static; it can be modified at runtime using the `[[[[[[[[registerModelSpecs]]]]]]]]` function, allowing for the inclusion of custom, fine-tuned, or newly released models [Source 1].

## Integration Points

The Model Specification System is primarily consumed by other YAAF subsystems that need to be aware of model token limits. The source material explicitly notes its use by the ContextManager and AgentRunner to automatically set default values, preventing context overflows and ensuring valid model requests without manual user configuration [Source 1].

## Key APIs

### ModelSpecs
A type definition representing the key specifications for an LLM [Source 1].

```typescript
export type ModelSpecs = {
  /** Total context window in tokens (input + output) */
  contextWindowTokens: number;
  /** Maximum output tokens the model can generate per call */
  maxOutputTokens: number;
};
```

### resolveModelSpecs()
This function resolves the `ModelSpecs` for a given model name using the built-in matching strategy. It is the primary method for querying the registry [Source 1].

```typescript
export function resolveModelSpecs(modelName: string | undefined): ModelSpecs;
```

**Example:**
```typescript
// Example of an exact match
const specs = resolveModelSpecs('gpt-4o-mini')
// → { contextWindowTokens: 128_000, maxOutputTokens: 16_384 }

// Example of a prefix/substring match
const specs = resolveModelSpecs('claude-3-5-sonnet-20241022')
// → { contextWindowTokens: 200_000, maxOutputTokens: 8_192 }
```

### registerModelSpecs()
This function allows developers to add or update model specifications in the registry at runtime. It includes an `overwrite` option to prevent accidental replacement of built-in specifications [Source 1].

```typescript
export function registerModelSpecs(
  modelName: string,
  specs: ModelSpecs,
  options: { overwrite?: boolean }
);
```

**Example:**
```typescript
// Register a new custom model
registerModelSpecs('my-fine-tuned-model', {
  contextWindowTokens: 32_000,
  maxOutputTokens: 4_096,
})

// Explicitly overwrite a built-in entry
registerModelSpecs(
  'gpt-4o', 
  { contextWindowTokens: 200_000, maxOutputTokens: 16_384 }, 
  { overwrite: true }
)
```

## Extension Points

The primary extension point for this subsystem is the `registerModelSpecs` function. Developers can use this API to extend the framework's knowledge of models. This is particularly useful for [Source 1]:
-   **Private or Local Models**: Registering specifications for models hosted in private deployments.
-   **Fine-Tuned Models**: Providing accurate token limits for custom fine-tuned models that may differ from their base versions.
-   **New Model Releases**: Adding support for new models before they are officially included in a YAAF framework update.

## Sources
[Source 1]: src/models/specs.ts