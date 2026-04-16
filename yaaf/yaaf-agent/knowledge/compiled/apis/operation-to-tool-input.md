---
summary: Converts a ParsedOperation into a flat JSON Schema for the tool's input, optimized for LLM consumption.
export_name: operationToToolInput
source_file: src/tools/openapi/schema.ts
category: function
title: operationToToolInput
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:44.062Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/schema.ts
confidence: 1
---

## Overview
`operationToToolInput` is a utility function designed to transform a `ParsedOperation` (an internal representation of an OpenAPI endpoint) into a `ToolInput` JSON Schema. This schema defines the arguments that a Large Language Model (LLM) must provide to execute a specific tool.

The function follows a specific design philosophy to optimize for LLM performance: it generates "flat" schemas where properties are kept at the top level rather than nested. This approach is intended to improve the accuracy of LLM function calling. To achieve this, the function inlines request body properties alongside query and path parameters. In the event of a name collision between a parameter and a body property, the body property is prefixed with `__body_`.

## Signature / Constructor

```typescript
export function operationToToolInput(operation: ParsedOperation): ToolInput
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `operation` | `ParsedOperation` | The parsed representation of an OpenAPI operation, including its parameters and request body definitions. |

### Returns
| Type | Description |
| :--- | :--- |
| `ToolInput` | A JSON Schema object representing the combined input requirements for the tool. |

## Examples

### Converting a GET Request
A simple GET request with query parameters is converted into a flat object schema.

```typescript
// GET /pets?limit=10&status=available
// Resulting ToolInput:
{
  "type": "object",
  "properties": {
    "limit": { "type": "integer" },
    "status": { "type": "string" }
  }
}
```

### Converting a POST Request with Body and Parameters
When an operation includes both a request body and parameters, they are merged into a single top-level schema.

```typescript
// POST /pets?dryRun=true
// Body: { name: string, tag?: string }
// Resulting ToolInput:
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "tag": { "type": "string" },
    "dryRun": { "type": "boolean" }
  },
  "required": ["name"]
}
```

## See Also
- `getBodyPropertyNames`: A companion function used to identify which keys in the generated schema correspond to the original request body for request construction.