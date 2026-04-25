---
summary: Manages the LLM-based classification and extraction of knowledge entities from source text into a structured compilation plan.
primary_files:
 - src/knowledge/compiler/extractor/prompt.ts
title: Knowledge Extraction Subsystem
entity_type: subsystem
exports:
 - buildExtractionSystemPrompt
 - buildExtractionUserPrompt
search_terms:
 - LLM knowledge extraction
 - structured data from text
 - compilation plan generation
 - ontology-based extraction
 - concept classification
 - entity recognition from source
 - how to build prompts for extraction
 - JSON output from LLM
 - static analysis for LLM
 - grounding LLM with ontology
 - few-shot prompting for JSON
 - prompt engineering for classification
stub: false
compiled_at: 2026-04-24T18:15:41.284Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Extraction Subsystem is responsible for the [LLM](../concepts/llm.md)-based classification pass during knowledge compilation [Source 1]. It takes ingested source text and transforms it into a structured "compilation plan" in JSON format. This plan specifies which knowledge base articles should be created or updated and defines the relationships between them [Source 1]. This process is designed to be handled by a fast and cost-effective LLM, such as `gemini-2.5-flash` or an equivalent model [Source 1].

## Architecture

The core of this subsystem is the "[Concept Extractor](./concept-extractor.md) Prompt Builder," which constructs the system and user prompts fed to the extraction LLM [Source 1]. The [Prompt Engineering](../concepts/prompt-engineering.md) strategy is designed to ground the model and constrain its output effectively.

The prompt builder assembles the following inputs [Source 1]:
1.  **[Ontology](../concepts/ontology.md)**: The knowledge base's entity types and [Frontmatter](../concepts/frontmatter.md) schemas, which define the structure of valid articles.
2.  **[Concept Registry](./concept-registry.md)**: A list of all existing articles, representing the "known universe" to the model.
3.  **[Vocabulary](../concepts/vocabulary.md)**: A collection of canonical terms and their aliases, representing the "known terminology."
4.  **Static Analysis**: Pre-computed data, such as entity mentions and directory hints, presented to the LLM as established facts.
5.  **Ingested Source Text**: The raw content to be analyzed, truncated to fit within the model's [Token Budget](../concepts/token-budget.md).

The construction of the prompts follows several key principles [Source 1]:
*   The LLM is first grounded in the domain by being shown the ontology before the source text.
*   The most constraining information, such as entity types and the concept registry, is front-loaded in the prompt.
*   Static analysis results are presented as pre-computed facts for the LLM to rely on.
*   The target JSON schema for the compilation plan is kept minimal and explicit.
*   Few-shot examples are used to demonstrate the expected JSON output format.

## Integration Points

The Knowledge Extraction Subsystem consumes data from several other parts of the framework:
*   It receives `IngestedContent` from the [Ingester](../apis/ingester.md) component [Source 1].
*   It uses the `KBOntology` and `ConceptRegistry` provided by the [Ontology System](./ontology-system.md) [Source 1].
*   It takes a `StaticAnalysisResult` as input from a static analysis component [Source 1].

The primary output of this subsystem is the [JSON Compilation Plan](../concepts/json-compilation-plan.md), which is consumed by a subsequent stage in the knowledge compilation pipeline to perform the actual creation or updating of knowledge base articles [Source 1].

## Key APIs

The public API for this subsystem is exposed through functions that build the necessary prompts.

*   `buildExtractionSystemPrompt(ontology: KBOntology): string`
    *   This function builds the [System Prompt](../concepts/system-prompt.md), which grounds the LLM in the knowledge base's domain by providing it with the [Ontology Definition](../concepts/ontology-definition.md) [Source 1].

*   `buildExtractionUserPrompt(content: IngestedContent, staticResult: StaticAnalysisResult, registry: ConceptRegistry, ontology: KBOntology): string`
    *   This function constructs the user prompt, which contains the specific task details, including the source text, static analysis results, and the registry of existing concepts [Source 1].

## Sources

[Source 1]: `src/knowledge/compiler/extractor/prompt.ts`