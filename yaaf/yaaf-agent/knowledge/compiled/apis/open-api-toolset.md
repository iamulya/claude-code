---
summary: A utility class that automatically generates YAAF Tool instances from an OpenAPI 3.x specification.
export_name: OpenAPIToolset
source_file: src/tools/openapi/index.ts
category: class
title: OpenAPIToolset
entity_type: api
search_terms:
 - generate tools from OpenAPI
 - REST API agent tools
 - Swagger tool generation
 - connect agent to API
 - OpenAPI 3.x integration
 - how to call REST API from agent
 - automatic tool creation
 - API specification to tools
 - petstore example
 - API authentication for tools
 - filter OpenAPI operations
 - custom tool names from spec
 - YAML spec support
stub: false
compiled_at: 2026-04-24T17:24:36.108Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `OpenAPI[[[[[[[[Tools]]]]]]]]et` is a utility class that automatically generates an array of YAAF `Tool` instances from an OpenAPI 3.x specification [Source 1]. Each operation defined in the specification, such as `GET /pets` or `POST /orders`, is converted into a distinct `Tool`. This enables an agent to interact with the corresponding REST API by calling these generated Tools [Source 1].

This class is designed to be self-contained, using the native `fetch` API for all HTTP requests, which means it has zero required runtime dependencies. Support for specifications written in YAML is available but requires the optional `yaml` peer dependency to be installed [Source 1].

`OpenAPIToolset` provides static factory methods to load specifications from various sources, including strings, local files, and remote URLs [Source 1].

## Signature / Constructor

`OpenAPIToolset` is not instantiated directly via a constructor. Instead, it is used through its static factory methods (`fromSpec`, `fromFile`, `fromURL`), which accept an optional configuration object of type `OpenAPIToolsetOptions` [Source 1].

### `OpenAPIToolsetOptions`

This type defines the configuration options for generating tools from an OpenAPI specification [Source 1].

```typescript
export type OpenAPIToolsetOptions = {
  /** Override format detection ('json' | 'yaml' | 'auto', default: 'auto') */
  format?: "json" | "yaml" | "auto";
  /** Credential values keyed by security scheme name from the spec */
  credentials?: Record<string, string>;
  /** Global auth config applied to all tools */
  auth?: AuthConfig;
  /**
   * Filter which operations to generate tools for.
   * Pass an array of operationIds or a filter function.
   */
  operationFilter?: string[] | ((operationId: string, method: string, path: string) => boolean);
  /** Override generated tool names: { operationId: 'custom_name' } */
  nameOverrides?: Record<string, string>;
  /** Timeout for API calls in ms (default: 30_000) */
  timeoutMs?: number;
  /** Custom headers added to every API request */
  headers?: Record<string, string>;
  /**
   * Custom file resolver for external `$ref` resolution.
   * If not provided, `fromFile()` auto-creates one from the spec's directory.
   * For `fromSpec()` and `fromURL()`, external file refs require this.
   */
  fileResolver?: FileResolver;
};
```

**Properties:**

*   `format`: Specifies the format of the input specification. Can be `'json'`, `'yaml'`, or `'auto'`. Defaults to `'auto'` for automatic detection [Source 1].
*   `credentials`: An object mapping security scheme names from the specification to their corresponding credential values (e.g., API keys) [Source 1].
*   `auth`: A global authentication configuration to be applied to all generated tools [Source 1].
*   `operationFilter`: Allows for selective tool generation. It can be an array of `operationId` strings to include, or a function that returns `true` for operations that should have a tool generated [Source 1].
*   `nameOverrides`: An object to provide custom names for tools, mapping an `operationId` to a desired tool name [Source 1].
*   `timeoutMs`: The timeout in milliseconds for all API calls made by the tools. Defaults to `30000` (30 seconds) [Source 1].
*   `headers`: A record of custom HTTP headers to be included in every API request [Source 1].
*   `fileResolver`: A custom function for resolving external `$ref` references within the specification. This is required [when](./when.md) using `fromSpec()` or `fromURL()` with specs that reference external files. When using `fromFile()`, a resolver is automatically created based on the input file's directory [Source 1].

## Methods & Properties

`OpenAPIToolset` exposes static factory methods to create toolsets [Source 1].

### `OpenAPIToolset.fromSpec()`

Generates tools from an OpenAPI specification provided as a string.

```typescript
static fromSpec(spec: string, options?: OpenAPIToolsetOptions): Tool[];
```

### `OpenAPIToolset.fromFile()`

Asynchronously generates tools from an OpenAPI specification located at a local file path.

```typescript
static async fromFile(path: string, options?: OpenAPIToolsetOptions): Promise<Tool[]>;
```

### `OpenAPIToolset.fromURL()`

Asynchronously generates tools from an OpenAPI specification at a remote URL.

```typescript
static async fromURL(url: string, options?: OpenAPIToolsetOptions): Promise<Tool[]>;
```

## Examples

The following examples demonstrate common usage patterns for `OpenAPIToolset` [Source 1].

### From a JSON String

```typescript
// From a JSON spec string
const tools = OpenAPIToolset.fromSpec(jsonString);
```

### From a File

```typescript
// From a file
const tools = await OpenAPIToolset.fromFile('./petstore.json');
```

### From a URL

```typescript
// From a URL
const tools = await OpenAPIToolset.fromURL('https://petstore3.swagger.io/api/v3/openapi.json');
```

### With Authentication

This example shows how to configure bearer token authentication for all generated tools.

```typescript
// With authentication
const tools = OpenAPIToolset.fromSpec(spec, {
  auth: { type: 'bearer', token: process.env.API_TOKEN! },
});
```

### Use with an Agent

Once the tools are generated, they can be passed directly to the `Agent` constructor.

```typescript
// Use with an Agent
const agent = new Agent({ tools, systemPrompt: 'You manage the pet store.' });
```

## Sources

[Source 1]: src/tools/openapi/index.ts