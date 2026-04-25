---
summary: The Ontology is the schema (`ontology.yaml`) that defines the structure, entity types, relationships, and vocabulary of a YAAF knowledge base.
title: Ontology
entity_type: concept
related_subsystems:
 - knowledge
search_terms:
 - knowledge base schema
 - define entity types
 - ontology.yaml file
 - what is an ontology in yaaf
 - configure knowledge base
 - article structure definition
 - frontmatter validation rules
 - domain vocabulary
 - kb:init command
 - generate ontology
 - how to create ontology.yaml
 - knowledge base structure
 - entity relationships
stub: false
compiled_at: 2026-04-24T17:59:30.927Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
compiled_from_quality: documentation
confidence: 0.98
---

## What It Is

The Ontology is the schema for a YAAF knowledge base, defined in a required `ontology.yaml` file [Source 1]. It serves as the central source of truth that governs the structure and content of the knowledge base, defining what kinds of entities exist, their required [Frontmatter](./frontmatter.md) fields, the expected structure of each article, and the [Vocabulary](./vocabulary.md) of known terms [Source 1].

The YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) will refuse to run without a valid ontology [Source 1]. A well-designed ontology is critical for producing a well-structured and consistent knowledge base, as the [LLM](./llm.md)-powered compiler uses its definitions literally [when](../apis/when.md) generating and validating articles [Source 1].

## How It Works in YAAF

The Ontology is loaded by the `KBCompiler` upon creation and is used at every stage of the knowledge base compilation pipeline [Source 1].

-   **Extractor**: The ConceptExtractor stage uses the ontology to build its extraction prompt and to validate the Entity Types it identifies in the raw source material [Source 1].
-   **Synthesizer**: The KnowledgeSynthesizer stage uses the `article_structure` and frontmatter field requirements defined in the ontology to construct the prompt for generating the final article content [Source 1].
-   **[Linter](./linter.md)**: The [KBLinter](../apis/kb-linter.md) stage uses the ontology to validate frontmatter values, enforce `linkable_to` relationships between Entity Types, and check for reciprocal links [Source 1].
-   **Vocabulary**: The vocabulary section of the ontology powers an alias index used for static analysis and by the linter's auto-fixer functionality [Source 1].

The `OntologyLoader` class is responsible for loading and validating the `ontology.yaml` file from disk [Source 1].

## Configuration

An `ontology.yaml` file is required at the root of a knowledge base directory [Source 1].

### Generation

YAAF provides an LLM-powered tool to bootstrap a new `ontology.yaml` file by scanning a project's source code and documentation [Source 1]. This is the recommended way to start a new knowledge base [Source 1]. The generator can be run interactively, non-interactively for CI, or programmatically.

**Interactive Mode:**
```bash
npm run kb:init
```

**Non-interactive Mode:**
```bash
npx tsx knowledge/scripts/init-ontology.ts \
  --domain "My SDK — a TypeScript library for X" \
  --src ./src --src ./docs \
  --entity-types "class,function,guide" \
  --model gemini-2.5-flash
```

**Programmatic Usage:**
```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel } from 'yaaf'

const generator = new OntologyGenerator({
  generateFn: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  outputPath: './knowledge/ontology.yaml',
})

const result = await generator.generate({
  domain: 'Acme SDK — a TypeScript library for building widgets.',
  srcDirs: ['./src'],
  entityTypeHints: ['class', 'hook', 'guide'],
})
```
The generator scans the file tree, uses `README.md` and `package.json` for context, and prompts an LLM to draft the ontology. It is recommended to always review and edit the generated ontology to refine [Entity Type](./entity-type.md)s, article structures, and vocabulary based on domain expertise [Source 1].

### Structure Reference

The `ontology.yaml` file has two main sections: `domain` and `entity_types` [Source 1].

```yaml
# ── Domain ─────────────────────────────────────────────────────────────────────
domain: "Machine Learning Research"   # One-line description of your KB's subject area

# ── Entity Types ───────────────────────────────────────────────────────────────
# Define the types of articles your KB contains.
# Each entity type gets its own subdirectory in compiled/.
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

  research_paper:
    description: "An academic paper, preprint, or technical report"
    # ... additional entity type definitions
```

Key fields for each entity type include:
*   `description`: A human-readable explanation of the entity type.
*   `frontmatter`: Defines the schema for the article's frontmatter, specifying fields, their types (`string`, `string[]`, `enum`, `entity_ref`, etc.), and whether they are required.
*   `article_structure`: An ordered list of headings and descriptions that the LLM synthesizer will use to structure the article content. Sections can be marked as `required`.
*   `linkable_to`: A list of other entity types that articles of this type are allowed to wikilink to.
*   `indexable`: A boolean that determines if this entity type should be included in the global knowledge base index.

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md