---
title: Knowledge Base Compilation
entity_type: subsystem
summary: A logical subsystem of YAAF responsible for ingesting source content, extracting concepts, and synthesizing a structured knowledge base.
primary_files:
  - src/knowledge/compiler/synthesizer/synthesizer.ts
exports:
  - KnowledgeSynthesizer
stub: false
compiled_at: 2026-04-16T14:27:00.311Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/synthesizer.ts
confidence: 0.95
---

## Purpose
The Knowledge Base Compilation subsystem serves as the final authoring stage in the YAAF knowledge pipeline. Its primary role is to transform raw ingested content and structured compilation plans into a cohesive, validated, and versioned set of markdown articles. It ensures that the resulting knowledge base adheres to a defined ontology and maintains a centralized registry of concepts.

## Architecture
The subsystem is centered around the `KnowledgeSynthesizer`, which operates as the terminal step in a multi-stage pipeline:

1.  **ConceptExtractor**: Produces a `CompilationPlan`.
2.  **KnowledgeSynthesizer**: Consumes the plan and `IngestedContent` to produce compiled markdown files and an updated registry.

### Synthesis Workflow
For each `ArticlePlan` defined in a `CompilationPlan`, the synthesizer performs the following sequence:

1.  **Source Gathering**: Collects relevant source texts from the ingested content map.
2.  **State Management**: If the action is an update, it loads the existing compiled article to maintain continuity.
3.  **Prompt Engineering**: Constructs synthesis prompts (system and user) for the generative model.
4.  **Generative Synthesis**: Invokes a high-capacity generative model to author the article content.
5.  **Parsing and Validation**: Extracts the frontmatter and body from the LLM output, validating the frontmatter against the system's ontology schema.
6.  **Metadata Injection**: Appends compiler-specific metadata, including `entity_type`, `compiled_at` timestamps, stub status, and confidence scores.
7.  **Persistence**: Writes the final article to the filesystem (typically `compiled/{docId}.md`) using versioning controls.
8.  **Registry Update**: Updates the in-memory `ConceptRegistry` and, for high-confidence candidate concepts, generates initial stub articles.

### Concurrency and Performance
The synthesis process is designed for parallel execution. Articles are synthesized independently, allowing the system to process multiple documents concurrently. The default concurrency limit is set to 3 to manage LLM rate limits and resource consumption.

## Key APIs
The primary interface for this subsystem is the `KnowledgeSynthesizer` class.

### KnowledgeSynthesizer
The main orchestrator of the synthesis process. It coordinates between the generative models, the filesystem, and the ontology registry.

**Key Responsibilities:**
*   Processing `CompilationPlan` objects.
*   Managing the lifecycle of article generation.
*   Ensuring schema compliance for all generated knowledge artifacts.
*   Maintaining the `.kb-registry.json` manifest.

## Configuration
The subsystem is configured via options passed to the `KnowledgeSynthesizer`, which include:

*   **Concurrency**: Controls the number of simultaneous LLM calls (default: 3).
*   **Models**: Specification of the generative models used for synthesis.
*   **Paths**: Configuration for output directories and registry file locations.

## Extension Points
The subsystem utilizes several internal utilities and strategies that can be customized:

*   **GenerateFn**: The functional interface for the generative model, allowing different LLM providers to be plugged into the synthesis pipeline.
*   **Versioning Strategy**: Handled via `writeWithVersioning` to manage how existing articles are overwritten or archived.
*   **Validation Logic**: Uses `validateGrounding` to ensure synthesized content remains faithful to the source material.