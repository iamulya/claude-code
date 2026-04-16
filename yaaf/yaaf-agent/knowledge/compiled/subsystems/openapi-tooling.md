---
primary_files:
  - src/tools/openapi/auth.ts
  - src/tools/openapi/parser.ts
  - src/tools/openapi/restApiTool.ts
  - src/tools/openapi/schema.ts
title: OpenAPI Tooling
entity_type: subsystem
summary: A subsystem for converting OpenAPI specifications into executable YAAF tools, handling schema flattening, authentication, and HTTP request execution.
exports:
  - createRestApiTool
  - operationToToolInput
  - applyAuth
  - resolveAuth
  - schemeToAuthConfig
stub: false
compiled_at: 2026-04-16T14:37:48.988Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/auth.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/restApiTool.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/schema.ts
confidence: 0.95
---

## Purpose
The OpenAPI Tooling subsystem enables YAAF agents to interact with external RESTful services by dynamically generating tools from OpenAPI specifications. It bridges the gap between complex API definitions and LLM-compatible function calls by automating schema conversion, managing authentication state, and handling the underlying HTTP communication.

A primary goal of this subsystem is to optimize API descriptions for Large Language Models (LLMs). It achieves this by flattening nested request structures into simplified JSON Schemas, which improves the reliability of LLM tool-calling performance.

## Architecture
The subsystem is organized into several functional areas that handle the lifecycle of an API-based tool:

### Schema Conversion and Flattening
The `schema.ts` module is responsible for transforming a `ParsedOperation` into a `ToolInput` (JSON Schema). To improve LLM reasoning, the subsystem employs a flattening strategy:
*   **Parameter Inlining**: Path and query parameters are placed at the top level of the schema.
*   **Body Inlining**: Properties from the request body are also moved to the top level.
*   **Collision Management**: If a parameter name conflicts with a body property name, the body property is prefixed with `__body_`.
*   **Simplification**: Noise is removed from the schemas to reduce token usage and complexity.

### Authentication Management
The `auth.ts` module manages the application of security credentials to requests. It supports multiple authentication patterns:
*   **API Keys**: Injected via headers or query parameters.
*   **Bearer Tokens**: Standard Authorization headers.
*   **Basic Auth**: Username and password credentials.
*   **Custom Headers**: Arbitrary header-based authentication.

The system can automatically detect required security schemes from the OpenAPI specification and resolve them against user-provided credentials using `resolveAuth`.

### Tool Execution
The `RestApiTool` (defined in `restApiTool.ts`) is the concrete implementation of a YAAF Tool for OpenAPI operations. Each instance of `RestApiTool` wraps a single API operation (e.g., `POST /users`). 

When executed, the tool:
1.  Maps LLM-provided arguments back to their respective locations (path, query, or body).
2.  Applies the resolved authentication configuration.
3.  Executes the request using the native `fetch` API.
4.  Returns the response data to the agent.

Notably, REST errors are returned as data rather than throwing exceptions. This design allows the agent to observe the error (e.g., a 400 Bad Request) and attempt to self-correct its input.

## Key APIs

### `createRestApiTool(operation, config, nameOverride?)`
The primary factory function for creating a YAAF Tool from a parsed OpenAPI operation. It requires a `RestApiToolConfig` to handle shared concerns like timeouts and credentials.

### `operationToToolInput(operation)`
Converts a parsed operation into a flat JSON Schema. This is used during tool initialization to define the interface the LLM will see.

### `resolveAuth(requiredSchemes, allSchemes, credentials, globalAuth?)`
Matches the security requirements of a specific operation against a map of provided credentials, returning the appropriate `AuthConfig`.

### `applyAuth(headers, query, auth)`
A utility function that modifies the mutable headers and query objects of a pending request to include the necessary authentication data.

## Configuration
The OpenAPI subsystem is configured via the `RestApiToolConfig` object, which includes:

| Field | Type | Description |
| :--- | :--- | :--- |
| `timeoutMs` | `number` | The maximum time to wait for an HTTP response. |
| `extraHeaders` | `Record<string, string>` | Static headers included in every request. |
| `auth` | `AuthConfig` | A fallback global authentication configuration. |
| `credentials` | `Record<string, string>` | A map of credential values keyed by the security scheme name defined in the OpenAPI spec. |
| `securitySchemes` | `Record<string, SecurityScheme>` | The full set of security schemes extracted from the OpenAPI document. |

## Extension Points
Developers can influence the behavior of the OpenAPI tooling through:
*   **Name Overrides**: Providing a custom name to `createRestApiTool` to bypass the default naming logic.
*   **Credential Mapping**: Providing a `credentials` map that allows the subsystem to resolve different keys for different security schemes within the same API.
*   **Manual Tool Construction**: Using `operationToToolInput` and `applyAuth` independently to build custom tool implementations that deviate from the standard `RestApiTool` behavior.