---
summary: Defines the structure for LLM model specifications, including total context window and maximum output tokens.
export_name: ModelSpecs
source_file: src/models/specs.ts
category: type
title: ModelSpecs
entity_type: api
search_terms:
 - LLM context window
 - model token limits
 - max output tokens
 - context length
 - model capabilities
 - how to define custom model specs
 - registering a new model
 - resolveModelSpecs function
 - registerModelSpecs function
 - GPT-4 token limit
 - Claude token limit
 - Gemini context size
 - model registry
stub: false
compiled_at: 2026-04-24T17:22:29.780Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/specs.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ModelSpecs` type defines the structure for specifying a language model's token limitations. It is used throughout YAAF to manage context and generation constraints automatically [Source 1].

This type is central to the framework's model registry system. YAAF maintains a built-in registry of specifications for well-known models from providers like OpenAI, Google, Anthropic, and others. This allows components such as `AgentRunner` and `ContextManager` to be auto-configured with appropriate token limits without requiring manual user input [Source 1].

The `ModelSpecs` type is used by the `resolveModelSpecs` function to retrieve specifications for a given model name and by the `registerModelSpecs` function to add specifications for custom, fine-tuned, or newly released models at runtime [Source 1].

## Signature

`ModelSpecs` is a TypeScript type alias with the following structure:

```typescript
export type ModelSpecs = {
  /** Total context window in tokens (input + output) */
  contextWindowTokens: number;
  /** Maximum output tokens the model can generate per call */
  maxOutputTokens: number;
};
```
[Source 1]

## Examples

The most common use of `ModelSpecs` is to provide an object of this type to the `registerModelSpecs` function [when](./when.md) working with a model not included in the built-in registry.

### Registering a Custom Model

This example demonstrates how to define and register specifications for a private, fine-tuned model.

```typescript
import { registerModelSpecs } from 'yaaf';

// Define the specs for the custom model
const myModelSpecs: ModelSpecs = {
  contextWindowTokens: 32_000,
  maxOutputTokens: 4_096,
};

// Register the specs with the framework
registerModelSpecs('my-fine-tuned-model', myModelSpecs);
```
[Source 1]

### Overwriting Built-in Specs

While less common, it is possible to overwrite the specifications for a built-in model by passing an options object to `registerModelSpecs`.

```typescript
import { registerModelSpecs } from 'yaaf';

// Explicitly overwrite the specs for gpt-4o
registerModelSpecs(
  'gpt-4o', 
  { 
    contextWindowTokens: 200_000, 
    maxOutputTokens: 16_384 
  }, 
  { overwrite: true }
);
```
[Source 1]

## See Also

- `resolveModelSpecs`: A function that retrieves `ModelSpecs` for a given model name from the registry.
- `registerModelSpecs`: A function used to add or update `ModelSpecs` in the runtime registry.

## Sources

[Source 1]: src/models/specs.ts