---
title: ConceptRegistry
entity_type: api
summary: Registry structure for tracking and managing framework concepts and their metadata.
export_name: ConceptRegistry
source_file: src/knowledge/ontology/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:28:14.620Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/index.ts
confidence: 0.9
---

## Overview
The `ConceptRegistry` is a TypeScript type definition used within the YAAF ontology subsystem. It serves as a structured container for managing framework concepts, providing a centralized registry for tracking entities and their associated metadata. It is primarily utilized by the knowledge base (KB) compiler and ontology managers to maintain a consistent map of defined concepts.

## Signature / Constructor
The `ConceptRegistry` is exported as a type from the ontology types module.

```typescript
export type ConceptRegistry = {
  [conceptId: string]: ConceptRegistryEntry;
};
```

## Methods & Properties
As a type definition, `ConceptRegistry` does not contain logic but defines the structure for concept storage. It typically maps unique concept identifiers to their corresponding metadata entries.

*   **Key**: A unique string identifier for the concept.
*   **Value**: A `ConceptRegistryEntry` containing the detailed schema, frontmatter, and structural data for that concept.

## Examples

### Basic Usage
The `ConceptRegistry` is used to type the collection of concepts within an ontology definition.

```typescript
import { ConceptRegistry, ConceptRegistryEntry } from 'yaaf/knowledge/ontology';

const registry: ConceptRegistry = {
  "agent-initialization": {
    // ConceptRegistryEntry data
  },
  "provider-configuration": {
    // ConceptRegistryEntry data
  }
};
```

### Integration in Ontology
The registry is a component of the broader ontology schema used by the framework to validate and process knowledge base articles.

```typescript
import { KBOntology, ConceptRegistry } from 'yaaf/knowledge/ontology';

const myOntology: KBOntology = {
  // ... other ontology properties
  concepts: {
    // ConceptRegistry implementation
  }
};
```

## See Also
*   `ConceptRegistryEntry`
*   `KBOntology`
*   `EntityTypeSchema`