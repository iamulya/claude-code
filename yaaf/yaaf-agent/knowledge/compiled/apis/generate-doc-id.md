---
summary: Generates a deterministic docId from a canonical title and entity type in the format `{pluralized-entity-type}/{slug}`.
export_name: generateDocId
source_file: src/knowledge/compiler/utils.ts
category: function
title: generateDocId
entity_type: api
search_terms:
 - deterministic document ID
 - create knowledge base ID
 - slugify title
 - generate unique identifier
 - KB document path
 - how to name knowledge articles
 - canonical title to ID
 - entity type pluralization
 - knowledge base compiler utils
 - docId format
 - URL-friendly identifier
 - concepts/attention-mechanism example
stub: false
compiled_at: 2026-04-24T17:08:16.237Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/utils.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `generateDocId` function is a utility used within the YAAF knowledge base compilation pipeline to create a deterministic, unique identifier for a document [Source 1]. It takes a canonical title and an [Entity Type](../concepts/entity-type.md) as input and produces a string in the format `{pluralized-entity-type}/{slug}`.

This function is essential for creating consistent and predictable file paths or identifiers for knowledge base articles, ensuring that the same article title always maps to the same ID [Source 1]. It relies on internal logic to pluralize the entity type and convert the title into a URL-friendly slug.

## Signature

```typescript
export function generateDocId(canonicalTitle: string, entityType: string): string;
```

**Parameters:**

*   `canonicalTitle: string`: The canonical title of the knowledge base article.
*   `entityType: string`: The type of the entity, such as `'concept'` or `'api'`.

**Returns:**

*   `string`: A deterministic document ID.

## Examples

The following example demonstrates how to generate a `docId` for a concept article titled "Attention Mechanism" [Source 1].

```typescript
import { generateDocId } from 'yaaf';

const title = 'Attention Mechanism';
const type = 'concept';

const docId = generateDocId(title, type);

console.log(docId);
// Expected output: 'concepts/attention-mechanism'
```

## See Also

*   The `pluralizeEntityType` function is a related utility in the same module that handles the pluralization of entity types used in the `docId` [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/utils.ts