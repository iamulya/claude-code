---
summary: Serializes a KBOntology object back into YAML format, typically used for inferring and writing new ontologies.
export_name: serializeOntology
source_file: src/knowledge/ontology/loader.ts
category: function
title: serializeOntology
entity_type: api
search_terms:
 - convert ontology to yaml
 - write ontology file
 - save KBOntology
 - ontology serialization
 - kb init --infer
 - generate ontology.yaml
 - programmatic ontology creation
 - ontology to string
 - YAML stringify ontology
 - export knowledge base schema
 - dump ontology to file
stub: false
compiled_at: 2026-04-24T17:37:05.940Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/loader.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `serialize[[Ontology]]` function converts an in-[Memory](../concepts/memory.md) `KBOntology` object into its equivalent YAML string representation [Source 1]. This is the inverse operation of the parsing and hydration process performed by the `OntologyLoader`.

Its primary use case is for programmatically generating or modifying a [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md) file. For example, it is used internally by the YAAF command-line interface, specifically the `kb init --infer` command, to write a newly inferred [Ontology](../concepts/ontology.md) to the `ontology.yaml` file [Source 1].

## Signature

```typescript
export function serializeOntology(ontology: KBOntology): string;
```

**Parameters:**

*   `ontology` (`KBOntology`): The strongly-typed, in-memory representation of the Knowledge Base Ontology to be serialized.

**Returns:**

*   `string`: A YAML 1.2 compliant string representing the provided `KBOntology` object.

## Examples

### Basic Serialization

This example demonstrates how to create a simple `KBOntology` object and serialize it to a YAML string.

```typescript
import { serializeOntology } from 'yaaf';
import type { KBOntology } from 'yaaf';
import { writeFile } from 'fs/promises';

// 1. Define an in-memory KBOntology object
const myOntology: KBOntology = {
  version: '1.0',
  entities: {
    User: {
      description: 'Represents a user of the system.',
      properties: {
        id: {
          type: 'string',
          description: 'Unique identifier for the user.',
        },
        email: {
          type: 'string',
          description: 'The user\'s email address.',
        },
      },
    },
  },
  relations: {},
};

// 2. Serialize the object to a YAML string
const yamlString = serializeOntology(myOntology);

console.log(yamlString);
/*
Output:
version: '1.0'
entities:
  User:
    description: Represents a user of the system.
    properties:
      id:
        type: string
        description: Unique identifier for the user.
      email:
        type: string
        description: The user's email address.
relations: {}
*/

// 3. (Optional) Write the string to an ontology.yaml file
async function writeOntologyFile() {
  try {
    await writeFile('ontology.yaml', yamlString);
    console.log('ontology.yaml file written successfully.');
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

writeOntologyFile();
```

## Sources

[Source 1]: src/knowledge/ontology/loader.ts