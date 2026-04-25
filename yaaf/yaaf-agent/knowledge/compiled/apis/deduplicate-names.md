---
summary: Ensure a list of names is unique by appending numeric suffixes for duplicates.
export_name: deduplicateNames
source_file: src/tools/openapi/naming.ts
category: function
title: deduplicateNames
entity_type: api
search_terms:
 - unique tool names
 - avoid name collisions
 - handle duplicate operation names
 - openapi name deduplication
 - numeric suffix for duplicates
 - how to make names unique
 - name conflict resolution
 - list of unique strings
 - ensure unique identifiers
 - deduplicate string array
 - tool name generation
 - prevent duplicate names
stub: false
compiled_at: 2026-04-24T17:00:44.210Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/naming.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `deduplicateNames` function takes an array of strings and ensures that every element in the output array is unique. It achieves this by identifying duplicate names and appending a numeric suffix (e.g., `_2`, `_3`) to subsequent occurrences of the same name. [Source 1]

This utility is primarily used during the process of generating tool names from specifications like OpenAPI, where different operations could potentially resolve to the same name. By using `deduplicateNames`, each generated tool can be assigned a distinct identifier, preventing name collisions. [Source 1]

## Signature

```typescript
export function deduplicateNames(names: string[]): string[];
```

**Parameters:**

*   `names` (`string[]`): An array of strings that may contain duplicate values.

**Returns:**

*   `string[]`: A new array where all string values are unique. Duplicates from the original array have numeric suffixes appended, starting with `_2`.

## Examples

The following example demonstrates how `deduplicateNames` resolves collisions in a list of generated tool names.

```typescript
import { deduplicateNames } from 'yaaf';

const initialNames = [
  'list_pets',
  'get_pet_by_id',
  'list_pets', // First duplicate
  'create_user',
  'list_pets', // Second duplicate
  'get_pet_by_id', // Third duplicate
];

const uniqueNames = deduplicateNames(initialNames);

console.log(uniqueNames);
/*
Output:
[
  'list_pets',
  'get_pet_by_id',
  'list_pets_2',
  'create_user',
  'list_pets_3',
  'get_pet_by_id_2'
]
*/
```

## See Also

*   `generateToolName`: A function that often produces the initial list of names that `deduplicateNames` is used to process.

## Sources

[Source 1]: src/[Tools](../subsystems/tools.md)/openapi/naming.ts