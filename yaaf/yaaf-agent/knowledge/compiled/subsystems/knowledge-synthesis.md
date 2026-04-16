---
summary: The subsystem responsible for building LLM prompts to author or update knowledge base articles based on extracted plans and source material.
primary_files:
  - src/knowledge/compiler/synthesizer/prompt.ts
title: Knowledge Synthesis Subsystem
entity_type: subsystem
exports:
  - generateStubArticle
stub: false
compiled_at: 2026-04-16T14:26:43.820Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/prompt.ts
confidence: 0.95
---

## Purpose
The Knowledge Synthesis Subsystem serves as the authoring engine within the YAAF knowledge compiler. Its primary role is to transform structured article plans, raw source materials, and ontological constraints into high-quality, encyclopedic markdown documents. It ensures that generated content adheres to specific domain contexts, follows predefined entity schemas, and maintains internal consistency through the use of wikilinks.

## Architecture
The subsystem is structured as a prompt construction engine that prepares data for high-capability Large Language Models (LLMs), such as Gemini 1.5 Pro. It operates by bifurcating information into system-level instructions and user-level data.

### Prompt Components
The synthesizer constructs prompts based on several inputs:

*   **System Instructions**: These define the domain context, the specific schema for the entity type (including required frontmatter fields and article structure), and strict authoring rules. These rules mandate an encyclopedic style, the use of wikilinks for related concepts, and a prohibition against hallucinating facts not present in the source material.
*   **User Context**: This includes the specific **Article Plan** (detailing what to write and which links to weave in), existing article content (for updates), budget-limited source texts, valid wikilink targets, and suggested frontmatter values derived from the extraction phase.

### Output Contract
The subsystem is designed to produce a complete markdown document that includes:
1.  A YAML frontmatter block.
2.  A structure aligned with the specific `article_structure` defined for the entity type.
3.  Internal references formatted as `[[wikilinks]]`.

## Key APIs
The subsystem provides specialized functions for different stages of the knowledge lifecycle.

### generateStubArticle
This function generates minimal placeholder articles for candidate new concepts. Stubs are used when initial source material is insufficient for a full article, allowing the concept to be registered in the ontology and fleshed out in subsequent compilation passes as more data becomes available.

## Integration Points
The Knowledge Synthesis Subsystem interacts with several other components of the knowledge pipeline:
*   **Ontology**: References `KBOntology` and `ConceptRegistry` to ensure articles align with the defined domain schema.
*   **Ingester**: Consumes `IngestedContent` as the raw source material for synthesis.
*   **Extractor**: Utilizes the `ArticlePlan` and suggested frontmatter generated during the extraction phase to guide the LLM's authoring process.

## Sources
* `src/knowledge/compiler/synthesizer/prompt.ts`