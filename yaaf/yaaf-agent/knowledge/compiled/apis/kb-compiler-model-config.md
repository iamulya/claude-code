---
summary: Configuration options for the model used by the knowledge base compiler.
export_name: KBCompilerModelConfig
source_file: src/knowledge/ontology/index.ts
category: type
title: KBCompilerModelConfig
entity_type: api
search_terms:
 - knowledge base compiler model settings
 - configure KB compiler LLM
 - ontology generation model options
 - KB model parameters
 - YAAF knowledge base configuration
 - how to set model for KB compiler
 - compiler model config
 - knowledge base build settings
 - LLM provider for ontology
 - model selection for knowledge extraction
 - knowledge compiler setup
 - model configuration for KB
stub: false
compiled_at: 2026-04-24T17:16:09.425Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `KBCompilerModelConfig` type is used to define the configuration for the large language model ([LLM](../concepts/llm.md)) that powers the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md). This configuration object specifies which model to use, from which provider, and any other necessary parameters for model invocation during the [Ontology](../concepts/ontology.md) generation and knowledge extraction process.

This type is typically used [when](./when.md) setting up the knowledge base subsystem, allowing developers to control the cost, performance, and capabilities of the compilation process by selecting an appropriate model.

## Signature

`KBCompilerModelConfig` is exported as a type from the main ontology module. Its specific properties are defined internally.

```typescript
// Source: src/knowledge/ontology/index.ts

export type { KBCompilerModelConfig } from "./types.js";
```

The detailed structure of this type is not available in the provided source material, but it would contain fields for specifying the model provider, model name, and other API parameters.

## Examples

The following example illustrates how the `KBCompilerModelConfig` type would be used to create a configuration object for the knowledge base compiler. Note that the fields within the object are hypothetical, as the exact type definition is not specified in the source.

```typescript
import type { KBCompilerModelConfig } from 'yaaf';

// This is a hypothetical configuration object. The actual fields
// may differ.
const modelConfigForCompiler: KBCompilerModelConfig = {
  // provider: 'anthropic',
  // model: 'claude-3-opus-20240229',
  // temperature: 0.1,
  // max_tokens: 4096,
};

// This configuration would then be passed to a function that
// initializes or runs the knowledge base compiler.
/*
function initializeKBCompiler(options: { modelConfig: KBCompilerModelConfig }) {
  // ... compiler initialization logic using the model config
}

initializeKBCompiler({ modelConfig: modelConfigForCompiler });
*/
```

## Sources

[Source 1] src/knowledge/ontology/index.ts