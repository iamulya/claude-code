---
title: findByWikilink
entity_type: api
summary: Finds a concept registry entry by matching a wikilink target against docIds, titles, or aliases.
export_name: findByWikilink
source_file: src/knowledge/ontology/registry.ts
category: function
stub: false
compiled_at: 2026-04-16T14:28:45.036Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/registry.ts
confidence: 1
---

## Overview
`findByWikilink` is a utility function used to resolve the target text of a wikilink (e.g., `[[Target Text]]`) to a specific entry in the Knowledge Base (KB) concept registry. It is a critical component of the Backlink Resolver, allowing the framework to map human-readable references or internal document paths to actual registry metadata.

The function performs a search across the registry using a specific priority order to ensure the most relevant match is returned.

## Signature
```typescript
export function findByWikilink(
  target: string,
  registry: ConceptRegistry,
): ConceptRegistryEntry | undefined
```

### Parameters
- `target`: The string content extracted from a wikilink.
- `registry`: The `ConceptRegistry` instance representing the "known universe" of compiled articles.

### Return Value
Returns a `ConceptRegistryEntry` if a match is found, or `undefined` if the target cannot be resolved.

## Matching Priority
The function resolves matches in the following order:
1. **Exact docId match**: Matches the target against the internal document path (e.g., `concepts/attention-mechanism`).
2. **Canonical title match**: Matches the target against the `title` field in the article frontmatter (case-insensitive).
3. **Alias match**: Matches the target against any defined aliases in the article frontmatter (case-insensitive).

## Examples

### Resolving a Wikilink by Title
This example demonstrates finding an entry using a human-readable title.

```typescript
import { findByWikilink } from 'yaaf/knowledge';

const targetText = "Attention Mechanism";
const entry = findByWikilink(targetText, registry);

if (entry) {
  console.log(`Resolved to docId: ${entry.docId}`);
} else {
  console.log("No matching article found.");
}
```

### Resolving by docId
This example demonstrates finding an entry using its explicit document path.

```typescript
const entry = findByWikilink("concepts/llm-orchestration", registry);

if (entry) {
  // Returns the entry for the specific file path
  console.log(entry.title); 
}
```

## See Also
- `buildConceptRegistry`
- `upsertRegistryEntry`