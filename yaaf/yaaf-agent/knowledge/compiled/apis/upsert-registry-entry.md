---
summary: Adds or updates a single entry in the concept registry.
export_name: upsertRegistryEntry
source_file: src/knowledge/ontology/registry.ts
category: function
title: upsertRegistryEntry
entity_type: api
search_terms:
 - update concept registry
 - add to concept registry
 - modify registry entry
 - keep registry current
 - live registry update
 - post-compilation registry update
 - how to add a new article to the index
 - in-memory knowledge base index
 - ConceptRegistry mutation
 - insert or update registry
 - dynamic KB index
stub: false
compiled_at: 2026-04-24T17:46:34.385Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `upsertRegistryEntry` function adds a new entry to the in-[Memory](../concepts/memory.md) [Concept Registry](../subsystems/concept-registry.md) or updates an existing one. It is a key utility for maintaining the registry's state without performing a full rescan of the compiled knowledge base directory [Source 1].

This function is typically called after a single knowledge base article has been compiled or recompiled. By updating the registry in place, it ensures that other systems which rely on the registry, such as the [Backlink Resolver](../subsystems/backlink-resolver.md) or [Linter](../concepts/linter.md), have access to the most current information about the "known universe" of compiled articles [Source 1].

## Signature

The function mutates the provided `registry` object and does not return a value [Source 1].

```typescript
export function upsertRegistryEntry(
  registry: ConceptRegistry,
  entry: ConceptRegistryEntry
): void;
```

### Parameters

-   **`registry`**: `ConceptRegistry`
    The concept registry instance to modify.

-   **`entry`**: `ConceptRegistryEntry`
    The entry to add or update. The function uses the `docId` property of the entry to determine if an existing record should be updated or a new one inserted.

## Examples

### Adding a new entry

This example demonstrates adding a new article's metadata to an existing registry.

```typescript
import { upsertRegistryEntry } from 'yaaf';
import type { ConceptRegistry, ConceptRegistryEntry } from 'yaaf';

// Assume an existing registry is loaded
const registry: ConceptRegistry = {
  docIdMap: new Map(),
  aliasIndex: new Map(),
};

// Define the entry for a newly compiled article
const newEntry: ConceptRegistryEntry = {
  docId: 'api/Agent',
  filePath: '/path/to/compiled/api/Agent.md',
  entityType: 'api',
  title: 'Agent',
  aliases: ['Agent class'],
};

// Add the new entry to the registry
upsertRegistryEntry(registry, newEntry);

console.log(registry.docIdMap.has('api/Agent')); // true
```

### Updating an existing entry

This example shows how to update an entry, for instance, after its title or aliases have changed during a re-compilation.

```typescript
import { upsertRegistryEntry } from 'yaaf';
import type { ConceptRegistry, ConceptRegistryEntry } from 'yaaf';

// Assume a registry with a pre-existing entry for 'api/Agent'
const existingEntry: ConceptRegistryEntry = {
  docId: 'api/Agent',
  filePath: '/path/to/compiled/api/Agent.md',
  entityType: 'api',
  title: 'Agent',
  aliases: [],
};

const registry: ConceptRegistry = {
  docIdMap: new Map('api/Agent', existingEntry),
  aliasIndex: new Map(), // Simplified for example
};

// Define the updated entry with a new alias
const updatedEntry: ConceptRegistryEntry = {
  docId: 'api/Agent',
  filePath: '/path/to/compiled/api/Agent.md',
  entityType: 'api',
  title: 'Agent',
  aliases: ['AgentCore'], // Alias was added
};

// Upsert the entry to update it in the registry
upsertRegistryEntry(registry, updatedEntry);

const finalEntry = registry.docIdMap.get('api/Agent');
console.log(finalEntry?.aliases); // ['AgentCore']
```

## See Also

-   `buildConceptRegistry`: For creating the initial registry from the filesystem.
-   `removeRegistryEntry`: For removing an entry [when](./when.md) an article is deleted.
-   `serializeRegistry`: For caching the registry to disk.
-   `deserializeRegistry`: For loading a cached registry from disk.

## Sources

[Source 1]: src/knowledge/[Ontology](../concepts/ontology.md)/registry.ts