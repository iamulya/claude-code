---
summary: Finds a concept registry entry by matching wikilink target text against docId, canonical title, or aliases.
export_name: findByWikilink
source_file: src/knowledge/ontology/registry.ts
category: function
title: findByWikilink
entity_type: api
search_terms:
 - resolve wikilink
 - find article by link
 - wikilink to docId
 - concept registry lookup
 - match alias to article
 - canonical title search
 - backlink resolution
 - find document by title
 - knowledge base linking
 - how to find a concept
 - registry search function
 - lookup entity by name
stub: false
compiled_at: 2026-04-24T17:06:39.137Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `findByWikilink` function is a utility for searching the in-[Memory](../concepts/memory.md) [Concept Registry](../subsystems/concept-registry.md). It attempts to resolve the target text of a wikilink (e.g., the `My Concept` part of `My Concept`) to a specific `ConceptRegistryEntry` [Source 1].

This function is a core component of the knowledge base's backlink resolution system. [when](./when.md) the compiler encounters a wikilink, it uses `findByWikilink` to determine if the link points to a known article in the registry.

The search follows a specific order of priority [Source 1]:
1.  **Exact `docId` match**: The function first checks if the target string exactly matches a document ID (e.g., "concepts/attention-mechanism").
2.  **Canonical title match**: If no `docId` matches, it performs a case-insensitive search against the `title` field of each entry.
3.  **Alias match**: Finally, it performs a case-insensitive search against the `aliases` array of each entry.

The function returns the first entry that matches according to these rules, or `undefined` if no match is found [Source 1].

## Signature

```typescript
export function findByWikilink(
  target: string,
  registry: ConceptRegistry,
): ConceptRegistryEntry | undefined;
```

### Parameters

-   `target` (`string`): The text content from a wikilink to be resolved.
-   `registry` (`ConceptRegistry`): The live, in-memory index of all compiled knowledge base articles.

### Returns

-   (`ConceptRegistryEntry | undefined`): The first matching registry entry found, or `undefined` if the target cannot be resolved to any known article.

## Examples

The following example demonstrates how to use `findByWikilink` to find entries in a mock `ConceptRegistry`.

```typescript
import { findByWikilink } from 'yaaf';
import type { ConceptRegistry, ConceptRegistryEntry } from 'yaaf';

// A mock ConceptRegistry for demonstration purposes.
const mockRegistry: ConceptRegistry = {
  'api/agent': {
    docId: 'api/agent',
    title: 'Agent',
    entity_type: 'api',
    aliases: ['Agent class', 'YAAF Agent'],
    // ... other properties would be here
  },
  'concepts/tool-use': {
    docId: 'concepts/tool-use',
    title: 'Tool Use',
    entity_type: 'concept',
    aliases: ['Function Calling', 'Using Tools'],
    // ... other properties would be here
  }
};

// 1. Find by exact docId
const entryByDocId = findByWikilink('api/agent', mockRegistry);
console.log(entryByDocId?.title);
// Expected output: 'Agent'

// 2. Find by canonical title (case-insensitive)
const entryByTitle = findByWikilink('tool use', mockRegistry);
console.log(entryByTitle?.docId);
// Expected output: 'concepts/tool-use'

// 3. Find by alias (case-insensitive)
const entryByAlias = findByWikilink('function calling', mockRegistry);
console.log(entryByAlias?.title);
// Expected output: 'Tool Use'

// 4. No match found
const noMatch = findByWikilink('non-existent-concept', mockRegistry);
console.log(noMatch);
// Expected output: undefined
```

## See Also

-   `buildConceptRegistry`: The function used to create the `ConceptRegistry` that `findByWikilink` searches.
-   `buildDocIdAliasMap`: A related utility for creating a fast reverse lookup map from aliases to `docId`s.

## Sources

[Source 1] src/knowledge/[Ontology](../concepts/ontology.md)/registry.ts