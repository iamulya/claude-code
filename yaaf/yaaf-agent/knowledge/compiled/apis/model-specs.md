---
title: ModelSpecs
entity_type: api
summary: Defines the structure for tracking an LLM's total context window and maximum output token capacity.
export_name: ModelSpecs
source_file: src/models/specs.ts
category: type
stub: false
compiled_at: 2026-04-16T14:31:31.397Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/specs.ts
confidence: 1
---

## Overview
`ModelSpecs` is a configuration type used to define the operational token limits of a Large Language Model (LLM). It provides the framework with necessary metadata to auto-configure components like the `ContextManager` and `AgentRunner`, ensuring that prompts and generated responses stay within the model's architectural boundaries.

The framework maintains a registry of well-known models from providers such as OpenAI, Anthropic, Gemini, Groq, and Meta. This registry allows YAAF to resolve limits automatically based on model strings.

## Signature / Constructor

```typescript
export type ModelSpecs = {
  /** Total context window in tokens (input + output) */
  contextWindowTokens: number
  /** Maximum output tokens the model can generate per call */
  maxOutputTokens: number
}
```

## Methods & Properties

### Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `contextWindowTokens` | `number` | The total capacity of the model's context window, representing the sum of input tokens and generated output tokens. |
| `maxOutputTokens` | `number` | The hard limit on how many tokens the model can generate in a single inference call. |

### Related Functions
The following functions are exported to interact with the `ModelSpecs` registry:

*   **`resolveModelSpecs(modelName: string | undefined): ModelSpecs`**
    Resolves specs for a given model name using a tiered matching strategy:
    1.  Exact match in the registry.
    2.  Prefix or substring match (e.g., `claude-3-5-sonnet-20241022` matches the entry for `claude-3-5-sonnet`).
    3.  Conservative fallback values if no match is found.
*   **`registerModelSpecs(modelName: string, specs: ModelSpecs): void`**
    Adds custom model definitions to the registry at runtime. This is intended for private deployments, fine-tuned models, or new model releases not yet included in the framework's built-in registry.

## Examples

### Resolving Model Specifications
The framework can automatically determine limits for known models.

```typescript
import { resolveModelSpecs } from 'yaaf';

const specs = resolveModelSpecs('gpt-4o-mini');
// Result: { contextWindowTokens: 128000, maxOutputTokens: 16384 }

const sonnetSpecs = resolveModelSpecs('claude-3-5-sonnet-20241022');
// Result: { contextWindowTokens: 200000, maxOutputTokens: 8192 }
```

### Registering Custom Models
For models not present in the default registry, such as local or fine-tuned models, use `registerModelSpecs`.

```typescript
import { registerModelSpecs } from 'yaaf';

registerModelSpecs('my-fine-tuned-model', {
  contextWindowTokens: 32000,
  maxOutputTokens: 4096,
});
```