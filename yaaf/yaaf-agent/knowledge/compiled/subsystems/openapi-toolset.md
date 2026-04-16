---
primary_files:
  - src/tools/openapi/index.ts
  - src/tools/openapi/parser.ts
  - src/tools/openapi/restApiTool.ts
  - src/tools/openapi/naming.ts
  - src/tools/openapi/auth.ts
summary: A subsystem that automatically generates YAAF Tool instances from OpenAPI 3.x specifications.
title: OpenAPI Toolset
entity_type: subsystem
exports:
  - OpenAPIToolset
  - OpenAPIToolsetOptions
  - ParsedOperation
  - AuthConfig
stub: false
compiled_at: 2026-04-16T14:38:08.252Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/index.ts
confidence: 0.95
---

## Purpose
The OpenAPI Toolset subsystem automates the creation of YAAF Tool instances by parsing OpenAPI 3.x specifications. It eliminates the need for manual tool definition when interacting with existing RESTful services. Each operation defined in the specification (e.g., `GET /pets`, `POST /orders`) is converted into a discrete Tool that an agent can invoke.

The subsystem is designed to be lightweight, utilizing the native `fetch` API for HTTP execution to maintain zero required external dependencies. Support for YAML specifications is available via an optional `yaml` peer dependency.

## Architecture
The subsystem is organized into several functional components that handle the lifecycle of converting a specification into executable tools:

*   **Parser (`parser.ts`)**: Responsible for ingesting OpenAPI documents, resolving internal and external `$ref` pointers, and flattening the specification into `ParsedOperation` objects.
*   **Tool Factory (`restApiTool.ts`)**: Converts parsed operations into YAAF-compatible Tool instances. It encapsulates the logic for mapping tool arguments to HTTP parameters (path, query, header) and request bodies.
*   **Naming Engine (`naming.ts`)**: Generates valid, unique tool names from operation IDs or paths and ensures there are no collisions within a generated toolset.
*   **Authentication Handler (`auth.ts`)**: Manages the application of security schemes, such as Bearer tokens or API keys, to the outgoing requests.

## Key APIs
The primary entry point for the subsystem is the `OpenAPIToolset` class (or static factory methods), which provides three main ways to load specifications:

### `OpenAPIToolset.fromSpec(spec: string, options?: OpenAPIToolsetOptions)`
Generates tools from a raw JSON or YAML string.

### `OpenAPIToolset.fromFile(path: string, options?: OpenAPIToolsetOptions)`
An asynchronous method that reads a specification from the local file system. It automatically configures a `FileResolver` relative to the file's directory to handle external references.

### `OpenAPIToolset.fromURL(url: string, options?: OpenAPIToolsetOptions)`
An asynchronous method that fetches a specification from a remote URL.

### Example Usage
```typescript
// From a URL with authentication
const tools = await OpenAPIToolset.fromURL('https://api.example.com/openapi.json', {
  auth: { type: 'bearer', token: process.env.API_TOKEN },
})

// Use with an Agent
const agent = new Agent({ 
  tools, 
  systemPrompt: 'You are a helpful assistant that interacts with the Example API.' 
})
```

## Configuration
The `OpenAPIToolsetOptions` object allows for fine-grained control over how tools are generated and how the resulting API calls behave:

| Property | Description |
| :--- | :--- |
| `format` | Override format detection (`json`, `yaml`, or `auto`). |
| `credentials` | A map of credential values keyed by the security scheme names defined in the spec. |
| `auth` | A global `AuthConfig` applied to all generated tools. |
| `operationFilter` | An array of `operationIds` or a function to include/exclude specific API endpoints. |
| `nameOverrides` | A mapping to rename specific operations in the resulting toolset. |
| `timeoutMs` | Request timeout in milliseconds (defaults to 30,000ms). |
| `headers` | Custom headers to be included in every API request. |
| `fileResolver` | A custom strategy for resolving external `$ref` links. |

## Extension Points
The subsystem provides the `FileResolver` interface to customize how external references are loaded. This is particularly useful in environments where standard file system access is restricted or when specifications are distributed across multiple network locations.

Developers can also influence tool generation by providing a custom `operationFilter`, allowing for the creation of specialized agents that only have access to a subset of a large API.