---
title: ToolInput
entity_type: api
summary: A type representing the flat JSON Schema for an LLM tool's input.
export_name: ToolInput
source_file: src/tool.ts
category: type
search_terms:
 - LLM tool input schema
 - function calling arguments
 - JSON schema for tools
 - flat schema for agents
 - how to define tool parameters
 - agent tool argument format
 - OpenAPI to tool schema
 - inlining request body properties
 - YAAF tool parameters
 - tool argument validation
 - defining agent capabilities
 - tool parameter structure
stub: false
compiled_at: 2026-04-24T17:45:05.073Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/schema.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`ToolInput` is a TypeScript type that represents a JSON Schema used to define the input parameters for a tool. It is specifically designed to be consumed by Large Language Models (LLMs).

The key design principle of the `ToolInput` schema is that it is "flat," meaning all properties are defined at the top level of the schema object. This structure is preferred because LLMs generally produce more reliable and accurate function call arguments [when](./when.md) working with flat schemas rather than nested ones [Source 1].

In [Integrations](../subsystems/integrations.md) like the OpenAPI tool generator, parameters from different sources (e.g., path, query, request body) are consolidated into a single flat `ToolInput` schema. Properties from a request body are inlined alongside other parameters. To prevent conflicts, a `__body_` prefix is added to a body property's name if it collides with a parameter name from another source [Source 1].

## Signature

`ToolInput` is a type alias for a JSON Schema object. While the exact type definition may vary, it conforms to the structure of a standard JSON Schema object with properties at the top level.

```typescript
export type ToolInput = {
  type: 'object';
  properties: {
    [propertyName: string]: {
      type: string;
      description?: string;
      // ... other JSON Schema properties
    };
  };
  required?: string[];
};
```

## Examples

The following examples demonstrate how parameters from an API operation are converted into a flat `ToolInput` schema.

### Example 1: GET Request with Query Parameters

A simple `GET` request with two query parameters is represented as a schema with two top-level properties.

```typescript
// Operation: GET /pets?limit=10&status=available

// Corresponding ToolInput schema:
const toolInputSchema: ToolInput = {
  type: 'object',
  properties: {
    limit: {
      type: 'integer',
      description: 'The number of pets to return.'
    },
    status: {
      type: 'string',
      description: 'The status of pets to filter by.',
      enum: ['available', 'pending', 'sold']
    }
  }
};
```

### Example 2: POST Request with Body and Query Parameters

A `POST` request with a JSON body and a query parameter results in a single flat schema where properties from both sources are combined. The `required` field is populated based on the request body's schema [Source 1].

```typescript
// Operation: POST /pets with body { name: string, tag?: string } and query param `dryRun`

// Corresponding ToolInput schema:
const toolInputSchema: ToolInput = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: "The pet's name."
    },
    tag: {
      type: 'string',
      description: 'An optional tag for the pet.'
    },
    dryRun: {
      type: 'boolean',
      description: 'If true, the request is validated but not executed.'
    }
  },
  required: ['name']
};
```

## Sources

[Source 1]: src/[Tools](../subsystems/tools.md)/openapi/schema.ts