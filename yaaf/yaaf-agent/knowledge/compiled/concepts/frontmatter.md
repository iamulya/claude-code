---
summary: Structured metadata block at the beginning of a knowledge base article, used for categorization and compilation.
title: Frontmatter
entity_type: concept
related_subsystems:
 - Knowledge Compiler
 - Knowledge Linter
 - Knowledge Store
search_terms:
 - article metadata
 - YAML frontmatter block
 - knowledge base schema
 - how to define article fields
 - ontology frontmatter fields
 - frontmatter validation
 - compiler-injected metadata
 - what is frontmatter in yaaf
 - structured article data
 - article properties
 - frontmatter schema definition
stub: false
compiled_at: 2026-04-24T17:55:31.809Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/frontmatter.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Frontmatter is a block of structured metadata, formatted in YAML, that appears at the beginning of every compiled article in a YAAF Knowledge Base [Source 1]. It is delimited by `---` on both sides. This metadata provides a machine-readable summary of the article's properties, such as its title, type, relationships to other articles, and compilation details [Source 1, Source 2].

The primary purpose of frontmatter is to make the knowledge base legible to both humans and the YAAF framework's tooling [Source 1]. It enables automated validation, linking, and categorization, which are central to the "compile your knowledge" approach that YAAF uses as an alternative to traditional Retrieval-Augmented Generation (RAG) [Source 1]. The schema for an article's frontmatter is defined in the `Ontology.yaml` file [Source 1].

## How It Works in YAAF

Frontmatter is created and processed at multiple stages of the knowledge base compilation pipeline [Source 1, Source 2].

1.  **Schema Definition**: The structure and validation rules for frontmatter are defined within the `Ontology.yaml` file for each [Entity Type](./entity-type.md). This schema specifies required fields, data types (e.g., `string`, `enum`, `entity_ref`), and other constraints [Source 1].

2.  **Generation**: During the synthesis stage, the `KnowledgeSynthesizer` prompts an [LLM](./llm.md) to generate the full text of an article, including a YAML frontmatter block at the top [Source 2].

3.  **Parsing**: The raw markdown output from the LLM is parsed by the `parseArticleOutput` function. This function uses a shared, spec-compliant utility, `parseFrontmatter`, to reliably separate the YAML block from the article body. This utility is used consistently across all subsystems that read articles, including the [Ingester](../apis/ingester.md), synthesizer, [Linter](./linter.md), and store [Source 2, Source 3].

4.  **Validation**: The `validateFrontmatter` function checks the parsed frontmatter from the LLM against the schema defined in the [Ontology](./ontology.md). It performs type coercion (e.g., converting a string to a number), validates that `enum` values are from the allowed list, and ensures that `entity_ref` values correspond to actual articles in the [Concept Registry](../subsystems/concept-registry.md) [Source 2].

5.  **Enrichment**: The final frontmatter for a compiled article is assembled by the `buildCompleteFrontmatter` function. It merges data from three sources in order of priority:
    1.  The validated, LLM-generated values.
    2.  Suggested frontmatter values from the upstream Extractor stage.
    3.  [Compiler-injected Metadata](./compiler-injected-metadata.md), which always takes precedence for its keys [Source 2].

    Compiler-injected fields provide essential provenance and build information, such as `entity_type`, `stub` (a boolean flag), `compiled_at` (an ISO timestamp), and `compiled_from` (a list of source files) [Source 2].

6.  **Serialization**: Once the final frontmatter object is constructed, the `serializeFrontmatter` function converts it back into a YAML string, which is then written to the top of the compiled markdown file [Source 2].

## Configuration

The schema for frontmatter is configured exclusively within the `ontology.yaml` file, under the `frontmatter.fields` section for each defined `entity_type` [Source 1]. The compiler uses this schema to validate the LLM's output and to instruct the LLM on what fields to generate [Source 1].

Each field in the schema can have a `description`, a `type`, and a `required` flag. Supported types include `string`, `string[]`, `number`, `boolean`, `enum`, `url`, and `entity_ref` for linking to other articles [Source 1].

### Example: `ontology.yaml`

The following example defines the frontmatter schema for a `concept` entity type.

```yaml
# ontology.yaml

entity_types:
  concept:
    description: "A core idea, technique, or abstraction"
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

        tags:
          description: "Topical tags for discoverability"
          type: string[]
          required: false

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
```
[Source 1]

## Sources

[Source 1] `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md`
[Source 2] `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts`
[Source 3] `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/frontmatter.ts`