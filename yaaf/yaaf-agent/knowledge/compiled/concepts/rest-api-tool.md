---
summary: A pattern for wrapping OpenAPI operations into executable agent tools that handle HTTP communication and authentication.
title: REST API Tool
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:38:43.296Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/restApiTool.ts
confidence: 0.9
---

---
title: REST API Tool
entity_type: concept
summary: A pattern for wrapping OpenAPI operations into executable agent tools that handle HTTP communication and authentication.
related_subsystems:
  - tools
  - openapi

## What It Is
The **REST API Tool** is a specialized implementation of the YAAF Tool interface designed to bridge Large Language Models (LLMs) with external RESTful services. It solves the problem of manual API integration by automatically translating OpenAPI (Swagger) operation definitions into executable functions that an agent can invoke.

By wrapping individual API endpoints, the REST API Tool allows an agent to interact with web services using structured arguments while the framework handles the underlying complexities of HTTP transport, parameter mapping, and authentication.

## How It Works in YAAF
In YAAF, a REST API Tool typically represents a single operation from an OpenAPI specification (e.g., `GET /users/{id}` or `POST /orders`). The lifecycle of a tool execution follows these steps:

1.  **Schema Mapping**: The framework uses `operationToToolInput` to convert OpenAPI parameter and request body schemas into a format the LLM understands.
2.  **Argument Resolution**: When the LLM calls the tool, the framework maps the provided arguments to the correct locations in the HTTP request (path, query, headers, or body).
3.  **Authentication**: The tool applies security requirements using `applyAuth` and `resolveAuth`, drawing from the provided `securitySchemes` and `credentials`.
4.  **Execution**: The request is executed via the environment's native `fetch` API.
5.  **Error Handling**: Unlike standard TypeScript functions that might throw exceptions on HTTP errors (like 404 or 500), the REST API Tool returns these errors as data. This design allows the LLM to observe the failure and attempt to self-correct or retry the operation with different parameters.

The primary entry point for creating these tools is the `createRestApiTool` factory function, which consumes a `ParsedOperation` and a configuration object.

## Configuration
Developers configure REST API Tools through the `RestApiToolConfig` object. This configuration manages global settings for the tool's execution environment, including timeouts and security credentials.

```typescript
export type RestApiToolConfig = {
  /** Timeout for HTTP requests in ms */
  timeoutMs: number
  /** Extra headers sent with every request */
  extraHeaders: Record<string, string>
  /** Global auth config */
  auth?: AuthConfig
  /** Per-scheme credentials */
  credentials: Record<string, string>
  /** All security schemes from the spec */
  securitySchemes: Record<string, SecurityScheme>
}
```

When creating a tool, the configuration is passed alongside the parsed operation:

```typescript
const tool = createRestApiTool(parsedOperation, {
  timeoutMs: 5000,
  extraHeaders: { 'X-App-Source': 'YAAF-Agent' },
  credentials: {
    ApiKeyAuth: 'your-api-key-here'
  },
  securitySchemes: {
    ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-KEY' }
  }
});
```

## Sources
- `src/tools/openapi/restApiTool.ts`