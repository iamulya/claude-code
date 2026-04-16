---
export_name: OpenAPIToolset
source_file: src/tools/openapi/index.ts
category: class
summary: Factory class for creating YAAF Tools from OpenAPI specifications via JSON, files, or URLs.
title: OpenAPIToolset
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:10.807Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/index.ts
confidence: 0.98
---

## Overview
The `OpenAPIToolset` class provides a factory interface for automatically generating YAAF Tool instances from OpenAPI 3.x specifications. Each operation defined in the specification (e.g., `GET /pets`, `POST /orders`) is converted into a separate Tool that agents can use to interact with the REST API.

The toolset uses the native `fetch` API for HTTP execution, requiring no external dependencies for runtime execution. Support for YAML specifications requires the optional `yaml` peer dependency.

## Signature / Constructor
The `OpenAPIToolset` is typically used via its static factory methods rather than direct instantiation.

### OpenAPIToolsetOptions
```typescript
export type OpenAPIToolsetOptions = {
  /** Override format detection ('json' | 'yaml' | 'auto', default: 'auto') */
  format?: 'json' | 'yaml' | 'auto'
  /** Credential values keyed by security scheme name from the spec */
  credentials?: Record<string, string>
  /** Global auth config applied to all tools */
  auth?: AuthConfig
  /**
   * Filter which operations to generate tools for.
   * Pass an array of operationIds or a filter function.
   */
  operationFilter?: string[] | ((operationId: string, method: string, path: string) => boolean)
  /** Override generated tool names: { operationId: 'custom_name' } */
  nameOverrides?: Record<string, string>
  /** Timeout for API calls in ms (default: 30_000) */
  timeoutMs?: number
  /** Custom headers added to every API request */
  headers?: Record<string, string>
  /**
   * Custom file resolver for external `$ref` resolution.
   * If not provided, `fromFile()` auto-creates one from the spec's directory.
   * For `fromSpec()` and `fromURL()`, external file refs require this.
   */
  fileResolver?: FileResolver
}
```

## Methods & Properties

### static fromSpec()
Generates tools from a raw specification string or object.
```typescript
static fromSpec(spec: string | object, options?: OpenAPIToolsetOptions): Tool[]
```

### static fromFile()
Asynchronously reads a specification from the local filesystem and generates tools.
```typescript
static fromFile(path: string, options?: OpenAPIToolsetOptions): Promise<Tool[]>
```

### static fromURL()
Asynchronously fetches a specification from a remote URL and generates tools.
```typescript
static fromURL(url: string, options?: OpenAPIToolsetOptions): Promise<Tool[]>
```

## Examples

### Basic Usage
Creating tools from various sources.

```typescript
// From a JSON spec string
const tools = OpenAPIToolset.fromSpec(jsonString);

// From a file
const toolsFromFile = await OpenAPIToolset.fromFile('./petstore.json');

// From a URL
const toolsFromURL = await OpenAPIToolset.fromURL('https://petstore3.swagger.io/api/v3/openapi.json');
```

### Authentication and Agent Integration
Configuring tools with authentication and passing them to an agent.

```typescript
// With authentication
const tools = OpenAPIToolset.fromSpec(spec, {
  auth: { 
    type: 'bearer', 
    token: process.env.API_TOKEN! 
  },
});

// Use with an Agent
const agent = new Agent({ 
  tools, 
  systemPrompt: 'You manage the pet store.' 
});
```

## See Also
* `Tool`
* `AuthConfig`