---
title: Knowledge Synthesis
entity_type: concept
summary: The core process in YAAF for generating structured knowledge articles from raw content using LLMs, involving validation, grounding, and ontology alignment.
stub: false
compiled_at: 2026-04-16T14:27:08.813Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/synthesizer.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
confidence: 0.92
---

---
title: Knowledge Synthesis
entity_type: concept
summary: The core process in YAAF for generating structured knowledge articles from raw content using LLMs, involving validation, grounding, and ontology alignment.
related_subsystems:
  - Knowledge Compiler
  - Ontology

## What It Is
Knowledge Synthesis is the final authoring stage of the YAAF knowledge base (KB) compilation pipeline. It is responsible for transforming raw ingested content and high-level compilation plans into structured, production-grade wiki articles. 

The process solves the problem of converting unstructured or semi-structured data into a consistent format that adheres to a specific ontology. By using Large Language Models (LLMs) as "synthetic authors," YAAF ensures that every article follows a uniform structure, includes required metadata, and maintains factual grounding in the source material.

## How It Works in YAAF
The synthesis process is managed by the `KnowledgeSynthesizer` class. It sits at the end of the compilation pipeline, consuming a `CompilationPlan` produced by earlier stages (such as the `ConceptExtractor`).

### The Synthesis Pipeline
For each article defined in a compilation plan, the synthesizer performs the following steps:

1.  **Source Gathering**: It collects all relevant source texts associated with the article from the ingested content map.
2.  **Context Preparation**: If the action is an update, it loads the existing compiled article to allow for merging new information.
3.  **LLM Invocation**: It constructs a synthesis prompt (comprising system instructions and user content) and calls a generative model. This is typically the most resource-intensive part of the pipeline.
4.  **Parsing and Validation**: The LLM's output is parsed into YAML frontmatter and a Markdown body. The frontmatter is validated and coerced against the defined `KBOntology` schema.
5.  **Metadata Injection**: The compiler injects system-level metadata, including `entity_type`, `compiled_at` timestamps, and confidence scores.
6.  **Grounding**: The synthesizer performs grounding validation to ensure the generated content is supported by the source material, resulting in a `groundingScore` (0-1).
7.  **Persistence**: The final article is written to the `compiled/` directory as a `.md` file.
8.  **Registry Update**: The `ConceptRegistry` is updated in-memory to reflect the new or modified article.
9.  **Stub Generation**: If the LLM identifies high-confidence "candidate concepts" that do not yet have articles, the synthesizer can auto-generate stub articles to be filled in later.

### Concurrency and Performance
Synthesis is designed for high throughput. Articles are synthesized in parallel, governed by a `concurrency` setting (defaulting to 3). Because each article synthesis is an independent LLM call, no cross-article ordering is required during the execution phase.

## Configuration
The synthesis process is configured via the `SynthesisOptions` object. Developers can control the behavior of the LLM authoring, file system interactions, and validation thresholds.

```typescript
const options: SynthesisOptions = {
  /** Maximum concurrent LLM calls (default: 3) */
  concurrency: 5,

  /** Preview changes without writing to disk */
  dryRun: false,

  /** 
   * Minimum confidence (0-1) required to auto-create 
   * stub articles for new concepts (default: 0.7) 
   */
  stubConfidenceThreshold: 0.8,

  /** 
   * Only synthesize if source files are newer 
   * than the compiled article 
   */
  incrementalMode: true
};
```

## Sources
- `src/knowledge/compiler/synthesizer/synthesizer.ts`
- `src/knowledge/compiler/synthesizer/types.ts`