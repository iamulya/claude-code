---
summary: Generate a snake_case tool name from OpenAPI operation details, prioritizing `operationId`.
export_name: generateToolName
source_file: src/tools/openapi/naming.ts
category: function
title: generateToolName
entity_type: api
search_terms:
 - OpenAPI tool naming
 - generate function name from path
 - operationId to tool name
 - HTTP method and path to name
 - snake_case tool names
 - how to name agent tools
 - OpenAPI operation naming convention
 - tool name from REST API
 - create unique tool names
 - naming tools from spec
 - fallback tool name generation
 - REST endpoint to function name
stub: false
compiled_at: 2026-04-24T17:08:38.793Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/naming.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `generateToolName` function creates a standardized, `snake_case` name for a tool based on its OpenAPI operation details [Source 1]. This utility is essential [when](./when.md) automatically generating [Tools](../subsystems/tools.md) from an OpenAPI specification, ensuring consistent and predictable naming conventions.

The function follows a specific priority for name generation [Source 1]:
1.  It first attempts to use the `operationId` from the OpenAPI specification, converting it to `snake_case`.
2.  If `operationId` is not available, it constructs a fallback name by combining the HTTP method and the URL path segments (e.g., `get` and `/users/{userId}` becomes `get_users_by_id`).

The final generated name is truncated if it exceeds a maximum length [Source 1].

## Signature

```typescript
export function generateToolName(
  operationId: string | undefined,
  method: string,
  path: string,
): string;
```

### Parameters

-   **`operationId`** `string | undefined`
    The `operationId` from the OpenAPI specification for the given operation. It may be `undefined` if not specified in the schema [Source 1].

-   **`method`** `string`
    The HTTP method for the operation, such as `get`, `post`, `put`, etc. [Source 1].

-   **`path`** `string`
    The URL path for the endpoint, for example, `/pets/{petId}` [Source 1].

### Returns

-   **`string`**
    A `snake_case` formatted string to be used as the tool name [Source 1].

## Examples

### Basic Usage with operationId

When an `operationId` is provided, it is converted to `snake_case` and used as the tool name.

```typescript
import { generateToolName } from 'yaaf';

const toolName = generateToolName('listPets', 'get', '/pets');

console.log(toolName);
// → 'list_pets'
```

### Fallback Naming without operationId

If `operationId` is `undefined`, the function generates a name from the HTTP method and the path. Path parameters like `{petId}` are parsed into `_by_id`.

```typescript
import { generateToolName } from 'yaaf';

const toolName = generateToolName(undefined, 'get', '/pets/{petId}');

console.log(toolName);
// → 'get_pets_by_id'
```

### Fallback with Complex Paths

The fallback mechanism handles more complex, nested paths by joining the segments with underscores.

```typescript
import { generateToolName } from 'yaaf';

const toolName = generateToolName(undefined, 'post', '/users/{userId}/orders');

console.log(toolName);
// → 'post_users_orders'
```

## See Also

This function is part of a set of [Utilities](../subsystems/utilities.md) for naming tools derived from OpenAPI specifications. Other related functions include `toSnakeCase` for string formatting and `deduplicateNames` for ensuring a set of tool names are unique [Source 1].

## Sources

[Source 1]: src/tools/openapi/naming.ts