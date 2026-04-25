---
title: resolveModelSpecs
entity_type: api
summary: Resolves the `ModelSpecs` for a given model name using a built-in registry and a flexible matching strategy.
export_name: resolveModelSpecs
source_file: src/models/specs.ts
category: function
search_terms:
 - model context window
 - get token limit for model
 - find max output tokens
 - LLM model specifications
 - automatic context management
 - ContextManager configuration
 - how to find context length
 - model spec registry
 - gpt-4o context size
 - claude-3.5-sonnet token limit
 - fallback model specs
 - model name matching
stub: false
compiled_at: 2026-04-24T17:32:51.759Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/specs.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `resolveModelSpecs` function retrieves the [Context Window](../concepts/context-window.md) size and maximum output tokens for a given large language model ([LLM](../concepts/llm.md)) name from a built-in registry [Source 2].

This utility is primarily used to automatically configure YAAF components like the `ContextManager` and `AgentRunner`, removing the need for users to manually specify these provider-specific values. The framework's internal [Tools](../subsystems/tools.md), such as the `YaafDoctor`, also leverage this function for model-aware auto-configuration [Source 1, Source 2].

The function employs a flexible matching strategy to find the appropriate specs [Source 2]:
1.  It first attempts an exact match for the `modelName` in the registry.
2.  If no exact match is found, it searches for a registry key that is a prefix or substring of the provided `modelName`. This handles versioned model names like `'claude-3-5-sonnet-20241022'`, which will match the base entry `'claude-3-5-sonnet'`.
3.  If no match is found, it returns a set of conservative fallback values to ensure functionality.

The built-in registry contains specifications for well-known models from providers including OpenAI, Google (Gemini), Anthropic, Groq, and Meta [Source 2].

## Signature

The function takes a model name string and returns a `ModelSpecs` object [Source 2].

```typescript
export function resolveModelSpecs(modelName: string | undefined): ModelSpecs;
```

### `ModelSpecs` Type

The returned object has the following structure [Source 2]:

```typescript
export type ModelSpecs = {
  /** Total context window in tokens (input + output) */
  contextWindowTokens: number;
  /** Maximum output tokens the model can generate per call */
  maxOutputTokens: number;
};
```

## Examples

### Basic Usage

Resolving the specs for a model with an exact name in the registry [Source 2].

```typescript
import { resolveModelSpecs } from 'yaaf';

const specs = resolveModelSpecs('gpt-4o-mini');

console.log(specs);
// → { contextWindowTokens: 128_000, maxOutputTokens: 16_384 }
```

### Prefix Matching

Resolving specs for a versioned model name that matches a base entry in the registry [Source 2].

```typescript
import { resolveModelSpecs } from 'yaaf';

// The full model name includes a date, but it matches the base 'claude-3-5-sonnet' entry.
const specs = resolveModelSpecs('claude-3-5-sonnet-20241022');

console.log(specs);
// → { contextWindowTokens: 200_000, maxOutputTokens: 8_192 }
```

### Fallback Behavior

If a model name cannot be found, the function returns conservative default values [Source 2].

```typescript
import { resolveModelSpecs } from 'yaaf';

const specs = resolveModelSpecs('unknown-experimental-model-v1');

// The actual fallback values may vary, but they will be conservative.
console.log(specs);
// → { contextWindowTokens: 8192, maxOutputTokens: 2048 } (example values)
```

## See Also

*   `registerModelSpecs`: A function to add or overwrite model specifications in the registry at runtime, useful for custom or fine-tuned models [Source 2].
*   `ContextManager`: A core YAAF subsystem that uses `resolveModelSpecs` for automatic token [Budget Management](../subsystems/budget-management.md) [Source 2].

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/specs.ts