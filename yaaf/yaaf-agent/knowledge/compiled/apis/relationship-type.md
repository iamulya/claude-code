---
summary: A TypeScript type defining the structure for relationship types within the YAAF knowledge base ontology.
export_name: RelationshipType
source_file: src/knowledge/ontology/types.js
category: type
title: RelationshipType
entity_type: api
search_terms:
 - knowledge base relationships
 - ontology relationship definition
 - how to define entity links
 - graph schema type
 - semantic triple structure
 - entity connection properties
 - YAAF ontology types
 - defining edges in knowledge graph
 - relationship schema
 - from/to entity types
 - link label
 - bidirectional relationships
stub: false
compiled_at: 2026-04-24T17:32:07.824Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/wikilinkGraph.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `RelationshipType` is a TypeScript type that defines the schema for a directed relationship between two [Entity Type](../concepts/entity-type.md)s within a YAAF Knowledge Base [Ontology](../concepts/ontology.md). It specifies the source Entity Type, the target entity type, a descriptive label for the connection, and whether the relationship is bidirectional.

This type is a core component of the ontology, allowing the system to understand and validate the connections between different kinds of knowledge base articles. For example, the `WikilinkGraphPlugin` uses the `relationship_types` defined in the ontology to automatically infer relationship labels for `wikilinks` by matching the source and target article entity types [Source 2].

## Signature

`RelationshipType` is an object type with the following properties:

```typescript
export type RelationshipType = {
  /**
   * The name of the source entity type for this relationship.
   */
  from: string;

  /**
   * The name of the target entity type for this relationship.
   */
  to: string;

  /**
   * The semantic label for the relationship (e.g., "documents", "depends_on", "extends").
   */
  label: string;

  /**
   * If true, the relationship is considered to exist in both directions.
   * For example, a "related_to" link might be bidirectional.
   * @default false
   */
  bidirectional?: boolean;
};
```

## Examples

Below is an example of how `RelationshipType` objects are defined within the `relationship_types` array of a `KBOntology`.

```typescript
import type { KBOntology, RelationshipType } from 'yaaf';

// Define the relationships that can exist between entity types.
const myRelationshipTypes: RelationshipType[] = [
  {
    from: 'guide',
    to: 'api',
    label: 'documents',
    bidirectional: false, // A guide documents an API, but not vice-versa.
  },
  {
    from: 'plugin',
    to: 'subsystem',
    label: 'extends',
  },
  {
    from: 'api',
    to: 'api',
    label: 'related to',
    bidirectional: true, // If API A is related to API B, B is also related to A.
  }
];

// Use the defined relationships in the main ontology configuration.
const myOntology: KBOntology = {
  entity_types: {
    /* ... entity type schemas ... */
  },
  relationship_types: myRelationshipTypes,
  // ... other ontology properties
};
```

## Sources

[Source 1]: src/knowledge/ontology/index.ts
[Source 2]: src/knowledge/store/wikilinkGraph.ts