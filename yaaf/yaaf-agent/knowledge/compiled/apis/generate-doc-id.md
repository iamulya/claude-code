---
export_name: generateDocId
source_file: src/knowledge/compiler/utils.ts
category: function
summary: Generates a deterministic docId from a canonical title and entity type in the format {pluralized-entity-type}/{slug}.
title: generateDocId
entity_type: api
stub: false
compiled_at: 2026-04-16T14:27:17.214Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/utils.ts
confidence: 0.98
---

## Overview
`generateDocId` is a utility function used within the YAAF knowledge compiler to create consistent, URL-friendly identifiers for documentation entities. It ensures that every entity has a deterministic path based on its classification and human-readable title.

The function performs two primary transformations:
1.  It pluralizes the provided `entityType` (e.g., "concept" becomes "concepts").
2.  It converts the `canonicalTitle` into a URL-safe slug (e.g., "Attention Mechanism" becomes "attention-mechanism").

## Signature
```typescript
export function generateDocId(canonicalTitle: string, entityType: string): string
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `canonicalTitle` | `string` | The human-readable, official title of the entity. |
| `entityType` | `string` | The category of the entity (e.g., 'concept', 'api', 'guide'). |

### Returns
`string`: A formatted string in the pattern `{pluralized-entity-type}/{slug}`.

## Examples

### Basic Usage
The following example demonstrates how a concept title is transformed into a structured document ID.

```typescript
import { generateDocId } from 'src/knowledge/compiler/utils';

const docId = generateDocId('Attention Mechanism', 'concept');
console.log(docId); 
// Output: "concepts/attention-mechanism"
```

### API Entity Usage
When used with API entities, the function handles the pluralization of the "api" type.

```typescript
import { generateDocId } from 'src/knowledge/compiler/utils';

const docId = generateDocId('AgentConfig', 'api');
console.log(docId); 
// Output: "apis/agent-config"
```

## See Also
*   `pluralizeEntityType`: The underlying utility used to transform entity types into their plural directory names.