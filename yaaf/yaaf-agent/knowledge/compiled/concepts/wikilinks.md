---
summary: Wikilinks are the mechanism for creating explicit, validated cross-references between articles in a YAAF compiled knowledge base.
title: Wikilinks
entity_type: concept
related_subsystems:
 - knowledge
search_terms:
 - internal linking in YAAF
 - how to cross-reference articles
 - what is a docId
 - knowledge base links
 - linkable_to ontology
 - reciprocal links
 - preventing hallucinated links
 - KBLinter link validation
 - buildLinkGraph utility
 - entity_ref frontmatter type
 - YAAF wiki links
 - knowledge graph relationships
 - cross-linking documents
stub: false
compiled_at: 2026-04-24T18:05:12.445Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
compiled_from_quality: documentation
confidence: 0.85
---

## What It Is

Wikilinks are the primary mechanism for creating explicit, machine-readable relationships between articles within a YAAF compiled knowledge base [Source 1]. They function as internal hyperlinks that connect related concepts, [Tools](../subsystems/tools.md), and other entities defined in the knowledge base's [Ontology](./ontology.md).

The purpose of wikilinks is to transform a collection of individual documents into a structured, cross-linked wiki. This structure is a core component of YAAF's knowledge base design, which favors a "compile your knowledge" approach over traditional Retrieval-Augmented Generation (RAG). By explicitly capturing relationships, wikilinks provide the [LLM](./llm.md) with a coherent, interconnected view of the domain, which is not possible with the unstructured text chunks retrieved in a typical RAG system [Source 1].

## How It Works in YAAF

The creation, validation, and management of wikilinks are integrated throughout the knowledge base compilation pipeline, from initial configuration to final [Linting](./linting.md) [Source 1].

### [Ontology Definition](./ontology-definition.md)

The rules governing which articles can link to others are defined in the `ontology.yaml` file. Each [Entity Type](./entity-type.md) has a `linkable_to` property that lists the other entity types it is permitted to reference. This schema acts as the source of truth for link validation [Source 1].

Additionally, the ontology can define [Frontmatter](./frontmatter.md) fields with the type `entity_ref`. This type is used for structured, semantic links, such as specifying the research paper that introduced a concept. These references use a `docId` to identify the target article [Source 1].

### Extraction and Synthesis

During the compilation process, the `ConceptExtractor` performs a [Vocabulary](./vocabulary.md) scan to identify known entities before invoking the LLM. This step ensures that only registry-validated `docId`s are passed to the `KnowledgeSynthesizer`, which prevents the LLM from hallucinating links to non-existent articles [Source 1]. The synthesizer then generates the article markdown, embedding the wikilinks within the text.

### Linting and Validation

After articles are synthesized, the `KB[[[[[[[[Linter]]]]]]]]` validates the integrity of all wikilinks. It performs several checks [Source 1]:
*   **Existence:** Ensures that every link points to an existing article in the `.kb-registry.json`.
*   **Schema Compliance:** Verifies that the link conforms to the `linkable_to` rules defined in the ontology. For example, it would flag an attempt to link from a `tool` article to a `research_paper` if the ontology does not permit it.
*   **Reciprocity:** Checks for reciprocal links where appropriate, helping to maintain a consistent knowledge graph.

The Linter uses [Utilities](../subsystems/utilities.md) such as `extractWikilinks` and `buildLinkGraph` to parse the articles and analyze the network of relationships [Source 1].

## Configuration

Developers configure wikilink behavior primarily through the `ontology.yaml` file. The `linkable_to` array specifies valid target entity types for links originating from an article of a given type. The `entity_ref` type is used in the frontmatter schema to create structured references.

The following example from an ontology for a machine learning knowledge base shows how a `concept` entity is configured. It can link to other `concept` articles, `research_paper` articles, and `tool` articles. It also has an optional `introduced_in` frontmatter field that must be a reference to a `research_paper` [Source 1].

```yaml
# From ontology.yaml
entity_types:
  concept:
    description: "A core idea, technique, or abstraction in ML"

    frontmatter:
      fields:
        # ... other fields
        introduced_in:
          description: "DocId of the research paper that introduced this concept"
          type: entity_ref
          required: false
          target_entity_type: research_paper

    # Which other entity types this article can wikilink to
    linkable_to:
      - concept
      - research_paper
      - tool
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md