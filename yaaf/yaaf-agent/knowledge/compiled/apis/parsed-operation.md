---
summary: Represents a normalized API operation extracted from an OpenAPI specification.
export_name: ParsedOperation
source_file: src/tools/openapi/parser.ts
category: type
title: ParsedOperation
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:35.996Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/parser.ts
confidence: 1
---

## Overview
`ParsedOperation` is a TypeScript type used to represent a single, normalized API endpoint extracted from an OpenAPI 3.x specification. It serves as the output format for the YAAF OpenAPI parser, providing a flattened structure where `$ref` pointers have been resolved and parameters are consolidated.

This type is primarily used by agent tools to understand the requirements of an API call, including the necessary HTTP method, path, parameters, and request body structure.

## Signature / Constructor

```typescript
export type ParsedOperation = {
  operationId?: string
  method: HttpMethod
  path: string
  summary: string
  description: string
  serverUrl: string
  parameters: ParsedParam[]
  requestBody?: ParsedBody
  /** Security scheme names required by this operation */
  security?: string[]
}
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `operationId` | `string` (optional) | The unique identifier for the operation as defined in the OpenAPI spec. |
| `method` | `HttpMethod` | The HTTP verb used for the request (`get`, `post`, `put`, `patch`, or `delete`). |
| `path` | `string` | The endpoint path, relative to the `serverUrl`. |
| `summary` | `string` | A brief summary of the operation's purpose. |
| `description` | `string` | A verbose explanation of the operation's behavior. |
| `serverUrl` | `string` | The resolved base URL for the API server. |
| `parameters` | `ParsedParam[]` | A list of normalized parameters (path, query, header, or cookie). |
| `requestBody` | `ParsedBody` (optional) | The normalized definition of the expected request payload and media type. |
| `security` | `string[]` (optional) | A list of security scheme names (e.g., "ApiKeyAuth") required to execute this operation. |

## Examples

### Basic Operation Definition
This example demonstrates a standard GET operation as represented by the `ParsedOperation` type.

```typescript
import { ParsedOperation } from './src/tools/openapi/parser';

const getPetOperation: ParsedOperation = {
  operationId: 'getPetById',
  method: 'get',
  path: '/pet/{petId}',
  summary: 'Find pet by ID',
  description: 'Returns a single pet based on the ID provided in the path.',
  serverUrl: 'https://petstore.swagger.io/v2',
  parameters: [
    {
      name: 'petId',
      in: 'path',
      required: true,
      schema: { type: 'integer', format: 'int64' },
      description: 'ID of pet to return'
    }
  ],
  security: ['api_key']
};
```

### Operation with Request Body
This example shows a POST operation that includes a structured request body.

```typescript
const addPetOperation: ParsedOperation = {
  operationId: 'addPet',
  method: 'post',
  path: '/pet',
  summary: 'Add a new pet to the store',
  description: 'Adds a new pet to the inventory using a JSON payload.',
  serverUrl: 'https://petstore.swagger.io/v2',
  parameters: [],
  requestBody: {
    required: true,
    mediaType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        status: { type: 'string' }
      },
      required: ['name']
    }
  }
};
```