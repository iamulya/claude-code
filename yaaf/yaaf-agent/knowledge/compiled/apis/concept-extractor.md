---
export_name: ConceptExtractor
source_file: src/knowledge/compiler/extractor/extractor.ts
category: class
summary: The planning layer of the KB compilation pipeline that classifies source content and identifies entities to create or update.
title: ConceptExtractor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:22:41.895Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/extractor.ts
confidence: 0.98
---

## Overview
The `ConceptExtractor` is a core component of the YAAF knowledge base compilation pipeline. It serves as the "planning" layer, positioned between the Ingester and the Knowledge Synthesizer. Its primary responsibility is to transform raw `IngestedContent` into a structured `CompilationPlan` by identifying which entities (concepts, APIs, etc.) are described in the source material.

The extraction process occurs in three distinct passes:

1.  **Pass 1 — Static Analysis**: Performs an instant, non-LLM scan of the content. This includes a vocabulary scan to find known entity mentions via an alias index, registry lookups to check for existing articles, directory hint analysis to infer entity types from file paths, and token estimation.
2.  **Pass 2 — LLM Classification**: Uses a fast extraction model to classify the source into an entity type and canonical title. It identifies whether the content should update an existing article or create a new one, extracts candidate concepts, suggests frontmatter values, and determines relationships to other entities.
3.  **Pass 3 — Post-processing**: A final non-LLM step that computes deterministic `docIds`, merges multiple sources targeting the same entity, validates types against the defined ontology, and flags low-confidence plans for human review.

## Signature / Constructor

### Constructor
```typescript
constructor(
  ontology: KBOntology,
  registry: ConceptRegistry,
  generateFn: GenerateFn
)
```

### Supporting Types

#### GenerateFn
A decoupled asynchronous function type used to call an LLM. This allows the extractor to remain agnostic of specific LLM provider implementations.

```typescript
export type GenerateFn = (systemPrompt: string, userPrompt: string) => Promise<string>;
```

## Methods & Properties

### buildPlan()
The primary entry point for the extractor. It processes an array of ingested content and produces a compilation plan.

```typescript
async buildPlan(ingestedContents: IngestedContent[]): Promise<CompilationPlan>
```

### makeGenerateFn()
A convenience helper to create a `GenerateFn` from any YAAF-compatible model that implements a `complete` method.

```typescript
export function makeGenerateFn(
  model: { complete: (params: any) => Promise<{ content?: string }> },
  options?: { temperature?: number; maxTokens?: number }
): GenerateFn
```

## Examples

### Basic Usage
This example demonstrates initializing the `ConceptExtractor` with a YAAF model and building a plan from ingested files.

```typescript
import { ConceptExtractor, makeGenerateFn } from 'yaaf/knowledge';
import { GeminiChatModel } from 'yaaf/models';

const model = new GeminiChatModel({ 
  model: 'gemini-2.5-flash', 
  apiKey: process.env.API_KEY 
});

const generateFn = makeGenerateFn(model, {
  temperature: 0.1,
  maxTokens: 2048
});

const extractor = new ConceptExtractor(ontology, registry, generateFn);
const plan = await extractor.buildPlan(ingestedContents);
```

### Manual GenerateFn Implementation
For custom logic or non-standard models, the `GenerateFn` can be implemented manually.

```typescript
const generateFn: GenerateFn = async (system, user) => {
  const result = await model.complete({
    messages: [
      { role: 'system', content: system }, 
      { role: 'user', content: user }
    ],
    temperature: 0.1,
  });
  return result.content ?? '';
};

const extractor = new ConceptExtractor(ontology, registry, generateFn);
```

## See Also
*   `IngestedContent`
*   `KnowledgeSynthesizer`
*   `KBOntology`