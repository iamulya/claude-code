---
title: operationToToolInput
entity_type: api
summary: Converts a ParsedOperation into a flat JSON Schema (`ToolInput`) for LLM consumption.
export_name: operationToToolInput
source_file: src/tools/openapi/schema.ts
category: function
search_terms:
 - OpenAPI to JSON Schema
 - convert OpenAPI operation to tool
 - LLM function calling schema
 - flatten JSON schema for LLM
 - ParsedOperation to ToolInput
 - how to create tool input from API
 - YAAF OpenAPI tools
 - request body and query params to schema
 - tool schema generation
 - handle parameter name collisions
 - __body_ prefix
 - simplify schema for language models
stub: false
compiled_at: 2026-04-24T17:24:51.372Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/schema.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `operationToToolInput` function is a utility that converts a `ParsedOperation` object, derived from an OpenAPI specification, into a single, flat JSON Schema suitable for use as a tool's input definition for a Large Language Model ([LLM](../concepts/llm.md)) [Source 1].

This conversion is designed to optimize the schema for LLM consumption. LLMs generally produce more reliable function call arguments [when](./when.md) the input schema is flat, meaning all properties are at the top level rather than nested within complex objects. The function achieves this by inlining properties from the request body alongside other parameters (e.g., query, path). In cases of a name collision between a parameter and a request body property, the body property is prefixed with `__body_` to ensure uniqueness [Source 1].

The primary use case for this function is within the OpenAPI tool generation subsystem, where it prepares an API endpoint to be presented as a callable tool to an agent [Source 1].

## Signature

```typescript
export function operationToToolInput(operation: ParsedOperation): ToolInput;
```

**Parameters:**

*   `operation` (`ParsedOperation`): The parsed representation of a single OpenAPI operation, containing details about its parameters and request body [Source 1].

**Returns:**

*   `ToolInput`: A JSON Schema object that represents the combined, flattened inputs for the operation [Source 1].

## Examples

### GET Request with Query Parameters

A `GET` request with multiple query parameters is converted into an object schema with a property for each parameter [Source 1].

```typescript
// OpenAPI operation for: GET /pets?limit=10&status=available
const parsedOperation = { /* ... ParsedOperation object ... */ };

const toolInput = operationToToolInput(parsedOperation);

// Resulting toolInput schema:
// {
//   type: 'object',
//   properties: {
//     limit: { type: 'integer', ... },
//     status: { type: 'string', enum: ['available'], ... }
//   }
// }
```

### POST Request with Body and Query Parameters

A `POST` request with a JSON body and a query parameter results in a schema where properties from both are merged into the top-level `properties` object. Required fields from the request body are preserved in the schema's `required` array [Source 1].

```typescript
// OpenAPI operation for: POST /pets with body { name: string, tag?: string } and query param `dryRun`
const parsedOperation = { /* ... ParsedOperation object ... */ };

const toolInput = operationToToolInput(parsedOperation);

// Resulting toolInput schema:
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string', ... },
//     tag: { type: 'string', ... },
//     dryRun: { type: 'boolean', ... }
//   },
//   required: ['name']
// }
```

## See Also

*   `getBodyPropertyNames`: A related utility function that identifies which properties in the generated `ToolInput` schema correspond to the original request body, used for reconstructing the API call [Source 1].
*   `ParsedOperation`: The input type for this function, representing a parsed OpenAPI endpoint.
*   `ToolInput`: The return type, representing a JSON Schema for a tool's arguments.

## Sources

[Source 1] src/[Tools](../subsystems/tools.md)/openapi/schema.ts