---
summary: A specific YAAF Tool implementation designed to interact with OpenAPI-defined REST APIs, wrapping a single API operation.
title: OpenAPI REST API Tool
entity_type: concept
related_subsystems:
 - subsystems/tools
see_also:
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
search_terms:
 - REST API tool for agents
 - how to call api from agent
 - OpenAPI specification tool
 - Swagger tool integration
 - agent API interaction
 - LLM calling external APIs
 - YAAF tool for HTTP requests
 - createRestApiTool function
 - RESTful agent tool
 - API operation as a tool
 - agent self-correction on API errors
 - configure API tool timeout
 - tool authentication
stub: false
compiled_at: 2026-04-25T00:22:18.306Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/restApiTool.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The OpenAPI REST API Tool is a specialized implementation of the YAAF [Tool](../apis/tool.md) interface that enables an [Agent](../apis/agent.md) to interact with external systems via REST APIs [Source 1]. It acts as a bridge between the agent's reasoning capabilities and the functionality exposed by a web service defined with an OpenAPI (formerly Swagger) specification.

Each instance of an OpenAPI REST API Tool corresponds to a single, specific API operation, such as `GET /users/{id}` or `POST /orders` [Source 1]. This one-to-one mapping provides a granular and well-defined capability that the [LLM](./llm.md) can select and use.

A key design principle of this tool is its error handling strategy. Instead of throwing exceptions for HTTP errors (e.g., 4xx or 5xx status codes), the tool returns the error response as data. This allows the agent's [LLM](./llm.md) to process the failure, understand the reason, and potentially self-correct by retrying the operation with different parameters or choosing an alternative tool [Source 1].

## How It Works in YAAF

The framework provides a factory function, [createRestApiTool](../apis/create-rest-api-tool.md), to generate these tools from a parsed OpenAPI specification [Source 1]. The creation process involves several steps:

1.  **Parsing**: An external OpenAPI parser first processes the API specification into a normalized `ParsedOperation` object.
2.  **Instantiation**: The [createRestApiTool](../apis/create-rest-api-tool.md) function accepts this [ParsedOperation](../apis/parsed-operation.md) object and a shared [RestApiToolConfig](../apis/rest-api-tool-config.md) object.
3.  **Schema Generation**: The tool's input schema, which informs the [LLM](./llm.md) about required and optional arguments, is automatically generated from the operation's parameters using an internal `operationToToolInput` function [Source 1].
4.  **Naming**: A descriptive name for the tool is generated based on the operation's method and path (e.g., `get_users_by_id`), though this can be overridden [Source 1].

When an agent decides to use an OpenAPI REST API Tool, the [Tool Execution](./tool-execution.md) process is as follows:

1.  The [LLM](./llm.md) provides the necessary arguments based on the tool's input schema.
2.  The tool constructs an HTTP request using the provided arguments.
3.  Authentication details are resolved and applied to the request using the provided configuration [Source 1].
4.  The request is executed using the native `fetch` API.
5.  The resulting HTTP response (both successful data and error details) is returned to the agent loop for the [LLM](./llm.md) to process [Source 1].

## Configuration

Configuration for all tools generated from a single OpenAPI specification is managed through the [RestApiToolConfig](../apis/rest-api-tool-config.md) object. This object is passed to the [createRestApiTool](../apis/create-rest-api-tool.md) function [Source 1].

Key configuration options include:

*   `timeoutMs`: The timeout for HTTP requests in milliseconds.
*   `extraHeaders`: A record of static headers to be included with every request.
*   `auth`: A global authentication configuration.
*   `credentials`: A mapping of security scheme names to the actual credentials (e.g., API keys, tokens).
*   `securitySchemes`: The complete definition of security schemes from the OpenAPI specification.

```typescript
// Example of creating a tool with configuration
import { createRestApiTool, type RestApiToolConfig } from 'yaaf/tools';
import type { ParsedOperation } from 'yaaf/tools/openapi';

// Assume 'getPetByIdOperation' is a ParsedOperation from an OpenAPI spec
declare const getPetByIdOperation: ParsedOperation;

const config: RestApiToolConfig = {
  timeoutMs: 5000,
  extraHeaders: {
    'X-Client-ID': 'yaaf-agent-runner',
  },
  credentials: {
    'api_key': 'my-secret-api-key',
  },
  // securitySchemes would be populated by the OpenAPI parser
  securitySchemes: {
    'api_key': { type: 'apiKey', in: 'header', name: 'X-API-KEY' }
  }
};

const getPetTool = createRestApiTool(getPetByIdOperation, config);
```

## See Also

*   [Tool](../apis/tool.md): The core interface that OpenAPI REST API Tools implement.
*   [Tools](../subsystems/tools.md): The subsystem responsible for managing and executing tools.
*   [createRestApiTool](../apis/create-rest-api-tool.md): The factory function for creating these tools.
*   [ParsedOperation](../apis/parsed-operation.md): The normalized representation of an API operation used to create a tool.
*   [RestApiToolConfig](../apis/rest-api-tool-config.md): The configuration object for REST API tools.

## Sources

[Source 1]: src/tools/openapi/restApiTool.ts