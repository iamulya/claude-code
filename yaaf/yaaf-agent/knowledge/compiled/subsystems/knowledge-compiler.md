---
title: Knowledge Compiler
entity_type: subsystem
summary: Coordinates the multi-stage compilation pipeline for YAAF knowledge bases, encompassing ingestion, extraction, synthesis, linting, and more.
primary_files:
 - src/knowledge/compiler/index.ts
 - src/knowledge/compiler/compiler.ts
exports:
 - KBCompilerOptions
 - CompileOptions
 - CompileResult
 - CompilationPlan
 - SynthesisResult
 - LintReport
 - HealResult
 - DiscoveryResult
search_terms:
 - knowledge base generation
 - how to build a YAAF KB
 - document ingestion pipeline
 - extracting concepts from documents
 - synthesizing articles from notes
 - linting knowledge base articles
 - finding contradictions in KB
 - knowledge graph discovery
 - multi-modal knowledge extraction
 - incremental knowledge compilation
 - PDF to knowledge base
 - healing broken links in KB
 - ontology proposal generation
 - YAAF compilation process
stub: false
compiled_at: 2026-04-24T18:15:24.070Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Compiler is a comprehensive subsystem responsible for orchestrating the end-to-end process of transforming raw source materials into a structured, interlinked, and validated YAAF knowledge base. It manages a sophisticated multi-stage pipeline that automates tasks from initial data ingestion and analysis to final article generation, quality assurance, and maintenance [Source 1].

## Architecture

The Knowledge Compiler is architected as a modular pipeline, where each stage performs a distinct transformation or analysis task. The primary barrel file for the subsystem exports types that define the inputs, outputs, and configurations for each of these stages, indicating a clear separation of concerns [Source 1].

The key stages of the compilation pipeline include:

*   **Ingestion**: The entry point of the pipeline, handled by an `Ingester`. It processes raw content, including specialized handling for PDFs with configurable extractors for different providers (Gemini, Claude, OpenAI), and identifies content like images (`ImageRef`) [Source 1].
*   **Extraction**: This stage analyzes ingested content to create a `CompilationPlan`. It identifies candidate concepts and determines the actions needed to create or update articles (`ArticlePlan`, `ArticleAction`) [Source 1].
*   **Synthesis**: Generates the final markdown for articles based on the compilation plan. This stage produces a `SynthesisResult` and includes validation for [Frontmatter](../concepts/frontmatter.md) [Source 1].
*   **[Linting](../concepts/linting.md)**: Analyzes the generated knowledge base for issues such as broken links and style violations. It produces a `LintReport` detailing all `LintIssue` items and supports automatic fixing of certain problems (`AutoFixResult`) [Source 1].
*   **Post-processing**: A generic stage for applying final transformations to the compiled output [Source 1].
*   **Differential Planning**: Enables efficient incremental builds by comparing source file hashes against a manifest (`SourceHashManifest`) to create a `DifferentialPlan` that only processes changed content [Source 1].
*   **[Vision Pass](./vision-pass.md)**: A specialized stage for processing visual information, likely analyzing the images identified during ingestion [Source 1].
*   **Healing**: A maintenance stage designed to automatically repair issues within the knowledge base, such as broken links or structural inconsistencies, producing a `HealResult` [Source 1].
*   **[Discovery](../concepts/discovery.md)**: Analyzes the complete knowledge graph to identify structural patterns, such as depth imbalances, and suggest new articles or connections (`DiscoverySuggestion`) [Source 1].
*   **Deduplication**: A process to identify and report on duplicate or highly similar content within the knowledge base [Source 1].
*   **Contradiction Detection**: An advanced analysis stage that examines article content to find and report contradictory statements (`ContradictionReport`) [Source 1].
*   **[Ontology](../concepts/ontology.md) Proposals**: Generates suggestions for new concepts or relationships to enhance the knowledge base's ontology [Source 1].

Underpinning these stages are Core [Utilities](./utilities.md) for interacting with [LLM](../concepts/llm.md)s (`LLMCallFn`, `VisionCallFn`), handling transient API errors (`RetryOptions`), and managing article versions (`ArticleVersion`) [Source 1].

## Key APIs

The public API of the Knowledge Compiler is primarily exposed through a set of type definitions that describe the data structures and configuration options for the pipeline and its individual stages. Key types exported from `src/knowledge/compiler/index.ts` include:

*   `KBCompilerOptions`: The main configuration object for the entire compilation process.
*   `CompileOptions`: Options specific to a single compilation run.
*   `CompileResult`: The output of a successful compilation run.
*   `CompileProgressEvent`: An event type used for reporting progress during a long-running compilation.
*   `Ingester`: The interface for [Content Ingestion](../concepts/content-ingestion.md) modules.
*   `CompilationPlan`: The [Structured Output](../concepts/structured-output.md) of the extraction phase, detailing the work to be done.
*   `SynthesisResult`: The output of the article generation phase.
*   `LintReport`: The result of the linting phase, containing a list of identified issues.
*   `HealResult`: The outcome of the knowledge base healing process.
*   `DiscoveryResult`: The set of suggestions and analytics from the discovery phase [Source 1].

## Configuration

The Knowledge Compiler is configured through the `KBCompilerOptions` object. This allows developers to customize the behavior of the entire pipeline. Based on the exported types, configuration can be provided for nearly every stage, including:

*   LLM and Vision model clients (`LLMClientOptions`, `ModelLike`).
*   PDF ingestion methods (`PdfIngesterOptions`, including provider-specific options).
*   [Retry Logic](../concepts/retry-logic.md) for network requests (`RetryOptions`).
*   Linting rules and severity levels (`LintOptions`).
*   Options for advanced stages like healing (`HealOptions`), discovery (`DiscoveryOptions`), and contradiction detection (`ContradictionOptions`) [Source 1].

## Extension Points

The architecture of the Knowledge Compiler is designed to be extensible. The use of function types and interfaces for core components suggests that developers can provide custom implementations. Notable extension points include:

*   **Ingesters**: Developers can implement the `Ingester` interface to support new data sources.
*   **PDF Extractors**: The `PdfExtractFn` type allows for custom PDF text extraction logic.
*   **LLM/Vision Functions**: The `GenerateFn`, `LLMCallFn`, and `VisionCallFn` types allow for custom model interaction logic, enabling integration with any model provider.
*   **Plugins**: The existence of types like `MultiLayerGroundingOptions` suggests a plugin model for adding specialized capabilities like grounding [Source 1].

## Sources

[Source 1] `src/knowledge/compiler/index.ts`