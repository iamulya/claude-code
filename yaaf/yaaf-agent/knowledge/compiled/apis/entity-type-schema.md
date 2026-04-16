---
title: EntityTypeSchema
entity_type: api
summary: The TypeScript interface defining the structure, frontmatter, and linkability rules for a specific category of knowledge.
export_name: EntityTypeSchema
source_file: src/knowledge/ontology/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:28:12.783Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/types.ts
confidence: 1
---

## Overview
`EntityTypeSchema` is a core configuration type within the YAAF ontology layer. It defines the blueprint for a specific category of knowledge entity (such as a "concept", "tool", or "research_paper"). This schema governs how the Knowledge Synthesizer scaffolds articles, how the linter validates cross-references, and what metadata must be present in the article's YAML frontmatter.

By defining an `EntityTypeSchema`, developers can ensure consistency across a specialized knowledge base, providing the LLM-based compiler with explicit instructions on how to structure content and which relationships are semantically valid.

## Signature
```typescript
export type EntityTypeSchema = {
  description: string;
  frontmatter: FrontmatterSchema;
  articleStructure: ArticleSection[];
  linkableTo: string[];
  indexable?: boolean;
};
```

## Properties
The `EntityTypeSchema` consists of the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `description` | `string` | A human-readable description of the entity type. This is fed to the LLM during compilation and linting to provide domain context. |
| `frontmatter` | `FrontmatterSchema` | Defines the required and optional fields for the article's YAML frontmatter, including types like `string`, `number`, or `entity_ref`. |
| `articleStructure` | `ArticleSection[]` | An ordered list of H2 sections that the Knowledge Synthesizer should produce. Each section includes a heading, a description for the LLM, and a requirement flag. |
| `linkableTo` | `string[]` | A list of other entity types that this entity is permitted to link to via wikilinks. If empty, no type restrictions are enforced. |
| `indexable` | `boolean` | (Optional) Whether articles of this type should appear in the `llms.txt` index. Defaults to `true`. |

### ArticleSection
The `articleStructure` property uses the `ArticleSection` type, which contains:
*   **heading**: The H2 heading text (e.g., "Key Contributions").
*   **description**: Guidance for the synthesizer regarding what content should be placed in the section.
*   **required**: A boolean that, if true, causes the linter to emit a warning if the section is absent.

## Examples
The following example demonstrates how an `EntityTypeSchema` is defined within an ontology configuration to describe a research paper entity.

```typescript
const researchPaperSchema: EntityTypeSchema = {
  description: "A published academic paper or preprint",
  frontmatter: {
    fields: {
      authors: {
        type: 'string[]',
        required: true,
        description: "List of author names"
      },
      year: {
        type: 'number',
        required: true,
        description: "Year of publication"
      }
    }
  },
  articleStructure: [
    {
      heading: "Summary",
      description: "2-3 sentence abstract in plain language",
      required: true
    },
    {
      heading: "Key Contributions",
      description: "Bullet list of what this paper adds to the field",
      required: true
    }
  ],
  linkableTo: ["concept", "tool", "dataset"],
  indexable: true
};
```