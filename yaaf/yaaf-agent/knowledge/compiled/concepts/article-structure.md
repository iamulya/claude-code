---
summary: A schema defined within the YAAF knowledge base ontology that specifies the required and optional sections for each type of article.
title: Article Structure
entity_type: concept
related_subsystems:
 - Knowledge Synthesizer
search_terms:
 - ontology article structure
 - define KB article sections
 - how to structure knowledge base articles
 - ontology.yaml article_structure
 - LLM synthesis prompt structure
 - knowledge base schema
 - custom article headings
 - required article sections
 - YAAF knowledge synthesizer instructions
 - template for KB articles
 - entity type schema
 - knowledge base consistency
stub: false
compiled_at: 2026-04-24T17:52:19.783Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

Article Structure is a schema defined within the `[[Ontology]].yaml` file that dictates the headings, descriptions, and requirements for sections within a YAAF knowledge base article [Source 1]. For each [Entity Type](./entity-type.md) (e.g., `concept`, `research_paper`, `tool`), a specific article structure can be defined, ensuring that all articles of that type have a consistent and logical layout. This structure serves as a template for the [LLM](./llm.md)-powered synthesis process, guiding it to generate well-organized and predictable content [Source 1].

The primary problem it solves is ensuring structural consistency across the knowledge base. By enforcing a schema, it prevents the LLM from generating articles with arbitrary or missing sections, making the compiled knowledge base more legible and useful for both humans and other LLM agents [Source 1].

## How It Works in YAAF

The Article Structure is a core component of the [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md), which is considered the source of truth for the entire compilation pipeline [Source 1]. During the synthesis stage, the `KnowledgeSynthesizer` subsystem reads the `article_structure` definition for the target entity type from the `ontology.yaml` file. This definition is then used to construct the prompt for the LLM that will write the article [Source 1].

Each entry in the `article_structure` list contains three key fields:
*   `heading`: The literal markdown heading for the section (e.g., "How It Works").
*   `description`: A natural language instruction telling the LLM what content to generate for that section. The LLM uses these descriptions literally [when](../apis/when.md) authoring the content [Source 1].
*   `required`: A boolean value indicating whether the section must be included in the final article.

By carefully defining the descriptions for each heading, developers can precisely control the focus and content of each section in the generated articles [Source 1].

## Configuration

The Article Structure is configured within the `ontology.yaml` file under the `article_structure` key for each defined `entity_type`.

The following example defines the structure for a `concept` entity type, specifying one required section ("Overview") and several optional ones [Source 1].

```yaml
# In ontology.yaml
entity_types:
  concept:
    description: "A core idea, technique, or abstraction in ML"

    # ... other frontmatter fields ...

    # Article structure — sections the LLM is instructed to write
    article_structure:
      - heading: "Overview"
        description: "What is this concept? Define it clearly and concisely."
        required: true

      - heading: "How It Works"
        description: "Mechanism, math, or algorithm — as appropriate for the concept."
        required: false

      - heading: "Key Properties"
        description: "Important characteristics, edge cases, or trade-offs."
        required: false

      - heading: "Applications"
        description: "Where and how this concept is used in practice."
        required: false

      - heading: "Related Concepts"
        description: "Connections to other KB entities."
        required: false
```

## Sources

[Source 1] YAAF Knowledge Base. File: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md`