---
summary: A comprehensive system for ingesting raw source material, compiling it into structured knowledge articles, and providing runtime access and analytics for YAAF agents.
primary_files:
 - src/knowledge/compiler/extractor/types.ts
 - src/knowledge/store/analytics.ts
title: Knowledge Base
entity_type: subsystem
exports:
 - CompilationPlan
 - ArticlePlan
 - KBAnalytics
 - KBHitRecord
search_terms:
 - agent knowledge management
 - RAG knowledge source
 - how to compile documentation
 - YAAF knowledge compiler
 - automatic documentation generation
 - KB article synthesis
 - concept extraction from source
 - knowledge base analytics
 - document hit tracking
 - prioritize article updates
 - compilation plan
 - static analysis for KB
 - what is a compilation plan
 - how to track document usage
stub: false
compiled_at: 2026-04-24T18:14:04.836Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/types.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/analytics.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Knowledge Base subsystem provides the core functionality for creating, managing, and utilizing a corpus of structured information for YAAF agents. It is designed to transform unstructured or semi-structured source materials (such as source code, documentation, and research papers) into a coherent and queryable set of encyclopedic articles. This compiled knowledge serves as the primary information source for agents at runtime and can also be used for generating human-readable documentation [Source 1].

The subsystem's responsibilities are divided into two main areas: a compile-time pipeline for knowledge extraction and synthesis, and a runtime component for access and analytics. This architecture creates a feedback loop where runtime usage data can inform and prioritize future compilation efforts [Source 2].

## Architecture

The Knowledge Base is architecturally divided into a multi-stage compilation pipeline and a runtime analytics component.

### Compilation Pipeline

The process of converting raw source files into compiled knowledge articles involves several distinct stages.

1.  **Ingestion**: This initial stage is responsible for reading raw source files. It determines a `SourceTrustLevel` for each source, which is a conservative measure of its reliability. [when](../apis/when.md) multiple sources are merged into a single article, the lowest trust level among them is used for the final article [Source 1].

2.  **Concept Extraction**: This stage analyzes ingested content to determine what knowledge articles should be created or updated. It is a two-step process:
    *   **Static Analysis**: A preliminary pass is performed without using an [LLM](../concepts/llm.md). This pass scans for known terms from a [Vocabulary](../concepts/vocabulary.md), identifies existing articles in the registry that might be relevant, estimates the token count of the source, and may infer an [Entity Type](../concepts/entity-type.md) from the source's directory structure (e.g., `raw/papers/` suggests 'research_paper'). The output is a `StaticAnalysisResult` object [Source 1].
    *   **LLM-driven Planning**: The source content and the results of the static analysis are then passed to an LLM. The LLM's task is to produce a `CompilationPlan`, which is a structured set of instructions for the next stage. This plan outlines which articles to create or update, suggests [Frontmatter](../concepts/frontmatter.md), identifies links to other articles, and flags new concepts discovered in the text. The plan is guidance, not final content [Source 1].

3.  **Knowledge Synthesis**: The [Knowledge Synthesizer](./knowledge-synthesizer.md) is the final stage of the pipeline. It consumes the `CompilationPlan` produced by the extractor and performs the actions required to write the final Markdown articles. Its responsibilities include:
    *   Creating new articles from scratch.
    *   Merging new information from sources into existing articles.
    *   Writing `wikilinks` to connect related articles based on the `knownLinkDocIds` in the plan.
    *   Creating stub articles for high-confidence `CandidateConcept`s discovered by the extractor [Source 1].

### Runtime Analytics

To improve the knowledge base over time, the `KBAnalytics` component tracks how articles are used by agents during runtime sessions.

*   It records access events as `KBHitRecord` objects, capturing the timestamp, document ID, search query (if any), and relevance score [Source 2].
*   These records are written asynchronously to a ring-buffered JSONL file (`.kb-analytics.jsonl`) to avoid blocking agent operations [Source 2].
*   The compilation pipeline's [Discovery](../concepts/discovery.md) phase can later consume this analytics file to prioritize the re-synthesis of articles that are frequently accessed but may be stale, thus creating a data-driven feedback loop for knowledge maintenance [Source 2].

## Integration Points

*   **Agents**: At runtime, agents interact with the Knowledge Base store to fetch documents and perform searches, forming the basis for Retrieval-Augmented Generation (RAG) patterns.
*   **Compiler [CLI](./cli.md)**: The compilation pipeline is typically invoked by a developer via a command-line tool or as part of a build process to update the knowledge base from source materials.
*   **Discovery Phase**: The compiler's discovery phase reads the output of `KBAnalytics` to inform its compilation strategy, deciding which articles to prioritize for updates [Source 2].

## Key APIs

The primary APIs of this subsystem are the data structures that define the contracts between its different stages.

### `CompilationPlan`

The `CompilationPlan` is the central artifact produced by the [Concept Extractor](./concept-extractor.md). It is a complete set of instructions for the Knowledge Synthesizer for a single compilation run [Source 1]. Key fields include:
*   `articles`: An array of `ArticlePlan` objects, detailing each article to be created or updated.
*   `skipped`: A list of source files that were deemed not worthy of inclusion in the knowledge base, along with the reason for skipping.
*   `proposedEntityTypes`: A list of entity types suggested by the LLM that are not defined in the project's [Ontology](../concepts/ontology.md). This serves as a structured warning for the developer to update the ontology.
*   `sourceCount`: The total number of source files analyzed in the run.

### `ArticlePlan`

An `ArticlePlan` contains all the information needed to synthesize a single knowledge base article. One source file can generate multiple plans, and multiple sources can contribute to a single plan [Source 1]. Key fields include:
*   `docId`: The unique, deterministically computed identifier for the target article (e.g., `concepts/attention-mechanism`).
*   `action`: The operation to perform: `create`, `update`, or `skip`.
*   `sourcePaths`: A list of absolute file paths for all source materials that contribute to this article.
*   `knownLinkDocIds`: A list of `docId`s for other articles that should be linked from this one.
*   `candidateNewConcepts`: A list of new concepts found in the source that may warrant their own (stub) articles.
*   `suggestedFrontmatter`: Key-value pairs for the article's frontmatter, as inferred by the compiler.
*   `confidence`: A score from 0 to 1 indicating the compiler's confidence in the entity classification.

### `KBAnalytics`

A class responsible for collecting runtime usage data of the knowledge base. It provides methods to record hits and flushes the data to a file upon shutdown [Source 2].

### `KBHitRecord`

A data structure representing a single access event on a knowledge base document [Source 2]. It contains:
*   `ts`: The event timestamp.
*   `docId`: The identifier of the accessed document.
*   `query`: The search query that led to the access.
*   `score`: The relevance score from the search.

## Configuration

While direct configuration via `AgentConfig` is not detailed in the provided sources, the system relies on an external [Ontology Definition](../concepts/ontology-definition.md). The `CompilationPlan`'s `proposedEntityTypes` field implies the existence of a project-level configuration file (e.g., `ontology.yaml`) where developers define the valid set of entity types (like `concept`, `api`, `subsystem`, etc.). When the compiler encounters a type not present in this ontology, it flags it in the compilation result for the developer to review and potentially add [Source 1].

## Sources

*   [Source 1] `src/knowledge/compiler/extractor/types.ts`
*   [Source 2] `src/knowledge/store/analytics.ts`