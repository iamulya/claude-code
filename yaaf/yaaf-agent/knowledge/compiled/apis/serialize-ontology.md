---
title: serializeOntology
entity_type: api
summary: Converts a KBOntology object into a YAML string representation.
export_name: serializeOntology
source_file: src/knowledge/ontology/loader.ts
category: function
stub: false
compiled_at: 2026-04-16T14:28:29.563Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/loader.ts
confidence: 1
---

## Overview
`serializeOntology` is a utility function designed to transform a structured `KBOntology` object back into a YAML-formatted string. This function is specifically used by the YAAF CLI during initialization tasks, such as the `kb init --infer` command, to write a proposed or inferred ontology to the filesystem.

The underlying parser and serializer handle a specific subset of YAML optimized for knowledge base ontologies, focusing on nested mappings, sequences, and scalars while excluding complex YAML features like anchors or multi-document streams.

## Signature / Constructor

```typescript
export function serializeOntology(ontology: KBOntology): string
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `ontology` | `KBOntology` | The hydrated ontology object to be serialized. |

### Returns
| Type | Description |
| :--- | :--- |
| `string` | A YAML-formatted string representing the ontology. |

## Examples

### Basic Serialization
This example demonstrates how to take a programmatically defined ontology and convert it into a string suitable for writing to an `ontology.yaml` file.

```typescript
import { serializeOntology } from 'yaaf/knowledge/ontology/loader';

const myOntology: KBOntology = {
  version: '1.0',
  entities: [
    {
      name: 'User',
      description: 'A human user of the system',
      attributes: [
        { name: 'id', type: 'string' },
        { name: 'email', type: 'string' }
      ]
    }
  ]
};

const yamlOutput = serializeOntology(myOntology);
// yamlOutput now contains the YAML string representation
```

## See Also
- `OntologyLoader`
- `validateOntology`