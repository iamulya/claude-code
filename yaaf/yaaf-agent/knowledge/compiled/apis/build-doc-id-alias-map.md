---
summary: Creates a reverse lookup map from lowercase aliases to docIds for fast wikilink resolution.
export_name: buildDocIdAliasMap
source_file: src/knowledge/ontology/registry.ts
category: function
title: buildDocIdAliasMap
entity_type: api
search_terms:
 - wikilink resolution
 - alias to docId mapping
 - reverse alias lookup
 - backlink resolver helper
 - how to find document by alias
 - concept registry utilities
 - knowledge base indexing
 - fast wikilink lookup
 - create alias map
 - map aliases to document IDs
 - case-insensitive alias matching
stub: false
compiled_at: 2026-04-24T16:53:22.111Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `buildDocIdAliasMap` function constructs a reverse lookup map from a `ConceptRegistry`. This map facilitates fast and efficient resolution of [Wikilinks](../concepts/wikilinks.md) by mapping case-insensitive aliases directly to their corresponding document IDs (`docId`).

This utility is primarily used by internal YAAF subsystems, such as the [Backlink Resolver](../subsystems/backlink-resolver.md), which needs to quickly determine the canonical `docId` for a given alias found within article content (e.g., `some alias`). The function iterates through every entry in the provided registry, extracts all associated aliases, converts them to lowercase, and maps them to the entry's `docId`.

## Signature

```typescript
export function buildDocIdAliasMap(registry: ConceptRegistry): Map<string, string>;
```

### Parameters

-   **`registry`** (`ConceptRegistry`): The [Concept Registry](../subsystems/concept-registry.md) to process. A `ConceptRegistry` is an in-[Memory](../concepts/memory.md) index, typically a `Map`, where keys are `docId` strings and values are `ConceptRegistryEntry` objects. Each entry contains metadata about a knowledge base article, including its aliases.

### Returns

-   **`Map<string, string>`**: A map where each key is a lowercase alias string and the corresponding value is the `docId` of the article that defines the alias.

## Examples

The following example demonstrates how to create an alias map from a sample concept registry.

```typescript
import { buildDocIdAliasMap } from 'yaaf';
import type { ConceptRegistry } from 'yaaf'; // Assuming ConceptRegistry is exported

// 1. Define a sample ConceptRegistry.
// In a real application, this would be built by `buildConceptRegistry`.
const registry: ConceptRegistry = new Map([
  ['api/Agent', {
    docId: 'api/Agent',
    title: 'Agent',
    entity_type: 'api',
    aliases: ['Agent class', 'YAAF Agent'],
  }],
  ['concepts/Tool', {
    docId: 'concepts/Tool',
    title: 'Tool',
    entity_type: 'concept',
    aliases: ['tool', 'Function Calling'],
  }]
]);

// 2. Build the alias map from the registry.
const aliasMap = buildDocIdAliasMap(registry);

// 3. Use the map to resolve aliases to docIds.
// Note that lookups are case-insensitive because keys are stored in lowercase.
console.log(aliasMap.get('yaaf agent'));
//> "api/Agent"

console.log(aliasMap.get('function calling'));
//> "concepts/Tool"

console.log(aliasMap.get('tool'));
//> "concepts/Tool"

console.log(aliasMap.get('non-existent-alias'));
//> undefined
```

## See Also

-   `buildConceptRegistry`: The function used to create the `ConceptRegistry` that this function consumes.
-   `findByWikilink`: Another utility for finding registry entries based on wikilink targets.
-   The Backlink Resolver subsystem, which is the primary consumer of the map produced by this function.

## Sources

[Source 1]: src/knowledge/[Ontology](../concepts/ontology.md)/registry.ts