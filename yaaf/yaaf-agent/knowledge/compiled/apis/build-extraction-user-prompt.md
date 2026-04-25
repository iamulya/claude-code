---
summary: Builds the user prompt for the LLM-based knowledge extraction process, incorporating source content and analysis.
export_name: buildExtractionUserPrompt
source_file: src/knowledge/compiler/extractor/prompt.ts
category: function
title: buildExtractionUserPrompt
entity_type: api
search_terms:
 - knowledge extraction prompt
 - create user prompt for LLM
 - prompt engineering for extraction
 - how to format user message for knowledge base
 - ingested content to prompt
 - static analysis in prompts
 - concept registry for LLM
 - ontology-grounded prompt
 - build LLM input
 - knowledge compiler prompt
 - user message construction
 - JSON compilation plan prompt
stub: false
compiled_at: 2026-04-24T16:53:27.290Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `buildExtractionUserPrompt` function constructs the user-facing portion of a prompt for the knowledge extraction Language Model ([LLM](../concepts/llm.md)). This function is a key part of the knowledge compilation process, responsible for assembling all necessary context for the LLM to analyze a piece of source content and decide how to integrate it into the knowledge base [Source 1].

It combines several sources of information into a single string [Source 1]:
1.  **Ingested Source Text**: The raw content to be analyzed, truncated to fit the LLM's [Context Window](../concepts/context-window.md).
2.  **Static Analysis Results**: Pre-computed facts about the source text, such as mentions of known entities and hints from its directory location.
3.  **[Concept Registry](../subsystems/concept-registry.md)**: A list of all articles that already exist in the knowledge base, representing the "known universe" of concepts.
4.  **[Ontology](../concepts/ontology.md)**: The schemas defining entity types and their [Frontmatter](../concepts/frontmatter.md), which describes the structure of knowledge base articles.

The resulting prompt is designed to be used with a fast and cost-effective model (e.g., Gemini 1.5 Flash) to generate a JSON "compilation plan." This plan specifies which articles to create or update and what relationships to establish between them [Source 1].

This function, along with `buildExtractionSystemPrompt`, applies several [Prompt Engineering](../concepts/prompt-engineering.md) principles, such as grounding the LLM in the domain, front-loading constraints, and providing pre-computed facts to guide the model's reasoning [Source 1].

## Signature

The function takes the ingested content, static analysis results, concept registry, and ontology as arguments and returns a formatted string [Source 1].

```typescript
export function buildExtractionUserPrompt(
  content: IngestedContent,
  staticResult: StaticAnalysisResult,
  registry: ConceptRegistry,
  ontology: KBOntology,
): string;
```

### Parameters

| Parameter      | Type                 | Description                                                                                                                            |
| -------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `content`      | `IngestedContent`    | An object representing the source text that has been ingested and is ready for processing [Source 1].                                  |
| `staticResult` | `StaticAnalysisResult` | The output from the static analysis phase, containing pre-computed information like entity mentions [Source 1].                        |
| `registry`     | `ConceptRegistry`    | A representation of all existing articles in the knowledge base, used to provide context about what is already known [Source 1].         |
| `ontology`     | `KBOntology`         | The [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md), which defines the valid entity types and their corresponding data schemas (frontmatter) [Source 1].          |

### Returns

-   `string`: A single string formatted as the user prompt for the knowledge extraction LLM.

## Examples

The following example demonstrates how to call `buildExtractionUserPrompt` with data gathered from earlier stages of the knowledge compilation pipeline.

```typescript
import { buildExtractionUserPrompt } from 'yaaf';
import type { IngestedContent, StaticAnalysisResult, ConceptRegistry, KBOntology } from 'yaaf';

// Assume these variables are populated from other parts of the knowledge
// compilation process, such as the ingester and static analyzer.
const ingestedContent: IngestedContent = { /* ... ingested source file data ... */ };
const staticAnalysis: StaticAnalysisResult = { /* ... results of static analysis ... */ };
const conceptRegistry: ConceptRegistry = { /* ... list of existing concepts ... */ };
const knowledgeBaseOntology: KBOntology = { /* ... schema for the knowledge base ... */ };

// Build the user prompt string
const userPrompt = buildExtractionUserPrompt(
  ingestedContent,
  staticAnalysis,
  conceptRegistry,
  knowledgeBaseOntology
);

// This userPrompt string can now be sent to an LLM as the user message,
// typically paired with a [[[[[[[[System Prompt]]]]]]]] from buildExtractionSystemPrompt.
console.log(userPrompt);
```

## See Also

-   `buildExtractionSystemPrompt`: The companion function that builds the System Prompt for the extraction LLM.

## Sources

[Source 1] src/knowledge/compiler/extractor/prompt.ts