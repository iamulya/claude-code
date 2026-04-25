---
summary: Registers or updates custom `ModelSpecs` at runtime, useful for private deployments, fine-tuned models, or new LLM releases.
export_name: registerModelSpecs
source_file: src/models/specs.ts
category: function
title: registerModelSpecs
entity_type: api
search_terms:
 - add custom model
 - register new LLM
 - fine-tuned model configuration
 - update model context window
 - private model deployment
 - how to use a new model
 - override model specs
 - context window size
 - max output tokens
 - ModelSpecs registry
 - configure unknown model
 - runtime model registration
stub: false
compiled_at: 2026-04-24T17:31:54.388Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/specs.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `registerModelSpecs` function allows for the dynamic registration or modification of model specifications within the YAAF framework's internal registry [Source 1]. This is particularly useful for integrating models that are not included in the built-in registry, such as privately hosted models, fine-tuned model variants, or newly released models that have not yet been officially added to YAAF [Source 1].

By registering a model's specifications—specifically its total [Context Window](../concepts/context-window.md) and maximum output tokens—YAAF components like `AgentRunner` and `ContextManager` can automatically configure themselves without requiring manual specification from the user [Source 1].

The function includes an `overwrite` option to prevent accidental shadowing of well-known built-in model specifications. To modify an existing entry, this option must be explicitly set to `true` [Source 1].

## Signature

The function takes a model name, a `ModelSpecs` object, and an optional options object [Source 1].

```typescript
export function registerModelSpecs(
  modelName: string,
  specs: ModelSpecs,
  options?: { overwrite?: boolean }
): void;
```

### Parameters

-   `modelName` (`string`): The unique identifier for the model to register.
-   `specs` (`ModelSpecs`): An object containing the model's token limits.
-   `options` (`{ overwrite?: boolean }`): (Optional) Configuration options.
    -   `overwrite` (`boolean`, default: `false`): If `true`, allows replacing an existing entry in the registry. Defaults to `false` to prevent accidental changes to built-in specs [Source 1].

### Related Types

#### `ModelSpecs`

The `ModelSpecs` type defines the token capacity of a large language model [Source 1].

```typescript
export type ModelSpecs = {
  /** Total context window in tokens (input + output) */
  contextWindowTokens: number;
  /** Maximum output tokens the model can generate per call */
  maxOutputTokens: number;
};
```

## Examples

### Registering a New Custom Model

This example demonstrates how to register a new, fine-tuned model that is not part of the built-in YAAF registry [Source 1].

```typescript
import { registerModelSpecs, resolveModelSpecs } from 'yaaf';

// Register the specs for a private, fine-tuned model
registerModelSpecs('my-fine-tuned-model', {
  contextWindowTokens: 32_000,
  maxOutputTokens: 4_096,
});

// Now, resolveModelSpecs will recognize the new model
const specs = resolveModelSpecs('my-fine-tuned-model');
console.log(specs);
// → { contextWindowTokens: 32000, maxOutputTokens: 4096 }
```

### Overwriting a Built-in Model Spec

In rare cases, you may need to update the specifications for a model that is already known to YAAF. This requires setting the `overwrite` option to `true` [Source 1].

```typescript
import { registerModelSpecs } from 'yaaf';

// Explicitly overwrite the specs for gpt-4o
// This is generally discouraged; prefer using a unique name.
registerModelSpecs(
  'gpt-4o',
  {
    contextWindowTokens: 200_000, // A hypothetical new value
    maxOutputTokens: 16_384,
  },
  { overwrite: true }
);
```

## See Also

-   `resolveModelSpecs`: A function that retrieves model specifications from the registry, which `registerModelSpecs` populates.
-   `ModelSpecs`: The type definition for model specifications used by this function.

## Sources

[Source 1]: src/models/specs.ts