---
export_name: GenerateFn
source_file: src/knowledge/compiler/extractor/extractor.ts
category: type
summary: A type definition for an asynchronous function that calls an LLM, used to decouple the extractor from specific model implementations.
title: GenerateFn
entity_type: api
stub: false
compiled_at: 2026-04-16T14:22:43.879Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/extractor.ts
confidence: 0.98
---

## Overview
`GenerateFn` is a functional type definition used within the YAAF knowledge compilation pipeline. It defines a standardized interface for making asynchronous calls to a Large Language Model (LLM). 

The primary purpose of this type is to decouple the `ConceptExtractor` from specific LLM provider implementations or YAAF model adapters. By using this abstraction, the extraction logic remains provider-agnostic and easily testable, as developers can provide mock functions or specific model configurations without modifying the core extraction logic.

In the context of the knowledge base compiler, `GenerateFn` is utilized during the LLM classification pass to:
* Classify source content into entity types and canonical titles.
* Identify relationships between entities.
* Suggest metadata and frontmatter values.
* Extract new candidate concepts.

## Signature
```typescript
type GenerateFn = (systemPrompt: string, userPrompt: string) => Promise<string>;
```

### Parameters
* **systemPrompt**: A string containing the instructions, persona, and constraints for the LLM.
* **userPrompt**: A string containing the specific source data or query to be processed.

### Returns
* **Promise<string>**: An asynchronous result containing the raw text response from the LLM.

## Examples

### Creating a GenerateFn from a YAAF Model
This example demonstrates how to wrap a YAAF model adapter to satisfy the `GenerateFn` type.

```typescript
import { GeminiChatModel } from '@yaaf/models'; // Hypothetical import based on source context

const model = new GeminiChatModel({ 
  model: 'gemini-2.5-flash', 
  apiKey: process.env.API_KEY 
});

const generateFn: GenerateFn = async (system, user) => {
  const result = await model.complete({
    messages: [
      { role: 'system', content: system }, 
      { role: 'user', content: user }
    ],
    temperature: 0.1,
    maxTokens: 2048,
  });
  return result.content ?? '';
};
```

### Using GenerateFn with ConceptExtractor
The `GenerateFn` is typically passed into the `ConceptExtractor` constructor.

```typescript
const extractor = new ConceptExtractor(ontology, registry, generateFn);
const plan = await extractor.buildPlan(ingestedContents);
```

## See Also
* `ConceptExtractor`
* `makeGenerateFn`