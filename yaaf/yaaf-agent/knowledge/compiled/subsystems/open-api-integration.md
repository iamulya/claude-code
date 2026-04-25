---
summary: Provides a robust system for integrating OpenAPI 3.x specifications to automatically generate YAAF Tools.
primary_files:
 - src/tools/openapi/index.ts
 - src/tools/openapi/restApiTool.js
 - src/tools/openapi/naming.js
 - src/tools/openapi/auth.js
 - src/tools/openapi/parser.js
title: OpenAPI Integration
entity_type: subsystem
exports:
 - OpenAPIToolset
 - OpenAPIToolsetOptions
 - AuthConfig
search_terms:
 - generate tools from OpenAPI
 - REST API agent tools
 - Swagger tool generation
 - connect agent to API
 - how to call REST API from agent
 - OpenAPI spec to function calls
 - automatic tool creation
 - API authentication for agents
 - bearer token auth
 - filter OpenAPI operations
 - custom tool names from spec
 - external $ref resolution
stub: false
compiled_at: 2026-04-24T18:17:38.639Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The OpenAPI Integration subsystem automates the creation of YAAF `Tool` instances from an OpenAPI 3.x specification [Source 1]. Its primary purpose is to bridge the gap between a declarative API definition and an agent's executable capabilities. By parsing an OpenAPI document, it transforms each defined operation (e.g., `GET /users/{id}`, `POST /orders`) into a distinct `Tool` that an agent can invoke to interact with the corresponding REST API [Source 1]. This eliminates the need for developers to manually write wrapper code for each API endpoint. The subsystem is designed to be self-contained, using the native `fetch` API for HTTP requests and requiring no external dependencies for its core functionality [Source 1].

## Architecture

The subsystem is composed of several specialized modules that work in concert to parse the specification, generate [Tools](./tools.md), and execute API calls [Source 1].

*   **`index.ts`**: Serves as the main entry point, exposing the primary `OpenAPIToolset` class. This class provides static factory methods (`fromSpec`, `fromFile`, `fromURL`) for initiating the tool generation process from various sources [Source 1].
*   **`parser.js`**: This module is responsible for parsing the raw OpenAPI specification, whether in JSON or YAML format. It validates the spec and transforms it into an intermediate, structured representation (`ParsedOperation`) that other modules can easily consume. It also handles the resolution of external references (`$ref`) [Source 1].
*   **`naming.js`**: To ensure that each generated tool has a unique and understandable name for the agent, this module implements logic to generate names from operation IDs or paths. It includes functionality to deduplicate names if conflicts arise [Source 1].
*   **`auth.js`**: This module manages authentication. It takes an `AuthConfig` object and applies the necessary credentials (e.g., Bearer tokens) to outgoing API requests made by the generated tools [Source 1].
*   **`restApiTool.js`**: This is the core tool factory. The `createRestApiTool` function takes a parsed operation from `parser.js` and constructs a fully-functional YAAF `Tool` instance. This tool encapsulates the logic for making the HTTP request, handling parameters, and returning the result [Source 1].

## Integration Points

The primary output of the OpenAPI Integration subsystem is an array of `Tool` instances. These tools are designed to be directly consumed by the YAAF `Agent`. Developers integrate this subsystem by generating the tools and passing them into the `Agent` constructor's `tools` property [Source 1].

```typescript
// Example of integrating generated tools with an Agent
import { Agent } from 'yaaf-agent';
import { OpenAPIToolset } from 'yaaf-agent/tools/openapi';

const spec = /* ... OpenAPI spec string ... */;
const tools = OpenAPIToolset.fromSpec(spec);

const agent = new Agent({
  tools,
  systemPrompt: 'You are an AI assistant that can interact with our API.',
});
```

## Key APIs

The main public API for this subsystem is the `OpenAPIToolset` class and its configuration options [Source 1].

*   **`OpenAPIToolset.fromSpec(spec, options?)`**: Generates tools from a raw OpenAPI specification string (JSON or YAML).
*   **`OpenAPIToolset.fromFile(path, options?)`**: Asynchronously reads an OpenAPI specification from a local file path and generates tools.
*   **`OpenAPIToolset.fromURL(url, options?)`**: Asynchronously fetches an OpenAPI specification from a URL and generates tools.
*   **`OpenAPIToolsetOptions`**: A configuration object passed to the factory methods to customize tool generation and runtime behavior.

## Configuration

Behavior is customized through the `OpenAPIToolsetOptions` object passed to the factory methods. Key configuration options include [Source 1]:

*   **`auth`**: An `AuthConfig` object to provide global authentication credentials, such as a bearer token, for all generated tools.
*   **`credentials`**: A record mapping security scheme names from the spec to specific credential values.
*   **`operationFilter`**: Allows developers to selectively generate tools for a subset of API operations, either by providing an array of `operationId`s or a filter function.
*   **`nameOverrides`**: A dictionary to provide custom names for specific tools, mapping an `operationId` to a desired tool name.
*   **`headers`**: A record of custom HTTP headers to be included in every API request made by the tools.
*   **`timeoutMs`**: A timeout in milliseconds for API calls (defaults to 30,000).
*   **`fileResolver`**: A custom function for resolving external file references (`$ref`) within the specification.

## Extension Points

The subsystem offers specific points for extension and customization through its configuration options [Source 1]:

*   **Custom File Resolution**: The `fileResolver` option allows developers to provide their own logic for loading externally referenced files (`$ref`). This is essential [when](../apis/when.md) using `fromSpec()` or `fromURL()` with specs that are split across multiple files.
*   **Operation Filtering**: The `operationFilter` function provides a powerful hook to programmatically decide which API endpoints should be exposed to the agent, enabling fine-grained control over the agent's capabilities.

## Sources

*   [Source 1] `src/tools/openapi/index.ts`