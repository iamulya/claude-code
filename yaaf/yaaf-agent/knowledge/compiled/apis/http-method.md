---
title: HttpMethod
entity_type: api
summary: Defines the supported HTTP methods for OpenAPI operations.
export_name: HttpMethod
source_file: src/tools/openapi/parser.ts
category: type
search_terms:
 - HTTP verbs
 - OpenAPI methods
 - REST API methods
 - get post put patch delete
 - what http methods are supported
 - type for http request method
 - openapi operation method
 - api endpoint verbs
 - ParsedOperation method type
 - http request types
stub: false
compiled_at: 2026-04-24T17:12:42.269Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/parser.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`HttpMethod` is a TypeScript string literal type that defines the set of HTTP methods recognized by the YAAF [OpenAPI Parser](../subsystems/open-api-parser.md) [Source 1]. It is used to specify the HTTP verb for a given API operation.

This type ensures that operations parsed from an OpenAPI specification have a valid and expected HTTP method, restricting the possible values to `get`, `post`, `put`, `patch`, or `delete`. It is a key property of the `ParsedOperation` type, which represents a normalized API operation [Source 1].

## Signature

`HttpMethod` is a string literal union type [Source 1].

```typescript
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
```

## Examples

The `HttpMethod` type is used as the type for the `method` property within a `ParsedOperation` object.

```typescript
import type { ParsedOperation, HttpMethod } from 'yaaf';

const getPetOperation: ParsedOperation = {
  // The 'method' property must be one of the values from HttpMethod
  method: 'get', // Valid HttpMethod
  path: '/pets/{petId}',
  summary: 'Find pet by ID',
  description: 'Returns a single pet',
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
};

const createPetOperation: ParsedOperation = {
  method: 'post', // Valid HttpMethod
  path: '/pets',
  summary: 'Add a new pet to the store',
  description: '',
  serverUrl: 'https://petstore.swagger.io/v2',
  parameters: [],
  requestBody: {
    required: true,
    mediaType: 'application/json',
    schema: { /* ... Pet schema ... */ }
  }
};
```

## Sources

[Source 1] src/[Tools](../subsystems/tools.md)/openapi/parser.ts