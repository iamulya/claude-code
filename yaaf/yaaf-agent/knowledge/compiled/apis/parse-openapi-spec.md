---
summary: Function to parse an OpenAPI 3.x specification into normalized operations and security schemes.
export_name: parseOpenAPISpec
source_file: src/tools/openapi/parser.ts
category: function
title: parseOpenAPISpec
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:27.507Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/parser.ts
confidence: 1
---

## Overview
`parseOpenAPISpec` is a utility function designed to transform a raw OpenAPI 3.x specification document into a normalized format. It extracts API operations and security schemes while resolving complex references and structural requirements.

The parser handles several critical aspects of OpenAPI processing:
*   **$ref Resolution**: Resolves local JSON pointers (e.g., `#/components/schemas/Pet`), relative file references (e.g., `./models/pet.yaml`), and combined file/pointer references.
*   **Circular Reference Detection**: Identifies and manages circular dependencies within the specification.
*   **Normalization**: Extracts server URLs, parameters, and request bodies into a consistent structure for use by other framework components.

## Signature / Constructor

```typescript
export function parseOpenAPISpec(
  spec: Record<string, unknown>,
  options?: ResolveOptions,
): ParseResult
```

### Parameters
*   `spec`: The OpenAPI specification provided as a plain JavaScript object (typically pre-parsed from JSON or YAML).
*   `options`: Optional configuration for the resolution process, including external file resolvers.

### Supporting Types

#### ParseResult
The object returned by the parser containing the flattened API structure.
```typescript
export type ParseResult = {
  operations: ParsedOperation[]
  securitySchemes: Record<string, SecurityScheme>
}
```

#### ParsedOperation
Represents a single HTTP endpoint and method combination.
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

#### FileResolver
A callback type used to load external files referenced via `$ref`.
```typescript
export type FileResolver = (filePath: string) => Record<string, unknown> | undefined
```

## Methods & Properties

### Parsed Components
The parser decomposes the specification into the following sub-components:

*   **ParsedParam**: Includes the parameter `name`, location (`in`: 'path', 'query', 'header', or 'cookie'), `required` status, and the underlying JSON `schema`.
*   **ParsedBody**: Contains the `mediaType`, `schema`, and `required` status for the request payload.
*   **SecurityScheme**: Normalizes authentication requirements, supporting `apiKey`, `http` (bearer/basic), `oauth2`, and `openIdConnect`.

## Examples

### Basic Usage
Parsing a simple OpenAPI object already loaded into memory.

```typescript
import { parseOpenAPISpec } from 'yaaf/tools/openapi';

const spec = {
  openapi: "3.0.0",
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        responses: { /* ... */ }
      }
    }
  }
};

const { operations, securitySchemes } = parseOpenAPISpec(spec);
console.log(operations[0].operationId); // "listPets"
```

### With External Reference Resolution
Using a `FileResolver` to handle specifications split across multiple files.

```typescript
import { readFileSync } from 'fs';
import { parseOpenAPISpec, FileResolver } from 'yaaf/tools/openapi';

const resolver: FileResolver = (filePath) => {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return undefined;
  }
};

const mainSpec = JSON.parse(readFileSync('./openapi.json', 'utf-8'));
const result = parseOpenAPISpec(mainSpec, { resolver });
```

## See Also
* [OpenAPI 3.x Specification](https://spec.openapis.org/oas/v3.0.0)