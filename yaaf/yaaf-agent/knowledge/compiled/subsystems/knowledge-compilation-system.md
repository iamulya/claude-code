---
summary: The subsystem responsible for extracting concepts from source documents and synthesizing them into structured knowledge base articles for YAAF.
primary_files:
 - src/knowledge/compiler/extractor/types.ts
contains:
 - apis/candidate-concept
 - apis/article-plan
 - apis/compilation-plan
 - apis/static-analysis-result
depends_on:
 - subsystems/knowledge-ingestion-system
title: Knowledge Compilation System
entity_type: subsystem
exports:
 - CompilationPlan
 - ArticlePlan
 - CandidateConcept
 - StaticAnalysisResult
search_terms:
 - concept extraction from documents
 - knowledge base article generation
 - how to create KB articles from source code
 - compilation plan
 - article plan
 - static analysis for knowledge extraction
 - LLM-based knowledge synthesis
 - YAAF concept extractor
 - YAAF knowledge synthesizer
 - automatically generate documentation
 - source to knowledge base pipeline
 - candidate concept discovery
stub: false
compiled_at: 2026-04-24T18:15:07.905Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Knowledge Compilation System is responsible for analyzing ingested source documents and planning the creation or update of knowledge base (KB) articles. It serves as the bridge between raw source material and structured, synthesized knowledge within the YAAF framework [Source 1].

The system operates in two distinct phases: concept extraction and knowledge synthesis. The primary output of the first phase, and the input to the second, is a `[[[[[[[[CompilationPlan]]]]]]]]`. This plan acts as a contract, defining which KB articles should be created or updated and what relationships they should have, based on the content of the source documents [Source 1].

## Architecture

The system's architecture is divided into two main components: the [Concept Extractor](./concept-extractor.md) and the [Knowledge Synthesizer](./knowledge-synthesizer.md) [Source 1].

**1. Concept Extractor**
The Concept Extractor analyzes source files to identify key concepts, relationships, and metadata. Its process includes a preliminary static analysis pass that runs before any [LLM](../concepts/llm.md) calls to gather context efficiently. This static analysis identifies known entity mentions, matches against existing KB articles, and estimates token counts to optimize subsequent LLM interactions [Source 1]. The final output of the Concept Extractor is a `CompilationPlan`, which provides a complete set of instructions for the next phase [Source 1].

**2. Knowledge Synthesizer**
The Knowledge Synthesizer consumes the `CompilationPlan` produced by the extractor. It is responsible for the actual authoring of the KB articles. It merges information from multiple source files, validates data against the project's [Ontology](../concepts/ontology.md), writes `wikilinks` for relationships, and creates stub articles for newly discovered concepts. The plan from the extractor is treated as guidance, not final content; the synthesizer performs the definitive writing and structuring of the knowledge [Source 1].

## Integration Points

The Knowledge Compilation System is designed to process the output of a [Knowledge Ingestion System](./knowledge-ingestion-system.md). It operates on ingested source documents and uses metadata from the ingestion phase, such as the `SourceTrustLevel`, to inform its planning process [Source 1].

## Key APIs

The primary API surface of this subsystem consists of the data structures that form the contract between its internal components. These types are defined in `src/knowledge/compiler/extractor/types.ts` [Source 1].

### [StaticAnalysisResult](../apis/static-analysis-result.md)

This data structure holds the output of the preliminary, non-LLM analysis pass. It is used to provide context and save tokens for subsequent LLM calls [Source 1].

- `entityMentions`: A list of known entities found in the source via a [Vocabulary](../concepts/vocabulary.md) scan.
- `registryMatches`: A list of existing KB articles that appear to be related to the source content.
- `directoryHint`: A suggested [Entity Type](../concepts/entity-type.md) based on the source file's directory path (e.g., `raw/tools/` might suggest the type 'tool').
- `tokenEstimate`: An approximate token count of the source text, used for planning truncation.

### [CandidateConcept](../apis/candidate-concept.md)

Represents a new concept discovered in a source document that does not yet have a corresponding KB article [Source 1].

- `name`: The canonical name for the concept, suggested by the LLM.
- `entityType`: The suggested entity type, which must exist in the defined ontology.
- `description`: A one-sentence description extracted from the source.
- `mentionCount`: The number of times the concept was mentioned.

### [ArticlePlan](../apis/article-plan.md)

A detailed plan for creating or updating a single KB article. A single source file can generate multiple `ArticlePlan` objects, and multiple source files can contribute to a single plan [Source 1].

- `docId`: The target path for the article, computed deterministically (e.g., `concepts/attention-mechanism`).
- `canonicalTitle`: The formal title of the article.
- `action`: The operation to perform: `create` for a new article, `update` for an existing one, or `skip` if the source is not KB-worthy.
- `sourcePaths`: A list of absolute file paths of the source documents contributing to this article.
- `knownLinkDocIds`: A list of `docId`s for other KB articles that this article should link to.
- `candidateNewConcepts`: A list of `CandidateConcept` objects discovered in the source texts.
- `suggested[[[[[[[[Frontmatter]]]]]]]]`: A record of Frontmatter fields and values inferred from the source.
- `confidence`: A score from 0 to 1 indicating the confidence in the entity classification.
- `sourceTrust`: The aggregate trust level of the contributing sources. [when](../apis/when.md) multiple sources are merged, the lowest trust level among them is used.

### CompilationPlan

The complete output of the Concept Extractor for a single run. It is the primary input for the Knowledge Synthesizer [Source 1].

- `sourceCount`: The total number of source files analyzed.
- `articles`: An array of `ArticlePlan` objects for all articles to be created or updated.
- `skipped`: A list of source files that were skipped, along with the reason.
- `blockedByMissingDeps`: A list of source files that could not be processed due to missing [Optional Dependencies](../concepts/optional-dependencies.md).
- `proposedEntityTypes`: A list of entity types suggested by the LLM that are not present in the project's ontology, serving as a structured warning for the user.
- `createdAt`: A timestamp indicating when the plan was generated.

## Sources

[Source 1] `src/knowledge/compiler/extractor/types.ts`