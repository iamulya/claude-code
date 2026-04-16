---
export_name: RestApiToolConfig
source_file: src/tools/openapi/restApiTool.ts
category: type
summary: Configuration interface for REST-based tools, defining timeouts, headers, and authentication settings.
title: RestApiToolConfig
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:40.607Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/restApiTool.ts
confidence: 0.98
---

## Overview
`RestApiToolConfig` is a configuration interface used to define the execution environment for tools derived from OpenAPI operations. It provides the necessary parameters for the underlying HTTP client, including request timeouts, static headers, and security credentials required to authenticate against the target API.

This configuration is typically passed to the `createRestApiTool` factory function to instantiate a tool that an agent can use to perform RESTful operations.

## Signature / Constructor

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

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `timeoutMs` | `number` | The maximum duration in milliseconds to wait for an HTTP response before the tool returns a timeout error. |
| `extraHeaders` | `Record<string, string>` | A collection of key-value pairs representing HTTP headers that will be appended to every request made by the tool (e.g., `User-Agent` or `X-API-Version`). |
| `auth` | `AuthConfig` | (Optional) Global authentication configuration used to determine how credentials should be applied to requests. |
| `credentials` | `Record<string, string>` | A map of credential values (such as API keys or Bearer tokens) indexed by the name of the security scheme they belong to. |
| `securitySchemes` | `Record<string, SecurityScheme>` | A dictionary of security schemes extracted from the OpenAPI specification, defining the requirements for authentication (e.g., OAuth2, API Key, HTTP Basic). |

## Examples

### Basic Configuration
This example demonstrates setting up a configuration for an API that requires an API key and a custom header.

```typescript
import { createRestApiTool, type RestApiToolConfig } from './src/tools/openapi/restApiTool.js';

const config: RestApiToolConfig = {
  timeoutMs: 5000,
  extraHeaders: {
    'X-App-Name': 'YAAF-Agent'
  },
  credentials: {
    ApiKeyAuth: 'your-secret-api-key'
  },
  securitySchemes: {
    ApiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-KEY'
    }
  }
};

// Usage with createRestApiTool
// const tool = createRestApiTool(parsedOperation, config);
```

## Sources
- `src/tools/openapi/restApiTool.ts`