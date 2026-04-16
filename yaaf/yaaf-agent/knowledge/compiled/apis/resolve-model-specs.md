---
title: resolveModelSpecs
entity_type: api
summary: Retrieves model specifications using exact or prefix matching against the internal registry.
export_name: resolveModelSpecs
source_file: src/models/specs.ts
category: function
stub: false
compiled_at: 2026-04-16T14:31:35.738Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/specs.ts
confidence: 1
---

## Overview
`resolveModelSpecs` is a utility function used to retrieve the technical constraints of a Large Language Model (LLM) based on its identifier. It queries an internal registry that maps well-known model names from providers such as OpenAI, Anthropic, Google (Gemini), Groq, and Meta to their specific context window and output token limits. 

This function is primarily used to auto-configure framework components like the ContextManager and AgentRunner, allowing them to operate within a model's boundaries without requiring the developer to manually specify token limits for every model.

## Signature / Constructor

```typescript
export function resolveModelSpecs(modelName: string | undefined): ModelSpecs;

export type ModelSpecs = {
  /** Total context window in tokens (input + output) */
  contextWindowTokens: number;
  /** Maximum output tokens the model can generate per call */
  maxOutputTokens: number;
};
```

### Matching Strategy
The function resolves specifications using the following priority:
1.  **Exact Match**: It checks if the provided `modelName` exists exactly as defined in the registry.
2.  **Prefix/Substring Match**: If no exact match is found, it attempts to match the prefix. This allows versioned model strings (e.g., `claude-3-5-sonnet-20241022`) to resolve to their base model specifications (e.g., `claude-3-5-sonnet`).
3.  **Fallback**: If the `modelName` is `undefined` or does not match any known patterns, the function returns conservative fallback values to ensure system stability.

## Examples

### Basic Usage
Retrieving specifications for a standard model identifier.

```typescript
import { resolveModelSpecs } from 'yaaf';

const specs = resolveModelSpecs('gpt-4o-mini');
// Result: { contextWindowTokens: 128000, maxOutputTokens: 16384 }
```

### Prefix Matching
Resolving a specific date-versioned model string to its base specifications.

```typescript
import { resolveModelSpecs } from 'yaaf';

const specs = resolveModelSpecs('claude-3-5-sonnet-20241022');
// Result: { contextWindowTokens: 200000, maxOutputTokens: 8192 }
```

## See Also
- `registerModelSpecs`: A function used to add custom model definitions to the registry at runtime, useful for fine-tuned or private models.