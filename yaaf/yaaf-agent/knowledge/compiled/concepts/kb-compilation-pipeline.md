---
tags:
  - architecture
  - pipeline
  - knowledge-base
title: KB Compilation Pipeline
entity_type: concept
summary: The KB Compilation Pipeline is a multi-stage process managed by the KBCompiler that transforms raw source materials into a structured, LLM-authored knowledge base.
stub: false
compiled_at: 2026-04-16T14:22:22.142Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/compiler.ts
confidence: 0.95
---

## What It Is
The KB Compilation Pipeline is the core mechanism in YAAF for transforming unstructured "raw materials"—such as research papers, web clips, and documentation—into a production-grade, LLM-authored wiki. It solves the problem of knowledge fragmentation by providing a consistent, automated workflow for ingesting, extracting, synthesizing, and validating information.

The pipeline ensures that the resulting knowledge base (KB) follows a predefined ontology and maintains high structural integrity through automated linting and post-processing.

## How It Works in YAAF
The pipeline is coordinated by the `KBCompiler` class, which wires together four primary stages. It manages a specific directory layout where source files reside in a `raw/` directory and the generated wiki is stored in a `compiled/` directory.

### Pipeline Stages
The `KBCompiler` executes the following sequence:

1.  **Ingestion**: The `Ingester` scans the `raw/` directory for supported file types (e.g., `.md`, `.html`, `.pdf`). It converts these files into `IngestedContent` objects.
2.  **Extraction**: The `ConceptExtractor` analyzes the ingested content to identify key entities and relationships, producing a `CompilationPlan`. This stage typically requires an LLM (the `extractionModel`).
3.  **Synthesis**: The `KnowledgeSynthesizer` executes the compilation plan, using a `synthesisModel` to author markdown articles. These are saved to the `compiled/` directory, and a `.kb-registry.json` index is updated.
4.  **Linting**: The `KBLinter` performs a final pass to check for structural issues, broken wikilinks, or quality concerns, producing a `LintReport`.

### Directory Layout
The pipeline expects and maintains a specific file structure:
*   `ontology.yaml`: A required file loaded at initialization that defines the KB structure.
*   `raw/`: Source materials (e.g., `papers/`, `web-clips/`, `tools/`).
*   `compiled/`: The output wiki, organized by entity types (e.g., `concepts/`, `research-papers/`).
*   `.kb-registry.json`: An auto-maintained index cache.
*   `.kb-lint-report.json`: The report from the last linting pass.

### Advanced Pipeline Features
The pipeline supports several opt-in "Phase C" features for advanced KB maintenance:
*   **Heal**: An LLM-powered process to fix lint issues, such as broken wikilinks or low-quality articles.
*   **Discovery**: An analysis phase to identify "gaps" in the knowledge base, such as missing articles or weak connections.
*   **Vision**: A pass that uses vision-capable LLMs to generate alt-text for images found within the source materials.

## Configuration
The pipeline is configured via the `KBCompiler.create` method and the `CompileOptions` object passed to the `compile()` method.

```typescript
const compiler = await KBCompiler.create({
  kbDir: '/path/to/my-kb',
  extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
})

const result = await compiler.compile({
  incrementalMode: true, // Only process new or changed files
  concurrency: 3,        // Max parallel LLM calls
  heal: true,            // Opt-in to auto-healing lint issues
  discover: true         // Opt-in to gap discovery
})

console.log(`Created ${result.synthesis.created} articles in ${result.durationMs}ms`)
```

### Key Options
*   **incrementalMode**: When enabled, the compiler only processes source files that are newer than their compiled counterparts.
*   **dryRun**: If true, the pipeline runs the full extraction and synthesis logic but does not write changes to the disk.
*   **postProcess**: Configures wikilink resolution and article segmentation.
*   **concurrency**: Controls the number of simultaneous LLM requests during the synthesis stage to manage rate limits.