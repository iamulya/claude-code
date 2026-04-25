---
title: ParseResult
entity_type: api
summary: The result object returned by the OpenAPI parser, containing parsed operations and security schemes.
export_name: ParseResult
source_file: src/tools/openapi/parser.ts
category: type
search_terms:
 - OpenAPI parse result
 - parsed API operations
 - extracted security schemes
 - what does parseOpenAPISpec return
 - OpenAPI tool output
 - list of API endpoints
 - API specification parsing
 - normalized API operations
 - structure of parsed OpenAPI spec
 - security scheme definition
 - ParsedOperation type
 - SecurityScheme type
stub: false
compiled_at: 2026-04-24T17:26:28.743Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/parser.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ParseResult` type defines the structure of the object returned by the `parseOpenAPISpec` function. It represents a normalized and processed OpenAPI 3.x specification, making it easy for an agent to understand and use the defined API [Source 1].

This object contains two key properties: `operations`, a flat list of all available API endpoints, and `securitySchemes`, a dictionary of the authentication and [Authorization](../concepts/authorization.md) methods required by the API [Source 1].

## Signature

`ParseResult` is a type alias for an object with the following structure [Source 1]:

```typescript
export type ParseResult = {
  operations: ParsedOperation[];
  securitySchemes: Record<string, SecurityScheme>;
};
```

### Constituent Types

The `ParseResult` type is composed of several other exported types that describe the parsed API in detail [Source 1]:

```typescript
// A single, normalized API operation
export type ParsedOperation = {
  operationId?: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  summary: string;
  description: string;
  serverUrl: string;
  parameters: ParsedParam[];
  requestBody?: ParsedBody;
  security?: string[];
};

// A single security scheme definition
export type SecurityScheme = {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  name?: string; // for apiKey
  in?: string; // for apiKey: 'header' | 'query' | 'cookie'
  scheme?: string; // for http: 'bearer', 'basic'
};

// A parameter for an operation
export type ParsedParam = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema: Record<string, unknown>;
  description?: string;
};

// The request body for an operation
export type ParsedBody = {
  required: boolean;
  mediaType: string;
  schema: Record<string, unknown>;
};
```

## Properties

- **`operations`**: `ParsedOperation[]`
  An array of `ParsedOperation` objects. Each object represents a single, fully resolved API endpoint, including its HTTP method, path, parameters, request body, and security requirements [Source 1].

- **`securitySchemes`**: `Record<string, SecurityScheme>`
  A key-value map where each key is the name of a security scheme (e.g., `api_key_auth`) and the value is a `SecurityScheme` object describing its type and details. This allows an agent to look up the authentication requirements for an operation listed in its `security` array [Source 1].

## Examples

Below is a conceptual example of a `ParseResult` object that might be returned after parsing a simple OpenAPI specification.

```typescript
const result: ParseResult = {
  operations: [
    {
      operationId: "getUserById",
      method: "get",
      path: "/users/{userId}",
      summary: "Get user by ID",
      description: "Retrieves the details of a specific user.",
      serverUrl: "https://api.example.com/v1",
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "The ID of the user to retrieve."
        }
      ],
      security: ["ApiKeyAuth"]
    }
  ],
  securitySchemes: {
    "ApiKeyAuth": {
      type: "apiKey",
      name: "X-API-KEY",
      in: "header"
    }
  }
};
```

## See Also

- `parseOpenAPISpec`: The function that consumes an OpenAPI specification and returns a `ParseResult`.

## Sources

[Source 1] `src/tools/openapi/parser.ts`