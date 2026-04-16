---
summary: The multi-pass process of identifying, classifying, and relating framework entities from source material for the knowledge base.
title: Concept Extraction
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:22:40.277Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/extractor.ts
confidence: 0.9
---

---
title: Concept Extraction
entity_type: concept
summary: The multi-pass process of identifying, classifying, and relating framework entities from source material for the knowledge base.
related_subsystems:
  - Knowledge Base
  - Compiler

## What It Is
Concept Extraction is the planning phase of the YAAF knowledge base compilation pipeline. It serves as the intermediary step between the Ingester and the Knowledge Synthesizer. The primary purpose of this process is to transform raw ingested content into a structured Compilation Plan by identifying entity types, canonical titles, and relationships between different pieces of information.

By analyzing source material before synthesis, the framework can determine whether a source describes a new entity or provides an update to an existing one, ensuring the knowledge base remains consistent and avoids duplication.

## How It Works in YAAF
The extraction process is managed by the `ConceptExtractor` class and follows a three-pass architecture to balance speed, cost, and accuracy.

### Pass 1: Static Analysis
This pass is performed using deterministic logic without LLM involvement. It includes:
*   **Vocabulary Scan:** Identifying mentions of known entities using an alias index.
*   **Registry Lookup:** Checking which mentioned entities already possess existing articles in the knowledge base.
*   **Directory Hinting:** Inferring the likely entity type (e.g., API, Guide, Plugin) based on file path conventions.
*   **Token Estimation:** Calculating the size of the source material to optimize LLM prompt construction.

### Pass 2: LLM Classification
The extractor uses a lightweight LLM (via a `GenerateFn`) to perform semantic analysis:
*   **Classification:** Assigning an entity type and a canonical title to the source.
*   **Action Identification:** Deciding if the source requires creating a new article or updating an existing one.
*   **Candidate Extraction:** Identifying potential new concepts mentioned in the text that are not yet part of the knowledge base.
*   **Frontmatter Suggestion:** Generating initial metadata values based on the content.
*   **Relationship Mapping:** Determining how the article relates to other known entities.

### Pass 3: Post-processing
The final pass performs cleanup and validation:
*   **ID Generation:** Computing deterministic `docIds` from the LLM's output.
*   **Multi-source Grouping:** Merging multiple source files that target the same entity into a single compilation task.
*   **Ontology Validation:** Ensuring the identified entity types conform to the defined framework ontology.
*   **Confidence Flagging:** Identifying low-confidence plans that may require human intervention.

## Configuration
Developers configure extraction by providing a `GenerateFn` to the `ConceptExtractor`. This function bridges the extractor to a specific LLM implementation.

```typescript
import { ConceptExtractor, makeGenerateFn } from '../knowledge/compiler/extractor/extractor.js';

// Example: Creating a GenerateFn from a YAAF model
const model = new GeminiChatModel({ 
  model: 'gemini-2.5-flash', 
  apiKey: process.env.API_KEY 
});

const generateFn = async (system, user) => {
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

const extractor = new ConceptExtractor(ontology, registry, generateFn);
const plan = await extractor.buildPlan(ingestedContents);
```

The `makeGenerateFn` helper is also available to simplify the creation of this function from any YAAF-compatible `BaseLLMAdapter` subclass.

## See Also
*   `src/knowledge/compiler/extractor/extractor.ts` (Source)