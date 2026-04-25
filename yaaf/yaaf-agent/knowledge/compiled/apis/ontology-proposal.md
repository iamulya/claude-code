---
summary: Defines the structure of a single suggestion for ontology evolution, such as adding an entity type or vocabulary term.
export_name: OntologyProposal
source_file: src/knowledge/compiler/ontologyProposals.ts
category: type
title: OntologyProposal
entity_type: api
search_terms:
 - ontology evolution
 - suggest new entity type
 - add vocabulary term
 - knowledge base schema change
 - ontology feedback loop
 - auto-evolve ontology
 - O7 process
 - propose new relationship
 - suggest new frontmatter field
 - ontology proposal structure
 - knowledge compilation suggestions
 - .kb-ontology-proposals.json
stub: false
compiled_at: 2026-04-24T17:23:57.764Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ontologyProposals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[Ontology]]]]]]]]Proposal` type defines the data structure for a single suggestion to evolve the knowledge base's Ontology. These proposals are a key part of the "[Ontology Feedback Loop](../concepts/ontology-feedback-loop.md) (O7)" [Source 1].

After each compilation of the knowledge base, the system analyzes the extracted concepts, articles, and their relationships to generate a list of `OntologyProposal` objects. These proposals might suggest adding new [Entity Type](../concepts/entity-type.md)s, new [Vocabulary](../concepts/vocabulary.md) terms, new relationship types, or new [Frontmatter](../concepts/frontmatter.md) fields to the ontology schema. The goal is to help maintainers refine and expand the knowledge base's structure based on its actual content [Source 1].

Proposals are typically written to a `.kb-ontology-proposals.json` file for human review. High-confidence proposals can be configured to be applied automatically [Source 1].

## Signature

`OntologyProposal` is a TypeScript type alias for an object with the following structure [Source 1]:

```typescript
export type OntologyProposal = {
  kind: "add_entity_type" | "add_vocabulary" | "add_relationship" | "add_field";
  confidence: number; // 0–1
  reason: string;
  /** For add_entity_type */
  entityType?: string;
  /** For add_vocabulary */
  term?: string;
  /** For add_relationship */
  from?: string;
  to?: string;
  /** Extra structured data */
  details?: Record<string, unknown>;
};
```

### Properties

- **`kind`**: ` "add_entity_type" | "add_vocabulary" | "add_relationship" | "add_field" `
  - A string literal indicating the type of change being proposed.

- **`confidence`**: `number`
  - A value between 0 and 1 representing the compiler's confidence that this proposal is valid and useful.

- **`reason`**: `string`
  - A human-readable explanation for why the proposal was generated.

- **`entityType`**: `string` (optional)
  - The name of the new Entity Type to add. This property is used [when](./when.md) `kind` is `"add_entity_type"`.

- **`term`**: `string` (optional)
  - The new term to add to the vocabulary. This property is used when `kind` is `"add_vocabulary"`.

- **`from`**: `string` (optional)
  - The source entity type for a new relationship. This property is used when `kind` is `"add_relationship"`.

- **`to`**: `string` (optional)
  - The target entity type for a new relationship. This property is used when `kind` is `"add_relationship"`.

- **`details`**: `Record<string, unknown>` (optional)
  - A flexible object for any additional structured data relevant to the proposal.

## Examples

### Suggesting a New Entity Type

This example proposes adding a new entity type named "framework" because several un-typed concepts appear to belong to this category.

```json
{
  "kind": "add_entity_type",
  "confidence": 0.85,
  "reason": "Found 5 concepts (YAAF, React, Express) that do not match an existing entity type but share common patterns.",
  "entityType": "framework"
}
```

### Suggesting a New Vocabulary Term

This example suggests adding "[LLM](../concepts/llm.md)" to the vocabulary because it appears frequently in the text but is not yet a recognized term.

```json
{
  "kind": "add_vocabulary",
  "confidence": 0.95,
  "reason": "The term 'LLM' was mentioned 42 times across 15 articles.",
  "term": "LLM"
}
```

### Suggesting a New Relationship

This example proposes a new relationship type between `plugin` and `api` entities, discovered through frequent wikilinking patterns.

```json
{
  "kind": "add_relationship",
  "confidence": 0.7,
  "reason": "Observed frequent links from 'plugin' articles to 'api' articles, suggesting a 'uses_api' relationship.",
  "from": "plugin",
  "to": "api",
  "details": {
    "suggested_name": "uses_api"
  }
}
```

## See Also

- `generateOntologyProposals`: The function that creates an array of `OntologyProposal` objects.
- `loadProposals`: The function that loads and validates proposals from a file.

## Sources

[Source 1] `src/knowledge/compiler/ontologyProposals.ts`