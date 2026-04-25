---
summary: Provides the public API for the knowledge compilation extractor, handling static analysis and plan generation for KB articles.
primary_files:
 - src/knowledge/compiler/extractor/index.ts
 - src/knowledge/compiler/extractor/types.js
 - src/knowledge/compiler/extractor/extractor.js
title: Knowledge Compiler Extractor
entity_type: subsystem
exports:
 - CompilationPlan
 - ArticlePlan
 - ArticleAction
 - StaticAnalysisResult
 - CandidateConcept
 - GenerateFn
search_terms:
 - knowledge base static analysis
 - how to compile knowledge articles
 - generate compilation plan
 - concept extraction from text
 - KB article planning
 - YAAF knowledge compiler
 - StaticAnalysisResult type
 - CompilationPlan generation
 - extracting concepts for agents
 - article action planning
 - knowledge base pre-processing
stub: false
compiled_at: 2026-04-24T18:15:26.435Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [Knowledge Compiler](./knowledge-compiler.md) Extractor subsystem provides the public API for the concept extraction phase of the YAAF knowledge compilation process [Source 1]. Its primary responsibility is to define the data structures and function signatures required for performing static analysis on raw knowledge articles and generating a structured compilation plan. This plan outlines the concepts, actions, and relationships to be processed by downstream compiler stages.

## Architecture

The subsystem is architecturally centered around a barrel file, `src/knowledge/compiler/extractor/index.ts`, which serves as the public interface [Source 1]. This file aggregates and re-exports types and function signatures from internal modules, such as `types.js` and `extractor.js`.

The core of its design is a set of data structures that model the extraction process:
*   **Static Analysis:** The process begins with a static analysis of source material, the results of which are captured in the `StaticAnalysisResult` type. This includes identified `CandidateConcept`s.
*   **Plan Generation:** Based on the analysis, a `CompilationPlan` is generated. This serves as a high-level blueprint for the entire compilation task.
*   **Article-Specific Plans:** The `CompilationPlan` is composed of one or more `ArticlePlan`s, each detailing the steps for a single source article.
*   **Actions:** Each `ArticlePlan` contains a sequence of `ArticleAction`s, which are the specific, atomic operations to be performed.

The main logic for performing this transformation is represented by the `GenerateFn` type signature [Source 1].

## Key APIs

The primary API surface of the Knowledge Compiler Extractor consists of exported TypeScript types that define the inputs and outputs of the extraction process [Source 1].

*   **`StaticAnalysisResult`**: A data structure containing the results of a preliminary, static analysis of a source knowledge article.
*   **`CandidateConcept`**: Represents a concept identified during static analysis that is a candidate for inclusion in the compiled knowledge base.
*   **`CompilationPlan`**: The main output object, representing the complete, structured plan for compiling a set of knowledge articles.
*   **`ArticlePlan`**: A detailed, per-article plan that is part of a larger `CompilationPlan`.
*   **`ArticleAction`**: A specific, atomic operation to be performed on an article as part of an `ArticlePlan`.
*   **`GenerateFn`**: The type signature for the function responsible for executing the extraction logic and producing a `CompilationPlan`.

## Sources

[Source 1]: src/knowledge/compiler/extractor/index.ts