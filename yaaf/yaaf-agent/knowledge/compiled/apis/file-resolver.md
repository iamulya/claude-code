---
summary: Callback type for loading external files referenced by OpenAPI $ref pointers.
export_name: FileResolver
source_file: src/tools/openapi/parser.ts
category: type
title: FileResolver
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:33.424Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/parser.ts
confidence: 0.95
---

## Overview
`FileResolver` is a callback type used by the YAAF OpenAPI parser to resolve external file references within an OpenAPI specification. When the parser encounters a `$ref` pointing to an external file (e.g., `./models/pet.yaml` or `./models.yaml#/Pet`), it invokes the provided `FileResolver` to retrieve and parse the content of that file.

This mechanism allows the framework to remain environment-agnostic, as the consumer provides the specific logic for reading from the filesystem, a network resource, or a memory cache.

## Signature / Constructor
```typescript
export type FileResolver = (filePath: string) => Record<string, unknown> | undefined
```

### Parameters
*   `filePath`: A `string` representing the resolved path to the external file. Relative paths are typically resolved against the base directory of the primary specification before being passed to this callback.

### Return Value
The function must return the parsed content of the file as a `Record<string, unknown>` (a plain JavaScript object). If the file cannot be loaded or parsed, it should return `undefined`.

## Examples
The following example demonstrates a basic implementation using Node.js filesystem utilities to resolve JSON-formatted OpenAPI fragments.

```typescript
import { readFileSync } from 'fs';
import { FileResolver } from 'yaaf';

const resolver: FileResolver = (filePath) => {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to resolve file at ${filePath}:`, error);
    return undefined;
  }
};
```

## See Also
* `parseOpenAPISpec` (Function that utilizes this type)
* `ResolveOptions` (Interface containing the resolver configuration)