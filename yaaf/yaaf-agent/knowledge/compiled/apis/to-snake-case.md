---
summary: Convert a string to snake_case, handling various common casing styles.
export_name: toSnakeCase
source_file: src/tools/openapi/naming.ts
category: function
title: toSnakeCase
entity_type: api
search_terms:
 - string case conversion
 - convert to snake case
 - camelCase to snake_case
 - PascalCase to snake_case
 - kebab-case to snake_case
 - dot.case to snake_case
 - space separated to snake_case
 - naming convention utility
 - format string as snake_case
 - OpenAPI naming helper
 - tool name formatting
stub: false
compiled_at: 2026-04-24T17:44:12.000Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/naming.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `toSnakeCase` function is a utility that converts a string from various common casing styles into `snake_case` [Source 1]. It is designed to handle multiple input formats, including `camelCase`, `PascalCase`, `kebab-case`, `dot.case`, and space-separated strings. If the input string is already in `snake_case`, it will be returned unchanged [Source 1].

This function is particularly useful for standardizing identifiers, such as [when](./when.md) generating tool names from different parts of an OpenAPI specification where naming conventions may vary.

## Signature

```typescript
export function toSnakeCase(str: string): string;
```

**Parameters:**

*   `str` (string): The input string to convert.

**Returns:**

*   (string): The `snake_case` version of the input string.

## Examples

The following examples demonstrate how `toSnakeCase` handles different input formats [Source 1].

**Converting camelCase:**

```typescript
const result = toSnakeCase('listPets');
// result is 'list_pets'
```

**Converting PascalCase:**

```typescript
const result = toSnakeCase('GetPetById');
// result is 'get_pet_by_id'
```

**Converting kebab-case:**

```typescript
const result = toSnakeCase('list-all-users');
// result is 'list_all_users'
```

**Handling an already snake_cased string:**

```typescript
const result = toSnakeCase('already_snake');
// result is 'already_snake'
```

## Sources

[Source 1]: src/[Tools](../subsystems/tools.md)/openapi/naming.ts