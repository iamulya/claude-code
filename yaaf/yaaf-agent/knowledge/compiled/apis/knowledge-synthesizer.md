---
title: KnowledgeSynthesizer
entity_type: api
summary: The final authoring step of the KB compilation pipeline that produces compiled wiki articles from a compilation plan.
export_name: KnowledgeSynthesizer
source_file: src/knowledge/compiler/synthesizer/synthesizer.ts
category: class
stub: false
compiled_at: 2026-04-16T14:26:58.027Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/synthesizer.ts
confidence: 0.98
---

## Overview
The `KnowledgeSynthesizer` is the final component in the knowledge base compilation pipeline. It is responsible for transforming a structured `CompilationPlan` into finalized, production-grade markdown articles. It consumes ingested source content and uses a generative language model to author encyclopedic entries that adhere to the project's ontology.

The synthesizer operates at the end of the following pipeline:
1.  **ConceptExtractor**: Produces a `CompilationPlan`.
2.  **KnowledgeSynthesizer**: Consumes the plan and `IngestedContent` to produce compiled articles and update the registry.

## Signature / Constructor
The `KnowledgeSynthesizer` is exported as a class. While the specific constructor parameters are encapsulated, the class typically requires a configuration object defining concurrency limits and the generative function used for synthesis.

```typescript
export class KnowledgeSynthesizer {
  // Implementation details are internal to the framework
}

export type GenerateFn = (params: {
  system: string;
  user: string;
}) => Promise<string>;
```

## Methods & Properties
The `KnowledgeSynthesizer` performs the following operations for each `ArticlePlan` defined in a `CompilationPlan`:

*   **Source Gathering**: Collects relevant source texts from the `IngestedContent` map based on the plan's requirements.
*   **Article Loading**: If the plan specifies an `update` action, it loads the existing compiled article to ensure continuity.
*   **Prompt Construction**: Builds complex system and user prompts for the synthesis model.
*   **LLM Invocation**: Calls the generative model (the "synthesis model") to author the content.
*   **Parsing and Validation**: Parses the LLM output into frontmatter and body sections, validating the frontmatter against the defined `KBOntology` schema.
*   **Metadata Injection**: Automatically injects compiler-specific metadata, including `entity_type`, `compiled_at`, `stub` status, and `confidence` scores.
*   **Persistence**: Writes the final article to the `compiled/{docId}.md` path and updates the in-memory `ConceptRegistry`.
*   **Stub Generation**: If high-confidence candidate concepts are identified during synthesis, it can generate initial stub articles for them.
*   **Registry Synchronization**: After all articles are processed, it writes the updated `.kb-registry.json` cache to disk.

### Concurrency
Articles are synthesized in parallel to optimize performance. The default concurrency is set to `3`, though this is configurable via options. Each article synthesis is treated as an independent LLM call.

## Examples

### Basic Synthesis Execution
The following is a conceptual example of how the `KnowledgeSynthesizer` is utilized within the compilation pipeline.

```typescript
import { KnowledgeSynthesizer } from 'yaaf/knowledge';

const synthesizer = new KnowledgeSynthesizer({
  concurrency: 5,
  outDir: './dist/kb'
});

// Assuming plan and ingestedContent are obtained from previous pipeline steps
await synthesizer.synthesize(plan, ingestedContent, {
  model: async ({ system, user }) => {
    // Call to LLM provider
    return "LLM generated content...";
  }
});
```

## See Also
*   `ConceptExtractor`
*   `CompilationPlan`
*   `ConceptRegistry`