---
summary: Builds the user prompt for the LLM-based knowledge extraction pass, combining source content, static analysis, and registry state.
export_name: buildExtractionUserPrompt
source_file: src/knowledge/compiler/extractor/prompt.ts
category: function
title: buildExtractionUserPrompt
entity_type: api
stub: false
compiled_at: 2026-04-16T14:23:06.582Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
confidence: 1
---

## Overview
The `buildExtractionUserPrompt` function is a core utility in the YAAF knowledge base compiler's extraction phase. It generates the specific user-facing prompt used to instruct an LLM (typically a high-speed model like Gemini 2.5 Flash) to analyze ingested content and produce a structured compilation plan.

The function applies prompt engineering principles to ground the LLM in the existing "known universe" of the knowledge base before presenting the new source material. It integrates the domain ontology, the current state of the concept registry, and pre-computed static analysis facts to ensure the LLM produces accurate JSON instructions for creating or updating articles and their relationships.

## Signature / Constructor

```typescript
export function buildExtractionUserPrompt(
  content: IngestedContent,
  staticResult: StaticAnalysisResult,
  registry: ConceptRegistry,
  ontology: KBOntology,
): string
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `content` | `IngestedContent` | The raw source text and associated metadata from the ingester, potentially truncated to fit token budgets. |
| `staticResult` | `StaticAnalysisResult` | Pre-computed facts about the source, such as entity mentions and directory-based hints. |
| `registry` | `ConceptRegistry` | The current state of the knowledge base, including existing articles and canonical terminology. |
| `ontology` | `KBOntology` | The schema defining valid entity types, frontmatter requirements, and relationship rules. |

## Examples

### Basic Usage
This example demonstrates how the function is typically invoked within the extraction pipeline to prepare a prompt for an LLM provider.

```typescript
import { buildExtractionUserPrompt } from 'yaaf/knowledge/compiler/extractor/prompt';

const userPrompt = buildExtractionUserPrompt(
  ingestedSource,
  staticAnalysis,
  currentRegistry,
  domainOntology
);

// The resulting string is then passed to the LLM
const response = await llm.generate(userPrompt);
const compilationPlan = JSON.parse(response);
```

## See Also
* `buildExtractionSystemPrompt`: The companion function that generates the system-level instructions for the extraction model.