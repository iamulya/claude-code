---
summary: Serializes the concept registry to a compact JSON string for caching.
export_name: serializeRegistry
source_file: src/knowledge/ontology/registry.ts
category: function
title: serializeRegistry
entity_type: api
search_terms:
 - cache concept registry
 - save registry to disk
 - persist knowledge base index
 - registry serialization
 - convert registry to JSON
 - speed up KB startup
 - .kb-registry.json
 - how to store registry
 - registry persistence
 - JSON stringify registry
 - avoid full rescan
stub: false
compiled_at: 2026-04-24T17:37:17.996Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `serializeRegistry` function converts an in-[Memory](../concepts/memory.md) `ConceptRegistry` object into a compact JSON string [Source 1].

Its primary purpose is to enable caching of the [Concept Registry](../subsystems/concept-registry.md). The concept registry is an index of all compiled knowledge base articles, which can be time-consuming to build from scratch by scanning the file system. By serializing the registry to a file (typically `.kb-registry.json` in the knowledge base root), YAAF applications can significantly speed up their startup process by loading the cached version instead of performing a full rescan [Source 1].

This function is the counterpart to `deserializeRegistry`, which reconstructs the registry from the JSON string.

## Signature

```typescript
export function serializeRegistry(registry: ConceptRegistry): string;
```

### Parameters

-   **`registry`** (`ConceptRegistry`): The in-memory concept registry object to be serialized. The `ConceptRegistry` is a `Map` where keys are document IDs (`docId`) and values are `ConceptRegistryEntry` objects.

### Returns

-   (`string`): A JSON string representation of the provided `ConceptRegistry`.

## Examples

The following example demonstrates how to serialize a simple concept registry and write it to a file.

```typescript
import { serializeRegistry } from 'yaaf';
import { writeFile } from 'fs/promises';
import path from 'path';

// Assume ConceptRegistry and ConceptRegistryEntry types are imported
// This is a simplified example registry
const myRegistry: ConceptRegistry = new Map([
  [
    'api/Agent',
    {
      docId: 'api/Agent',
      title: 'Agent',
      entity_type: 'api',
      source_file: 'src/agent.ts',
      aliases: ['Agent class'],
    },
  ],
  [
    'concept/Tool',
    {
      docId: 'concept/Tool',
      title: 'Tool',
      entity_type: 'concept',
      source_file: 'src/tools/tool.ts',
      aliases: [],
    },
  ],
]);

// Serialize the registry to a JSON string
const jsonString = serializeRegistry(myRegistry);

console.log(jsonString);
// Output will be a JSON representation of the Map, e.g.:
// '{"api/Agent":{"docId":"api/Agent",...},"concept/Tool":{"docId":"concept/Tool",...}}'

// Typically, this string is saved to a cache file
async function cacheRegistry() {
  const cachePath = path.join(process.cwd(), '.kb-registry.json');
  try {
    await writeFile(cachePath, jsonString, 'utf-8');
    console.log(`Registry cached successfully at ${cachePath}`);
  } catch (error) {
    console.error('Failed to cache registry:', error);
  }
}

cacheRegistry();
```

## See Also

-   `deserializeRegistry`: The corresponding function to parse the JSON string back into a `ConceptRegistry` object.
-   `buildConceptRegistry`: The function used to create the initial registry by scanning the file system.

## Sources

[Source 1]: src/knowledge/[Ontology](../concepts/ontology.md)/registry.ts