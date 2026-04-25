---
summary: Pluralizes an entity type name for directory naming, handling irregular plurals and standard English rules.
export_name: pluralizeEntityType
source_file: src/knowledge/compiler/utils.ts
category: function
title: pluralizeEntityType
entity_type: api
search_terms:
 - convert singular to plural
 - directory naming convention
 - knowledge base compiler helper
 - entity type pluralization
 - handle irregular plurals
 - English pluralization rules
 - how to name folders for entities
 - generate plural names
 - KB compiler utils
 - string pluralization
 - filename generation
stub: false
compiled_at: 2026-04-24T17:29:03.606Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/utils.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `pluralizeEntityType` function is a shared helper utility within the YAAF Knowledge Base (KB) compilation pipeline [Source 1]. Its purpose is to convert a singular [Entity Type](../concepts/entity-type.md) name, such as 'concept' or 'category', into its correct plural form.

This function is primarily used to generate standardized directory names [when](./when.md) organizing the compiled knowledge base files. It correctly handles standard English pluralization (e.g., adding 's'), as well as common irregular plurals and other edge cases [Source 1].

## Signature

```typescript
export function pluralizeEntityType(entityType: string): string;
```

**Parameters:**

*   `entityType` (`string`): The singular entity type name to be pluralized.

**Returns:**

*   `string`: The pluralized version of the input string.

## Examples

The following examples demonstrate how `pluralizeEntityType` handles various pluralization rules [Source 1].

```typescript
import { pluralizeEntityType } from 'yaaf';

// Standard pluralization
const conceptsDir = pluralizeEntityType('concept'); // 'concepts'
const apisDir = pluralizeEntityType('api');       // 'apis'

// Irregular pluralization (y -> ies)
const categoriesDir = pluralizeEntityType('category'); // 'categories'

// Irregular pluralization (is -> es)
const analysesDir = pluralizeEntityType('analysis'); // 'analyses'

console.log(conceptsDir, apisDir, categoriesDir, analysesDir);
// Output: concepts apis categories analyses
```

## See Also

*   `generateDocId`: A related utility that uses pluralized entity types to create deterministic document IDs.

## Sources

[Source 1]: src/knowledge/compiler/utils.ts