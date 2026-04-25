---
summary: An Entity Type is a schema defined in the ontology that classifies articles in a YAAF knowledge base, specifying their required frontmatter, article structure, and linking rules.
title: Entity Type
entity_type: concept
related_subsystems:
 - knowledge
search_terms:
 - ontology schema
 - define article types
 - knowledge base structure
 - ontology.yaml entity_types
 - custom article template
 - how to add a new document type
 - frontmatter validation rules
 - article structure enforcement
 - KB schema definition
 - linkable_to configuration
 - what is an entity type in yaaf
 - configure knowledge base entities
stub: false
compiled_at: 2026-04-24T17:54:51.265Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

An Entity Type is a classification for articles within a YAAF knowledge base, acting as a schema or template for a specific category of content [Source 1]. Defined within the `[[[[[[[[Ontology]]]]]]]].yaml` file, each Entity Type specifies the structure, [Frontmatter](./frontmatter.md) fields, validation rules, and inter-linking permissions for all articles belonging to it. For example, a knowledge base might define `concept`, `research_paper`, and `tool` as distinct Entity Types [Source 1].

The YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) requires a valid Ontology with defined Entity Types to operate; it will refuse to run without one [Source 1]. The compiler uses these definitions to organize the output, creating a dedicated subdirectory in the `compiled/` directory for each Entity Type [Source 1]. This system ensures that the knowledge base is well-structured, consistent, and legible to both humans and [LLM](./llm.md)s [Source 1].

## How It Works in YAAF

The Entity Type definitions within the `ontology.yaml` file serve as the single source of truth for the entire knowledge base compilation pipeline [Source 1]. Various subsystems consult these definitions at different stages:

*   **Extractor**: The `ConceptExtractor` uses the list of Entity Types to build its extraction prompt and to validate the classification of concepts found in raw source material [Source 1].
*   **Synthesizer**: The `KnowledgeSynthesizer` uses an Entity Type's `frontmatter` schema and `article_structure` to construct a precise prompt for the LLM, instructing it on how to write the final article. This ensures all generated articles of a given type have a consistent format and include all required information [Source 1].
*   **[Linter](./linter.md)**: The `KBLinter` validates compiled articles against their Entity Type definition. It checks for required frontmatter fields, validates field values (e.g., for `enum` types), and enforces linking rules defined in the `linkable_to` property [Source 1].

This tight integration of Entity Types throughout the pipeline ensures that the resulting knowledge base is structured, consistent, and self-validating [Source 1].

## Configuration

Entity Types are defined under the `entity_types` key in the project's `ontology.yaml` file. Each entry defines a new type of article the knowledge base can contain [Source 1].

An Entity Type definition includes several key properties:

*   `description`: A human-readable explanation of the entity.
*   `frontmatter`: A schema defining the required and optional YAML frontmatter fields for articles of this type. It specifies field names, data types (`string`, `string[]`, `enum`, `entity_ref`, etc.), and requirements.
*   `article_structure`: A list of headings that the LLM must use [when](../apis/when.md) generating the article body, each with a description of the expected content. Sections can be marked as required or optional.
*   `linkable_to`: A list of other Entity Types that articles of this type are permitted to wikilink to.
*   `indexable`: A boolean that determines if this Entity Type should be included in the global index.

The following is an example of a `concept` Entity Type definition from an `ontology.yaml` file [Source 1]:

```yaml
entity_types:
  concept:
    description: "A core idea, technique, or abstraction in ML"

    # Frontmatter schema — validated after every synthesis pass
    frontmatter:
      fields:
        title:
          description: "Full canonical title"
          type: string
          required: true
        entity_type:
          description: "Always 'concept'"
          type: string
          required: true
        status:
          description: "Maturity of this concept in the field"
          type: enum
          required: false
          enum: [established, emerging, deprecated, speculative]
        introduced_in:
          description: "DocId of the research paper that introduced this concept"
          type: entity_ref
          required: false
          target_entity_type: research_paper

    # Article structure — sections the LLM is instructed to write
    article_structure:
      - heading: "Overview"
        description: "What is this concept? Define it clearly and concisely."
        required: true
      - heading: "How It Works"
        description: "Mechanism, math, or algorithm — as appropriate for the concept."
        required: false

    # Which other entity types this article can wikilink to
    linkable_to:
      - concept
      - research_paper
      - tool

    # Whether this entity type appears in the global index
    indexable: true
```

YAAF also provides an LLM-powered `OntologyGenerator` to bootstrap this configuration by scanning a project's source code and documentation [Source 1].

## Sources
[Source 1] YAAF Knowledge Base. File: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md`.