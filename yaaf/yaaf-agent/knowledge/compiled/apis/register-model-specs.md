---
title: registerModelSpecs
entity_type: api
summary: Enables the addition of custom model specifications to the registry at runtime.
export_name: registerModelSpecs
source_file: src/models/specs.ts
category: function
stub: false
compiled_at: 2026-04-16T14:31:37.672Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/specs.ts
confidence: 1
---

## Overview
`registerModelSpecs` is a utility function used to extend the YAAF internal model registry. It allows developers to define the token limits for Large Language Models (LLMs) that are not included in the framework's built-in defaults, such as fine-tuned models, private deployments, or newly released models.

By registering these specifications, components like the `ContextManager` and `AgentRunner` can automatically configure their behavior (such as context window management and output constraints) without requiring manual parameter overrides for every call.

## Signature / Constructor

```typescript
export function registerModelSpecs(modelName: string, specs: ModelSpecs): void;

export type ModelSpecs = {
  /** Total context window in tokens (input + output) */
  contextWindowTokens: number;
  /** Maximum output tokens the model can generate per call */
  maxOutputTokens: number;
};
```

### Parameters
- `modelName`: A unique string identifier for the model. This name is used for matching during resolution.
- `specs`: An object of type `ModelSpecs` defining the token constraints for the model.

## Examples

### Registering a Fine-tuned Model
This example demonstrates how to register specifications for a custom model so that the framework can handle its specific token limits.

```typescript
import { registerModelSpecs } from 'yaaf';

registerModelSpecs('my-fine-tuned-model', {
  contextWindowTokens: 32_000,
  maxOutputTokens: 4_096,
});
```

## See Also
- `resolveModelSpecs`: The function used to retrieve specifications from the registry.
- `ModelSpecs`: The type definition for model token constraints.