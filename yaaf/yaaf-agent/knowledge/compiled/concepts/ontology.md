---
summary: A schema definition for a knowledge base that specifies entity types, frontmatter fields, article structures, and domain vocabulary.
tags:
  - schema
  - configuration
  - metadata
title: Ontology
entity_type: concept
related_subsystems:
  - Knowledge Base
  - KBCompiler
stub: false
compiled_at: 2026-04-16T14:08:46.057Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/knowledge-base.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/loader.ts
confidence: 0.95
---

## What It Is
An ontology in YAAF is the formal schema that defines the structure, vocabulary, and relationships of a knowledge base (KB). It serves as the blueprint for the `KBCompiler` during the synthesis of raw source material into structured markdown articles. 

The ontology solves the problem of inconsistency in LLM-generated content by providing a strict definition of what kinds of entities exist, what metadata they must carry, and how their articles should be formatted. The YAAF compiler requires a valid ontology to function; it will refuse to run if the schema is missing or invalid.

## How It Works in YAAF
The ontology is implemented as a file named `ontology.yaml` located at the root of the knowledge base directory. It is managed by the `OntologyLoader` class, which parses the YAML and performs internal consistency checks via the `validateOntology` function.

The framework utilizes the ontology across several pipeline stages:
- **Directory Mapping:** Each defined `entity_type` corresponds to a specific subdirectory within the `compiled/` directory.
- **Article Synthesis:** The `KBCompiler` uses the `article_structure` defined in the ontology to instruct the LLM on which headings to include and what content to provide for each section.
- **Metadata Validation:** After an article is authored, the system validates its frontmatter against the `fields` defined in the ontology, ensuring types (such as `string`, `number`, or `enum`) and requirements are met.
- **Mention Detection:** The `vocabulary` section provides a list of known terms and their aliases. The compiler's extraction pass uses this to detect entity mentions in raw text and prepare wikilinks.
- **Relationship Enforcement:** The `relationship_types` section defines named connections between entities. The linter uses these definitions to check for reciprocal links (e.g., if a Concept is "introduced by" a Paper, the Paper should "introduce" the Concept).

## Configuration
The `ontology.yaml` file contains several top-level keys to configure the KB domain, entity types, and compiler behavior.

### Entity Type Definition
Each entity type specifies its own frontmatter schema and required article sections.

```yaml
entity_types:
  concept:
    description: "A core idea or abstraction"
    frontmatter:
      fields:
        title:
          type: string
          required: true
        status:
          type: enum
          required: false
          enum: [established, emerging, deprecated]
    article_structure:
      - heading: "Overview"
        description: "Clear definition of the concept."
        required: true
      - heading: "How It Works"
        description: "Technical mechanism."
        required: false
    linkable_to:
      - concept
      - tool
    indexable: true
```

### Field Types
The following types are supported for frontmatter validation:

| Type | Description | Example |
|------|-------------|---------|
| `string` | Free text | `"My Article"` |
| `string[]` | Array of strings | `["tag1", "tag2"]` |
| `number` | Numeric value | `2024` |
| `boolean` | True/false | `true` |
| `date` | ISO date string | `"2024-01-15"` |
| `url` | URL string | `"https://example.com"` |
| `enum` | One of a set of values | `"active"` |
| `entity_ref` | DocId of another article | `"concepts/transformer"` |

### Vocabulary and Relationships
The vocabulary section maps terms to canonical articles, while relationship types define how entities connect.

```yaml
relationship_types:
  - name: IMPLEMENTS
    from: tool
    to: concept
    description: "A tool that implements a concept"
    reciprocal: IMPLEMENTED_BY

vocabulary:
  "attention mechanism":
    aliases:
      - attention
      - self-attention
    entity_type: concept
    doc_id: concepts/attention-mechanism
```

## See Also
- [[KBCompiler]]
- [[Knowledge Base]]