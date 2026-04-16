---
export_name: createRestApiTool
source_file: src/tools/openapi/restApiTool.ts
category: function
summary: Factory function that converts a parsed OpenAPI operation into a YAAF-compatible Tool.
title: createRestApiTool
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:34.552Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/restApiTool.ts
confidence: 0.98
---

## Overview
`createRestApiTool` is a factory function used to bridge OpenAPI specifications with the YAAF tool system. It transforms a single parsed API operation (such as `GET /users/{id}`) into a standard YAAF `Tool` that an agent can invoke.

The resulting tool automatically handles:
- Mapping LLM-provided arguments to path parameters, query strings, and request bodies.
- Executing HTTP requests using the environment's native `fetch` API.
- Managing authentication via provided security schemes and credentials.
- Error handling where REST errors are returned as data rather than thrown, allowing the LLM to observe the error and potentially self-correct or retry.

## Signature / Constructor

```typescript
export function createRestApiTool(
  operation: ParsedOperation,
  config: RestApiToolConfig,
  nameOverride?: string,
): Tool
```

### Parameters
- `operation`: A `ParsedOperation` object representing a normalized OpenAPI operation.
- `config`: A `RestApiToolConfig` object containing execution settings and authentication details.
- `nameOverride`: (Optional) A string to manually set the tool's name, bypassing the default naming logic.

### RestApiToolConfig
The configuration object defines how the tool interacts with the remote API:

| Property | Type | Description |
| :--- | :--- | :--- |
| `timeoutMs` | `number` | Timeout for HTTP requests in milliseconds. |
| `extraHeaders` | `Record<string, string>` | Static headers sent with every request. |
| `auth` | `AuthConfig` | (Optional) Global authentication configuration. |
| `credentials` | `Record<string, string>` | A map of security scheme identifiers to their respective secrets/tokens. |
| `securitySchemes` | `Record<string, SecurityScheme>` | The security definitions extracted from the OpenAPI specification. |

## Examples

### Basic Usage
This example demonstrates creating a tool from a parsed operation with API key authentication.

```typescript
import { createRestApiTool } from 'yaaf/tools';

// Assume 'getPetOperation' was produced by an OpenAPI parser
const petTool = createRestApiTool(
  getPetOperation,
  {
    timeoutMs: 10000,
    extraHeaders: {
      'User-Agent': 'YAAF-Agent/1.0'
    },
    credentials: {
      'api_key': 'your-secret-token-here'
    },
    securitySchemes: {
      'api_key': {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-KEY'
      }
    }
  }
);

console.log(petTool.name); // e.g., "get_pet_by_id"
```

## See Also
- `ParsedOperation`
- `AuthConfig`
- `SecurityScheme`