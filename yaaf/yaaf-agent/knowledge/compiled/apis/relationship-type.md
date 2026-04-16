---
title: RelationshipType
entity_type: api
summary: The TypeScript interface defining directed, named relationships between entity types in the knowledge base.
export_name: RelationshipType
source_file: src/knowledge/ontology/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:28:07.626Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/types.ts
confidence: 1
---

## Overview
`RelationshipType` defines a named, directed connection between two specific entity types within the knowledge base ontology. It is used by the Knowledge Synthesizer to generate precise, typed wikilinks and by the linter to validate the semantic integrity of cross-links between articles.

When a relationship is defined with a `reciprocal` property, the framework's linker automatically maintains bidirectional edges between entities.

## Signature / Constructor

```typescript
export type RelationshipType = {
  name: string
  from: string
  to: string
  description: string
  reciprocal?: string
}
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The canonical name of the relationship, typically formatted in `SCREAMING_SNAKE_CASE` (e.g., "IS_IMPLEMENTED_BY"). |
| `from` | `string` | The identifier of the source entity type. |
| `to` | `string` | The identifier of the target entity type. |
| `description` | `string` | A human-readable description of the relationship's meaning, used to guide the LLM during synthesis and linting. |
| `reciprocal` | `string` | (Optional) The name of the inverse relationship. If provided, creating an edge from A to B via `name` will automatically create an edge from B to A via `reciprocal`. |

## Examples

### Defining a Relationship in Ontology
This example demonstrates how a relationship is structured within the `relationship_types` array of an ontology configuration.

```typescript
const implementsRelationship: RelationshipType = {
  name: 'IMPLEMENTS',
  from: 'tool',
  to: 'concept',
  description: 'A tool that provides an implementation of a concept',
  reciprocal: 'IMPLEMENTED_BY'
};
```

### Usage in YAML Configuration
While defined as a TypeScript type, `RelationshipType` objects are typically authored in the `ontology.yaml` file:

```yaml
relationship_types:
  - name: BELONGS_TO
    from: tool
    to: agent
    description: "Indicates which agent a specific tool is registered to"
    reciprocal: HAS_TOOL
```