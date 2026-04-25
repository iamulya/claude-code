---
title: KBOntology
entity_type: api
summary: The in-memory TypeScript representation of the knowledge base schema, loaded from `ontology.yaml`.
export_name: KBOntology
source_file: src/knowledge/ontology/types.ts
category: type
search_terms:
 - knowledge base schema
 - ontology.yaml definition
 - define entity types
 - relationship schema
 - frontmatter validation rules
 - custom KB entities
 - ontology loader
 - type system for knowledge
 - what is ontology.yaml
 - KB schema object
 - configure knowledge base
 - entity type schema
 - controlled vocabulary
stub: false
compiled_at: 2026-04-24T17:16:54.143Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/loader.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/wikilinkGraph.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `KB[[[[[[[[Ontology]]]]]]]]` type is the core in-[Memory](../concepts/memory.md) representation of the entire YAAF knowledge base schema [Source 3]. It is a strongly-typed TypeScript object that defines all valid [Entity Type](../concepts/entity-type.md)s, relationship types, [Frontmatter](../concepts/frontmatter.md) fields, and controlled vocabularies for a given knowledge base.

This object is typically not created manually. Instead, it is loaded and parsed from the `Ontology.yaml` file located in the root of the knowledge base directory by the `OntologyLoader` at the start of the compilation process [Source 3]. The compiler will not proceed if the Ontology file is invalid [Source 3].

The `KBOntology` object serves as the single source of truth for the knowledge base's structure. It is used by various parts of the YAAF framework:

-   **Compiler:** The frontmatter synthesizer uses the ontology to validate that the frontmatter of each compiled article conforms to the schema defined for its Entity Type [Source 2].
-   **Graph Adapters:** Plugins like the default `WikilinkGraphPlugin` use the `relationship_types` defined in the ontology to infer the labels of relationships between articles based on the source and target entity types [Source 4].
-   **Tooling:** The `kb init --infer` command can serialize a `KBOntology` object back into a YAML file format [Source 3].

## Signature

`KBOntology` is a complex object type that aggregates several other schema-defining types. Its structure mirrors the `ontology.yaml` file format.

```typescript
// Source: src/knowledge/ontology/index.ts

export type KBOntology = {
  // The full type is extensive. Key conceptual properties include:
  
  /**
   * Definitions for each entity type (e.g., 'api', 'concept').
   */
  entity_types: Record<string, EntityTypeSchema>;

  /**
   * Definitions for valid relationships between entity types.
   */
  relationship_types: RelationshipType[];

  /**
   * Controlled vocabularies for use in enum fields.
   */
  vocabularies: Record<string, VocabularyEntry[]>;
  
  // ... and other configuration properties.
};
```

The primary components referenced within the `KBOntology` type include [Source 1]:

-   `EntityTypeSchema`: Defines a single type of article, including its frontmatter schema.
-   `RelationshipType`: Defines a directed relationship that can exist between two entity types.
-   `VocabularyEntry`: An entry in a controlled list, often used for `enum` fields.
-   `FrontmatterSchema`: Defines the fields, types, and validation rules for an entity's frontmatter.

## Examples

The `KBOntology` object is the parsed representation of the `ontology.yaml` file. The following example shows a minimal `ontology.yaml` that would be loaded into a `KBOntology` object.

```yaml
# ontology.yaml

# This file defines the schema for the knowledge base.
# The YAAF compiler parses this into a KBOntology object.

entity_types:
  api:
    summary: "A public API entity like a class, function, or type."
    frontmatter:
      title: { type: string, required: true }
      entity_type: { type: enum, required: true, values: [api] }
      category: { type: enum, required: true, vocabulary: api_categories }
      source_file: { type: string, required: true }

  concept:
    summary: "An explanatory article about a core idea or pattern."
    frontmatter:
      title: { type: string, required: true }
      entity_type: { type: enum, required: true, values: [concept] }

relationship_types:
  - from: api
    to: concept
    label: "implements"
    description: "The API implements the specified concept."

vocabularies:
  api_categories:
    - value: class
      description: "A TypeScript class."
    - value: function
      description: "A TypeScript function."
    - value: type
      description: "A TypeScript type alias or interface."
```

During compilation, the `OntologyLoader` would parse this file and create a corresponding `KBOntology` object that the rest of the system can use for validation and relationship inference [Source 3].

## Sources

[Source 1]: src/knowledge/ontology/index.ts
[Source 2]: src/knowledge/compiler/synthesizer/frontmatter.ts
[Source 3]: src/knowledge/ontology/loader.ts
[Source 4]: src/knowledge/store/wikilinkGraph.ts