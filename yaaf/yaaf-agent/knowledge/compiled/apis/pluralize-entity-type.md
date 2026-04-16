---
export_name: pluralizeEntityType
source_file: src/knowledge/compiler/utils.ts
category: function
summary: Pluralizes an entity type name for directory naming, handling irregular plurals and standard English rules.
title: pluralizeEntityType
entity_type: api
stub: false
compiled_at: 2026-04-16T14:27:13.792Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/utils.ts
confidence: 0.98
---

## Overview
`pluralizeEntityType` is a utility function used within the YAAF knowledge compiler to transform singular entity type names into their plural forms. This is primarily used for deterministic directory naming and path generation within the knowledge base structure. The function accounts for standard English pluralization rules as well as irregular forms and specific edge cases relevant to the framework's domain.

## Signature / Constructor
```typescript
export function pluralizeEntityType(entityType: string): string;
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `entityType` | `string` | The singular name of the entity type to be pluralized. |

### Returns
`string`: The pluralized version of the input string.

## Examples
The following examples demonstrate how the function handles various linguistic patterns:

```typescript
import { pluralizeEntityType } from './src/knowledge/compiler/utils';

// Standard pluralization
pluralizeEntityType('concept');  // Returns: 'concepts'
pluralizeEntityType('api');      // Returns: 'apis'

// Words ending in 'y'
pluralizeEntityType('category'); // Returns: 'categories'

// Irregular plurals (Greek/Latin roots)
pluralizeEntityType('analysis'); // Returns: 'analyses'
```

## See Also
- `generateDocId`: A utility that utilizes `pluralizeEntityType` to create unique document identifiers.