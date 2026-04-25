---
summary: Deserializes a cached concept registry from a JSON string.
export_name: deserializeRegistry
source_file: src/knowledge/ontology/registry.ts
category: function
title: deserializeRegistry
entity_type: api
search_terms:
 - load concept registry from cache
 - parse registry JSON
 - rehydrate concept index
 - concept registry persistence
 - load .kb-registry.json
 - restore knowledge base index
 - JSON to ConceptRegistry
 - registry serialization
 - avoid full KB scan
 - startup performance
 - knowledge base cache
stub: false
compiled_at: 2026-04-24T17:01:34.614Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `deserializeRegistry` function reconstructs a `ConceptRegistry` object from a JSON string. It is the counterpart to the `serializeRegistry` function [Source 1].

This function is primarily used during application startup to quickly load a cached version of the [Concept Registry](../subsystems/concept-registry.md). The registry, which is an in-[Memory](../concepts/memory.md) index of all compiled knowledge base articles, can be serialized to a file (e.g., `.kb-registry.json`) to persist it between runs. Deserializing this cached file is significantly faster than rebuilding the registry from scratch by scanning the entire compiled knowledge base directory, thus improving startup performance [Source 1]. The `KBStore` class, which provides runtime access to the knowledge base, utilizes this function to load the registry [Source 2].

## Signature

```typescript
export function deserializeRegistry(json: string): ConceptRegistry;
```

### Parameters

-   `json` (string): A JSON string representing a serialized `ConceptRegistry`.

### Returns

-   `ConceptRegistry`: The reconstructed, in-memory concept registry object.

## Examples

The most common use case is to read the cached registry from a file and deserialize it.

```typescript
import { deserializeRegistry } from 'yaaf';
import type { ConceptRegistry } from 'yaaf';
import { promises as fs } from 'fs';

const REGISTRY_CACHE_PATH = '.kb-registry.json';

/**
 * Loads the concept registry from a cached file, if it exists.
 * @returns The deserialized registry, or null if the cache is not found or invalid.
 */
async function loadRegistryFromCache(): Promise<ConceptRegistry | null> {
  try {
    const jsonString = await fs.readFile(REGISTRY_CACHE_PATH, 'utf-8');
    const registry = deserializeRegistry(jsonString);
    console.log(`Successfully loaded concept registry with ${Object.keys(registry.entries).length} entries from cache.`);
    return registry;
  } catch (error) {
    // This is expected if the cache file doesn't exist on first run.
    console.warn('Could not load registry from cache. A full scan may be required.');
    return null;
  }
}

// Example usage:
loadRegistryFromCache().then(registry => {
  if (registry) {
    // Now the application can use the registry without a full rescan.
  } else {
    // Proceed to build the registry from source files.
  }
});
```

## See Also

-   `serializeRegistry`: The function used to create the JSON string from a `ConceptRegistry` object.
-   `buildConceptRegistry`: The function used to build the registry from the filesystem [when](./when.md) a cache is not available.
-   `KBStore`: The runtime class that uses the deserialized registry to access knowledge base articles.

## Sources

[Source 1] src/knowledge/[Ontology](../concepts/ontology.md)/registry.ts
[Source 2] src/knowledge/store/store.ts