---
summary: Factory function to create a YAAF Tool from a parsed OpenAPI operation.
export_name: createRestApiTool
source_file: src/tools/openapi/restApiTool.ts
category: function
title: createRestApiTool
entity_type: api
search_terms:
 - OpenAPI tool factory
 - create tool from OpenAPI spec
 - REST API agent tool
 - how to use OpenAPI with YAAF
 - generate tools from swagger
 - HTTP request tool
 - connect agent to API
 - RestApiToolConfig
 - ParsedOperation to Tool
 - dynamic tool creation
 - auth for API tools
 - tool naming override
stub: false
compiled_at: 2026-04-24T16:59:40.817Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/restApiTool.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `createRestApiTool` function is a factory that constructs a YAAF `Tool` from a single, parsed OpenAPI operation [Source 1]. This is a key component for integrating external REST APIs into a YAAF agent.

Each tool created by this function encapsulates one specific API endpoint, such as `GET /users/{userId}`. [when](./when.md) invoked by an agent, the tool builds an HTTP request using arguments supplied by the [LLM](../concepts/llm.md), executes it using the native `fetch` API, and returns the response. A notable feature is its error handling: REST API errors (e.g., 4xx or 5xx status codes) are returned as data within the agent loop rather than being thrown as exceptions. This design allows the LLM to process the error and potentially self-correct or retry the operation [Source 1].

This function is typically used after parsing an entire OpenAPI specification, iterating over the parsed operations to generate a collection of [Tools](../subsystems/tools.md) for an agent.

## Signature

The function takes a parsed operation, a shared configuration object, and an optional name override, and returns a `Tool` instance [Source 1].

```typescript
export function createRestApiTool(
  operation: ParsedOperation,
  config: RestApiToolConfig,
  nameOverride?: string,
): Tool;
```

### Parameters

*   **`operation`**: `ParsedOperation`
    The normalized representation of a single API operation, obtained from the YAAF [OpenAPI Parser](../subsystems/open-api-parser.md) [Source 1].
*   **`config`**: `RestApiToolConfig`
    A configuration object containing shared settings for the tool, such as authentication credentials, timeouts, and custom headers [Source 1].
*   **`nameOverride`**: `string` (optional)
    An optional string to override the automatically generated tool name. If not provided, a name is generated based on the operation's details [Source 1].

### Configuration (`RestApiToolConfig`)

The `config` parameter is of type `RestApiToolConfig`, which defines the runtime behavior of the created tool [Source 1].

```typescript
export type RestApiToolConfig = {
  /** Timeout for HTTP requests in ms */
  timeoutMs: number;
  /** Extra headers sent with every request */
  extraHeaders: Record<string, string>;
  /** Global auth config */
  auth?: AuthConfig;
  /** Per-scheme credentials */
  credentials: Record<string, string>;
  /** All security schemes from the spec */
  securitySchemes: Record<string, SecurityScheme>;
};
```

## Examples

The following example demonstrates how to create a tool from a mock `ParsedOperation` object. This process would typically be part of a larger loop that generates tools from a full OpenAPI specification.

```typescript
import { createRestApiTool, RestApiToolConfig } from 'yaaf';
import type { ParsedOperation, SecurityScheme } from 'yaaf/openapi';

// Assume this operation was produced by the OpenAPI parser
const getPetByIdOperation: ParsedOperation = {
  path: '/pets/{petId}',
  method: 'get',
  operationId: 'getPetById',
  summary: 'Find pet by ID',
  description: 'Returns a single pet',
  parameters: [
    {
      name: 'petId',
      in: 'path',
      required: true,
      schema: { type: 'integer', format: 'int64' },
    },
  ],
  // ... other parsed properties
};

// Shared configuration for all tools created from this API
const apiConfig: RestApiToolConfig = {
  timeoutMs: 5000,
  extraHeaders: {
    'User-Agent': 'YAAF-Agent/1.0',
  },
  credentials: {
    'api_key': 'my-secret-api-key',
  },
  securitySchemes: {
    'api_key': {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-KEY',
    },
  },
};

// Create the tool
const getPetTool = createRestApiTool(getPetByIdOperation, apiConfig);

// The 'getPetTool' can now be added to an agent's toolset.
// Its name would be automatically generated, e.g., "getPetById".
// Its input schema would expect an object like { petId: 123 }.
console.log(getPetTool.name); // e.g., "getPetById"
```

## See Also

*   `Tool`: The base interface for all tools in YAAF.
*   `ParsedOperation`: The data structure representing a parsed OpenAPI operation, which is the primary input for this factory.

## Sources

[Source 1]: src/tools/openapi/restApiTool.ts