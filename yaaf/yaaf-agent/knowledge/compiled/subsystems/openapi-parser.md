---
summary: A subsystem for parsing and normalizing OpenAPI 3.x specifications into a format usable by YAAF agents.
primary_files:
  - src/tools/openapi/parser.ts
title: OpenAPI Parser
entity_type: subsystem
exports:
  - parseOpenAPISpec
  - ParsedOperation
  - FileResolver
  - ParseResult
stub: false
compiled_at: 2026-04-16T14:38:26.370Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/parser.ts
confidence: 1
---

## Purpose
The OpenAPI Parser subsystem is responsible for transforming OpenAPI 3.x specification documents into a normalized format that YAAF agents can consume. It abstracts the complexity of the OpenAPI specification—such as nested references, polymorphic parameter locations, and various security schemes—into a structured list of operations ready for tool invocation.

The subsystem handles the heavy lifting of specification traversal, ensuring that LLM-powered agents receive clean, actionable metadata about API endpoints without needing to navigate the raw OpenAPI structure.

## Architecture
The subsystem is designed as a stateless transformation engine. It processes a raw JavaScript object (representing a JSON or YAML OpenAPI spec) and produces a `ParseResult`.

### Internal Logic
The parser implements several critical resolution strategies:
- **Reference Resolution**: It resolves `$ref` pointers across three scopes:
    - Local JSON Pointers (e.g., `#/components/schemas/Pet`).
    - Relative file references (e.g., `./models/pet.yaml`).
    - Combined file and pointer references (e.g., `./models.yaml#/Pet`).
- **Circular Reference Detection**: It identifies recursive definitions within the specification to prevent infinite loops during the normalization process.
- **Data Normalization**: It flattens the hierarchical structure of paths and methods into discrete `ParsedOperation` objects, extracting server URLs, parameters, and request body schemas.
- **Security Extraction**: It identifies and maps security schemes (API Key, HTTP, OAuth2, and OpenID Connect) required by specific operations.

## Key APIs

### parseOpenAPISpec
The primary function used to initiate the parsing process. It requires the raw specification and accepts optional configuration for resolving external references.

```typescript
export function parseOpenAPISpec(
  spec: Record<string, unknown>,
  options?: ResolveOptions,
): ParseResult
```

### ParsedOperation
The core data structure representing a single API endpoint.

| Field | Type | Description |
| :--- | :--- | :--- |
| `operationId` | `string` (optional) | Unique identifier for the operation. |
| `method` | `HttpMethod` | The HTTP verb (get, post, put, patch, delete). |
| `path` | `string` | The endpoint path template. |
| `serverUrl` | `string` | The base URL extracted from the spec's servers list. |
| `parameters` | `ParsedParam[]` | Normalized list of path, query, header, and cookie parameters. |
| `requestBody` | `ParsedBody` (optional) | Schema and media type for the request payload. |
| `security` | `string[]` (optional) | Security scheme names required for this operation. |

### FileResolver
A callback type that allows the parser to load external files referenced via `$ref`.

```typescript
export type FileResolver = (filePath: string) => Record<string, unknown> | undefined
```

## Extension Points

### External Reference Resolution
Developers can extend the parser's capability to handle multi-file specifications by providing a custom `FileResolver`. This allows the parser to work in different environments (e.g., Node.js using `fs` or a browser using `fetch`) by defining how external file paths should be loaded and converted into objects.

```typescript
const resolver: FileResolver = (filePath) => {
  // Custom logic to read and parse JSON/YAML from filePath
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
};
```

## Sources
- `src/tools/openapi/parser.ts`