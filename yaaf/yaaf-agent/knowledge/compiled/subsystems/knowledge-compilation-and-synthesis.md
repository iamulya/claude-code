---
summary: Manages the process of compiling raw source documents into structured, frontmatter-validated knowledge base articles.
primary_files:
 - src/knowledge/compiler/synthesizer/types.ts
title: Knowledge Compilation and Synthesis
entity_type: subsystem
exports:
 - SynthesisProgressEvent
 - ArticleSynthesisResult
 - SynthesisResult
 - SynthesisOptions
 - FrontmatterValidationResult
 - ParsedArticle
search_terms:
 - knowledge base generation
 - document compilation
 - markdown article synthesis
 - how to compile sources into docs
 - automatic documentation writing
 - frontmatter validation
 - incremental compilation
 - dry run knowledge build
 - crash recovery for compilation
 - concurrent article generation
 - SynthesisOptions configuration
 - ArticleSynthesisResult meaning
 - checkpointing during compilation
stub: false
compiled_at: 2026-04-24T18:15:04.071Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Knowledge Compilation and Synthesis subsystem is responsible for the final stage of the knowledge base generation process. It consumes a `CompilationPlan` from the extractor subsystem and orchestrates the creation and updating of markdown articles in the compiled knowledge base directory [Source 1]. Its primary functions include generating article content, validating YAML [Frontmatter](../concepts/frontmatter.md), writing files to disk, and providing detailed results and progress feedback for the overall compilation process [Source 1].

## Architecture

This subsystem is architected around a central `KnowledgeSynthesizer` process (inferred from file names and types) that operates on a per-article basis according to a provided plan. Its internal data structures define the inputs, outputs, and configuration for a synthesis run [Source 1].

Key data structures include:

*   **`SynthesisOptions`**: A configuration object that controls the behavior of the synthesizer, including concurrency, execution mode (dry run vs. actual), and incremental build settings [Source 1].
*   **`SynthesisResult`**: A summary object returned at the end of a compilation run. It contains aggregate counts of created, updated, skipped, and failed articles, along with a detailed list of per-article results [Source 1].
*   **`ArticleSynthesisResult`**: A detailed report for a single article. It captures the action taken (`created`, `updated`, `skipped`, `failed`), metadata like word count, and output paths. It also serves as a data carrier for subsequent pipeline stages, providing the article's body, source file paths, and a `ConceptRegistryEntry` for later processing [Source 1].
*   **`ParsedArticle`** and **`FrontmatterValidationResult`**: These types indicate an internal step for parsing the generated markdown and validating its frontmatter against a schema, separating valid fields from errors and warnings [Source 1].

The subsystem is designed to support concurrent article synthesis to improve performance, with the level of concurrency being configurable [Source 1].

## Integration Points

The Synthesis subsystem integrates with several other parts of the YAAF [Knowledge Compiler](./knowledge-compiler.md):

*   **Extractor Subsystem**: It receives a `CompilationPlan` which dictates the articles to be created or updated. The `ArticleAction` type is imported from the extractor [Source 1].
*   **[[]] System]]**: After synthesizing an article, it produces a `ConceptRegistryEntry`. This entry is intended for batch application to the [Concept Registry](./concept-registry.md) after all concurrent synthesis tasks are complete [Source 1].
*   **Grounding/Validation Pass**: The `ArticleSynthesisResult` includes a `groundingScore`, the article `body`, and a list of `sourcePaths`. These fields are passed to a subsequent grounding pass, which validates the generated content against its original sources to prevent hallucinations [Source 1].
*   **Compiler/[CLI](./cli.md)**: The subsystem exposes `onProgress` and `onArticleComplete` callbacks. The CLI uses `onProgress` to display real-time status updates. The main compiler process uses `onArticleComplete` to implement a crash-recovery mechanism by checkpointing the `docId` of each successfully written article [Source 1].

## Key APIs

The public interface of this subsystem is defined by the data types used to configure and report on the synthesis process [Source 1].

*   **`SynthesisOptions`**: The primary input type for configuring a synthesis run.
*   **`SynthesisResult`**: The primary return type summarizing the outcome of a run.
*   **`ArticleSynthesisResult`**: The data structure representing the detailed outcome for a single article.
*   **`SynthesisProgressEvent`**: An event type emitted during compilation for real-time feedback.

## Configuration

The behavior of the [Knowledge Synthesizer](./knowledge-synthesizer.md) is controlled via the `SynthesisOptions` object, which includes the following parameters:

*   **`concurrency`**: Sets the maximum number of articles to synthesize in parallel. Defaults to 3. Higher values can increase speed at the cost of higher API quota consumption [Source 1].
*   **`dryRun`**: If `true`, the synthesizer will generate article content but will not write any files to disk. This is useful for previewing changes [Source 1].
*   **`stubConfidenceThreshold`**: The minimum confidence score (default: 0.7) required to automatically create a stub article for a newly identified concept candidate [Source 1].
*   **`incrementalMode`**: If `true`, the synthesizer will skip articles whose source files have not been modified since the last time the compiled article was written (based on file modification times) [Source 1].
*   **`skipDocIds`**: A `Set` of article `docId`s to ignore completely. This is used by the [Differential Compiler](../concepts/differential-compiler.md) to bypass articles that are determined to be unchanged [Source 1].

## Extension Points

The subsystem provides callback-based extension points within the `SynthesisOptions` configuration:

*   **`onProgress`**: A callback function that receives `SynthesisProgressEvent` objects. This allows external [Tools](./tools.md), such as a command-line interface, to monitor the synthesis process in real-time [Source 1].
*   **`onArticleComplete`**: An asynchronous callback invoked immediately after an article file is successfully written to disk. This hook is specifically designed to support crash recovery. The compiler uses it to atomically update a checkpoint file, allowing a subsequent run to skip already completed articles and resume from the point of failure [Source 1].

## Sources

[Source 1] src/knowledge/compiler/synthesizer/types.ts