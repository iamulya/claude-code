---
summary: A constant defining the standard filename for the YAAF knowledge base ontology definition.
export_name: ONTOLOGY_FILENAME
source_file: src/knowledge/ontology/loader.ts
category: constant
title: ONTOLOGY_FILENAME
entity_type: api
search_terms:
 - ontology.yaml
 - knowledge base ontology file
 - where is the ontology defined
 - ontology file name
 - KB root directory file
 - YAAF knowledge base configuration
 - schema definition file
 - entity and relation definition
 - ontology loader constant
 - default ontology filename
 - knowledge base schema path
stub: false
compiled_at: 2026-04-24T17:23:35.079Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/loader.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ONTOLOGY_FILENAME` constant specifies the standard filename for a YAAF Knowledge Base (KB) [Ontology](../concepts/ontology.md) definition file [Source 1]. Its value is the string `"ontology.yaml"`.

This file serves as the central schema for a knowledge base, defining its entities, relations, and attributes. YAAF's internal `OntologyLoader` class expects to find a file with this name in the root directory of a knowledge base [when](./when.md) loading and compiling it [Source 1]. Adhering to this convention is essential for the YAAF toolchain to correctly identify and parse the knowledge base structure.

## Signature

`ONTOLOGY_FILENAME` is a string constant exported from the YAAF package.

```typescript
export const ONTOLOGY_FILENAME = "ontology.yaml";
```

- **Type**: `string`
- **Value**: `"ontology.yaml"`

## Examples

The most common use for this constant is to programmatically construct the full path to the ontology file within a given knowledge base directory.

```typescript
import { promises as fs } from 'fs';
import { join } from 'path';
import { ONTOLOGY_FILENAME } from 'yaaf';

/**
 * Checks if an ontology file exists in the specified knowledge base directory.
 * @param kbRootPath The root path of the knowledge base.
 * @returns A promise that resolves to true if the file exists, false otherwise.
 */
async function checkOntologyExists(kbRootPath: string): Promise<boolean> {
  const ontologyPath = join(kbRootPath, ONTOLOGY_FILENAME);
  try {
    await fs.access(ontologyPath);
    console.log(`Ontology file found at: ${ontologyPath}`);
    return true;
  } catch {
    console.error(`Ontology file not found at: ${ontologyPath}`);
    return false;
  }
}

// Example usage:
checkOntologyExists('./my-project/kb');
```

## See Also

- The `OntologyLoader` class is the primary consumer of this constant, using it to locate and parse the ontology file.
- The `KB_CONFIG_FILENAME` constant defines the name for the knowledge base configuration file, `kb.config.yaml`.

## Sources

[Source 1] src/knowledge/ontology/loader.ts