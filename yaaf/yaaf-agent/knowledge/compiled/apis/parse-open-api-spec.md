---
title: parseOpenAPISpec
entity_type: api
summary: Parses an OpenAPI 3.x specification object into normalized operations and security schemes.
export_name: parseOpenAPISpec
source_file: src/tools/openapi/parser.ts
category: function
search_terms:
 - OpenAPI parser
 - parse swagger spec
 - how to use OpenAPI tools
 - extract API operations from spec
 - resolve $ref in OpenAPI
 - handle external references
 - FileResolver for OpenAPI
 - normalize API endpoints
 - get security schemes from spec
 - convert OpenAPI to function calls
 - YAAF OpenAPI integration
 - ParsedOperation type
 - circular reference detection
stub: false
compiled_at: 2026-04-24T17:26:36.061Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/parser.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `parseOpenAPISpec` function is a utility for parsing an OpenAPI 3.x specification document. It takes a raw OpenAPI specification object (parsed from JSON or YAML) and transforms it into a normalized, flat list of API operations and a map of security schemes [Source 1].

This function is essential for integrating external APIs as [Tools](../subsystems/tools.md) for an agent. It handles several complexities of the OpenAPI standard, including [Source 1]:
- **`$ref` Resolution**: Resolves internal JSON pointers (`#/components/schemas/Pet`), relative file references (`./models/pet.yaml`), and combined file/pointer references (`./models.yaml#/Pet`).
- **Circular Reference Detection**: Prevents infinite loops [when](./when.md) resolving schemas with circular dependencies.
- **Server URL Extraction**: Determines the base URL for each operation.
- **Parameter & Request Body Normalization**: Extracts and normalizes details about parameters and request bodies for each operation.

The output is a `ParseResult` object containing an array of `ParsedOperation` objects, which provide a clean, consistent interface for an agent to understand and invoke API endpoints [Source 1].

## Signature

The `parseOpenAPISpec` function takes an OpenAPI specification object and an optional configuration object for resolving external references [Source 1].

```typescript
export function parseOpenAPISpec(
  spec: Record<string, unknown>,
  options?: ResolveOptions,
): ParseResult;
```

The function may throw an error if the provided `spec` object is missing required fields like `openapi` or `paths` [Source 1].

### Parameters

- **`spec`** `Record<string, unknown>`: The OpenAPI specification as a plain JavaScript object.
- **`options?`** `ResolveOptions`: Optional configuration for the parser. The source material does not define `ResolveOptions` but provides the related `[[[[[[[[FileResolver]]]]]]]]` type for handling external `$ref` resolution [Source 1].

### Return Value

The function returns a `ParseResult` object with the following structure [Source 1]:

```typescript
export type ParseResult = {
  operations: ParsedOperation[];
  securitySchemes: Record<string, SecurityScheme>;
};
```

### Related Types

The parser uses several exported types to structure the normalized output [Source 1].

**`ParsedOperation`**: Represents a single, normalized API endpoint.
```typescript
export type ParsedOperation = {
  operationId?: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  summary: string;
  description: string;
  serverUrl: string;
  parameters: ParsedParam[];
  requestBody?: ParsedBody;
  security?: string[]; // Security scheme names
};
```

**`ParsedParam`**: Represents a single parameter for an operation.
```typescript
export type ParsedParam = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema: Record<string, unknown>;
  description?: string;
};
```

**`ParsedBody`**: Represents the request body for an operation.
```typescript
export type ParsedBody = {
  required: boolean;
  mediaType: string;
  schema: Record<string, unknown>;
};
```

**`SecurityScheme`**: Represents a security scheme defined in the specification.
```typescript
export type SecurityScheme = {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  name?: string;      // for apiKey
  in?: string;        // for apiKey: 'header' | 'query' | 'cookie'
  scheme?: string;    // for http: 'bearer', 'basic'
};
```

**`FileResolver`**: A callback function type used to load external files referenced via `$ref`. This is provided within the `options` parameter.
```typescript
export type FileResolver = (
  filePath: string
) => Record<string, unknown> | undefined;
```

## Examples

### Basic Usage

Parsing a simple, self-contained OpenAPI specification object.

```typescript
import { parseOpenAPISpec } from 'yaaf';

const petStoreSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Simple Pet Store API',
    version: '1.0.0',
  },
  servers: [
    { url: 'https://api.example.com/v1' }
  ],
  paths: {
    '/pets': {
      get: {
        summary: 'List all pets',
        operationId: 'listPets',
        responses: {
          '200': {
            description: 'A paged array of pets',
          },
        },
      },
    },
  },
};

try {
  const { operations, securitySchemes } = parseOpenAPISpec(petStoreSpec);
  console.log(operations);
  /*
  [
    {
      operationId: 'listPets',
      method: 'get',
      path: '/pets',
      summary: 'List all pets',
      description: '',
      serverUrl: 'https://api.example.com/v1',
      parameters: [],
      security: undefined
    }
  ]
  */
} catch (error) {
  console.error("Failed to parse spec:", error);
}
```

### Using a FileResolver for External References

To parse a specification that uses `$ref` to point to external files, you must provide a `FileResolver` function in the options [Source 1]. This function is responsible for reading the referenced file and returning its parsed content.

```typescript
import { parseOpenAPISpec, FileResolver } from 'yaaf';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

// The main spec file references an external file for its schemas.
const mainSpec = {
  openapi: '3.0.0',
  info: { title: 'API with external refs', version: '1.0.0' },
  paths: {
    '/users/{userId}': {
      get: {
        summary: 'Get a user by ID',
        parameters: [
          { $ref: './schemas.yaml#/components/parameters/UserId' }
        ],
        responses: { '200': { description: 'OK' } }
      }
    }
  }
};

// The resolver loads and parses the referenced file.
const fileResolver: FileResolver = (filePath) => {
  try {
    // Assuming the base path for resolution is the current directory
    const fullPath = join(process.cwd(), filePath);
    const rawContent = readFileSync(fullPath, 'utf-8');
    // Handle both JSON and YAML files
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return yaml.load(rawContent) as Record<string, unknown>;
    }
    return JSON.parse(rawContent);
  } catch (e) {
    console.error(`Could not resolve file: ${filePath}`, e);
    return undefined;
  }
};

// Assume schemas.yaml exists with the required content.
// File: schemas.yaml
/*
components:
  parameters:
    UserId:
      name: userId
      in: path
      required: true
      schema:
        type: integer
*/

const { operations } = parseOpenAPISpec(mainSpec, { fileResolver });

console.log(operations[0].parameters);
/*
[
  {
    name: 'userId',
    in: 'path',
    required: true,
    schema: { type: 'integer' }
  }
]
*/
```

## Sources
[Source 1]: src/tools/openapi/parser.ts