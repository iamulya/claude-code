---
summary: Represents a parsed parameter from an OpenAPI operation.
export_name: ParsedParam
source_file: src/tools/openapi/parser.ts
category: type
title: ParsedParam
entity_type: api
search_terms:
 - OpenAPI parameter definition
 - REST API parameter type
 - path parameter schema
 - query parameter schema
 - header parameter schema
 - cookie parameter schema
 - what is a parsed parameter
 - OpenAPI tool generation
 - API operation parameters
 - parameter 'in' property
 - parameter schema object
 - required API parameters
stub: false
compiled_at: 2026-04-24T17:27:28.613Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/parser.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/schema.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ParsedParam` type defines a normalized, internal representation of a single parameter for an API operation parsed from an OpenAPI specification [Source 2]. It encapsulates all the essential information about a parameter, including its name, location (path, query, header, or cookie), schema, and whether it is required.

This type is a key data structure produced by the YAAF [OpenAPI Parser](../subsystems/open-api-parser.md). It is used by other parts of the OpenAPI tool generation subsystem, such as the `operationToToolInput` function, to construct a flat JSON Schema that defines the input for the final generated `Tool` [Source 3]. An array of `ParsedParam` objects is contained within the `ParsedOperation` type [Source 2].

## Signature

`ParsedParam` is a TypeScript type alias with the following structure [Source 2]:

```typescript
export type ParsedParam = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema: Record<string, unknown>;
  description?: string;
};
```

### Properties

-   **`name`**: `string`
    The name of the parameter. This name is used as the key in the tool's input schema.

-   **`in`**: `"path" | "query" | "header" | "cookie"`
    The location of the parameter in the HTTP request.

-   **`required`**: `boolean`
    A boolean indicating whether the parameter is mandatory for the operation.

-   **`schema`**: `Record<string, unknown>`
    A JSON Schema object describing the type and constraints of the parameter's value.

-   **`description`**: `string` (optional)
    A human-readable description of the parameter, often used for generating documentation or prompts for an [LLM](../concepts/llm.md).

## Examples

Below are examples of what `ParsedParam` objects look like for different kinds of API parameters.

### Path Parameter

A required `userId` path parameter for an endpoint like `GET /users/{userId}`.

```typescript
const userIdParam: ParsedParam = {
  name: "userId",
  in: "path",
  required: true,
  schema: {
    type: "integer",
    format: "int64",
  },
  description: "ID of the user to retrieve",
};
```

### Query Parameter

An optional `limit` query parameter for an endpoint like `GET /items?limit=25`.

```typescript
const limitParam: ParsedParam = {
  name: "limit",
  in: "query",
  required: false,
  schema: {
    type: "integer",
    default: 20,
    minimum: 1,
  },
  description: "The number of items to return.",
};
```

## See Also

-   `ParsedOperation`: The parent data structure that contains an array of `ParsedParam` objects for a single API operation.
-   `operationToToolInput`: A function that consumes `ParsedParam` objects to generate a `ToolInput` JSON schema.
-   `OpenAPI[[[[[[[[Tools]]]]]]]]et`: The primary class for generating Tools from an OpenAPI specification.