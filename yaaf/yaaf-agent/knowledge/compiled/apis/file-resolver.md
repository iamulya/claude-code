---
summary: A type defining a function signature for resolving external file references in OpenAPI specifications.
export_name: FileResolver
source_file: src/tools/openapi/parser.ts
category: type
title: FileResolver
entity_type: api
search_terms:
 - OpenAPI external references
 - resolve $ref in OpenAPI
 - custom file loader for specs
 - how to load split OpenAPI files
 - OpenAPIToolset fileResolver option
 - loading YAML/JSON from disk
 - parser file resolution
 - handle relative file paths in spec
 - external schema resolution
 - multi-file OpenAPI spec
 - YAAF OpenAPI parser
 - load external components
stub: false
compiled_at: 2026-04-24T17:06:36.873Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/parser.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`FileResolver` is a function type that defines a callback for loading external files referenced within an OpenAPI specification via `$ref` [Source 2]. It is a crucial component for parsing specifications that are split across multiple files, such as referencing schemas from `./models/pet.yaml` [Source 2].

This function is used by the internal [OpenAPI Parser](../subsystems/open-api-parser.md) to fetch and parse the content of these external files. The parser resolves any relative paths against the base directory of the main specification file before passing the resulting path to the `FileResolver` [Source 2].

A custom `FileResolver` must be provided in the `OpenAPI[[[[[[[[Tools]]]]]]]]etOptions` [when](./when.md) using `OpenAPIToolset.fromSpec()` or `OpenAPIToolset.fromURL()` if the specification contains external file references. When using `OpenAPIToolset.fromFile()`, a default resolver is automatically created that reads files relative to the input specification's directory [Source 1].

## Signature

The `FileResolver` is a function type with the following signature [Source 2]:

```typescript
export type FileResolver = (filePath: string) => Record<string, unknown> | undefined;
```

**Parameters:**

*   `filePath` (`string`): The resolved path to the external file. The OpenAPI parser handles the resolution of relative paths before invoking this function [Source 2].

**Returns:**

*   `Record<string, unknown> | undefined`: The parsed content of the file as a JavaScript object. If the file cannot be loaded or parsed, the function should return `undefined` [Source 2].

## Examples

### Basic FileResolver Implementation

This example shows a simple `FileResolver` that synchronously reads a file from disk and parses it as JSON [Source 2].

```typescript
import { readFileSync } from 'node:fs';
import type { FileResolver } from 'yaaf';

const myFileResolver: FileResolver = (filePath) => {
  try {
    const rawContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(rawContent);
  } catch (error) {
    console.error(`Failed to resolve file: ${filePath}`, error);
    return undefined;
  }
};
```

### Using with OpenAPIToolset

Here is how to provide a custom `FileResolver` when creating Tools from a specification string that contains external file references [Source 1].

```typescript
import { OpenAPIToolset } from 'yaaf';
import { readFileSync } from 'node:fs';
import type { FileResolver } from 'yaaf';

// A resolver that can handle both JSON and YAML (requires 'yaml' dependency)
import yaml from 'yaml';

const multiFormatResolver: FileResolver = (filePath) => {
  try {
    const rawContent = readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return yaml.parse(rawContent);
    }
    return JSON.parse(rawContent);
  } catch {
    return undefined;
  }
};

const specString = readFileSync('./api/main.json', 'utf-8');

// The spec string contains refs like: `$ref: './schemas/User.yaml'`
const tools = OpenAPIToolset.fromSpec(specString, {
  fileResolver: multiFormatResolver,
});
```

## See Also

*   `OpenAPIToolset`: The primary class for generating tools from an OpenAPI specification, which uses the `FileResolver`.

## Sources

*   [Source 1]: `src/tools/openapi/index.ts`
*   [Source 2]: `src/tools/openapi/parser.ts`