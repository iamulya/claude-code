---
summary: Provides YAAF tools for interacting with OpenAPI-defined REST APIs.
primary_files:
 - src/tools/openapi/restApiTool.ts
 - src/tools/openapi/parser.ts
 - src/tools/openapi/schema.ts
 - src/tools/openapi/naming.ts
 - src/tools/openapi/auth.ts
title: OpenAPI Tools
entity_type: subsystem
exports:
 - createRestApiTool
 - RestApiToolConfig
search_terms:
 - how to call REST API from agent
 - connect agent to external API
 - OpenAPI specification tools
 - Swagger integration
 - generate tools from OpenAPI spec
 - REST API tool generation
 - dynamic tool creation
 - API authentication for agents
 - HTTP request tool
 - YAAF API tools
 - using fetch in a tool
 - agent self-correction on API error
stub: false
compiled_at: 2026-04-24T18:17:56.087Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/restApiTool.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The OpenAPI [Tools](./tools.md) subsystem enables YAAF agents to interact with external services through REST APIs. It achieves this by dynamically generating YAAF `Tool` instances from a parsed OpenAPI specification. Each generated tool corresponds to a single API operation, such as `GET /users/{id}` or `POST /orders` [Source 1].

This subsystem acts as a bridge, translating the structured definition of an API operation into an executable function that the agent's reasoning loop can invoke. A key design principle is its error handling strategy: HTTP errors from the API (e.g., 404 Not Found, 500 Server Error) are not thrown as exceptions but are returned as data. This allows the [LLM](../concepts/llm.md) to process the error, self-correct its inputs, or attempt a different course of action [Source 1].

## Architecture

The subsystem is composed of several specialized modules that collaborate to create and execute API-backed tools. The central component is the `RestApiTool`, a YAAF `Tool` implementation that wraps a single API operation [Source 1].

The creation of a `RestApiTool` is orchestrated by the `[[[[[[[[createRestApiTool]]]]]]]]` factory function, which relies on several helper modules:

*   **Parser (`parser.ts`)**: This module is responsible for parsing an OpenAPI specification and normalizing its contents into a structured `ParsedOperation` object, which serves as the input for tool generation [Source 1].
*   **Schema (`schema.ts`)**: The `operationToToolInput` function translates the OpenAPI parameter and request body schemas into a format understood by the YAAF [Tool System](./tool-system.md). This defines the arguments the LLM must provide to call the tool [Source 1].
*   **Naming (`naming.ts`)**: The `generateToolName` function creates a unique, descriptive name for the tool based on the API operation's method and path, which can be optionally overridden [Source 1].
*   **Authentication (`auth.ts`)**: This module handles the application of security credentials to outgoing requests. The `applyAuth` function uses the provided `AuthConfig` and `credentials` to add API keys, bearer tokens, or other authentication details to the HTTP request headers or parameters [Source 1].
*   **Tool Implementation (`restApiTool.ts`)**: This file contains the core logic. The `RestApiTool` itself uses the native `fetch` API to execute the configured HTTP request. It assembles the request URL, headers, and body from the arguments supplied by the agent, applies authentication, and sends the request [Source 1].

## Key APIs

### createRestApiTool()

The primary factory function for this subsystem. It takes a `ParsedOperation` object from the parser and a shared configuration object to produce a complete, executable YAAF `Tool` [Source 1].

```typescript
export function createRestApiTool(
  operation: ParsedOperation,
  config: [[[[[[[[RestApiToolConfig]]]]]]]],
  nameOverride?: string,
): Tool;
```

### RestApiToolConfig

A type definition for the configuration object required by `createRestApiTool`. It centralizes settings that are often shared across all tools generated from a single API specification [Source 1].

## Configuration

The behavior of the generated API tools is controlled by the `RestApiToolConfig` object. This configuration is passed to the `createRestApiTool` function during the tool creation process [Source 1].

Key configuration properties include:

*   `timeoutMs`: The timeout in milliseconds for the underlying HTTP `fetch` request.
*   `extraHeaders`: A record of string key-value pairs for custom headers to be sent with every request.
*   `auth`: A global configuration object defining the authentication strategy.
*   `credentials`: A map where keys are the names of security schemes defined in the OpenAPI spec (e.g., "api_key") and values are the actual secrets (e.g., the API key string).
*   `securitySchemes`: The complete set of `SecurityScheme` objects parsed from the OpenAPI specification.

## Sources

[Source 1]: src/tools/openapi/restApiTool.ts