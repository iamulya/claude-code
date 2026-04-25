---
title: AuthConfig
entity_type: api
summary: Defines the structure for various OpenAPI authentication configurations, such as API key, bearer token, and basic auth.
export_name: AuthConfig
source_file: src/tools/openapi/auth.ts
category: type
search_terms:
 - OpenAPI authentication
 - API key auth
 - bearer token auth
 - how to authenticate OpenAPI tools
 - OpenAPIToolset auth
 - REST API credentials
 - security scheme configuration
 - passing API keys to tools
 - agent API authentication
 - auth config object
 - global authentication
 - per-operation credentials
stub: false
compiled_at: 2026-04-24T16:51:38.838Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/auth.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AuthConfig` type defines the configuration object for authenticating requests made by [Tools](../subsystems/tools.md) generated from an OpenAPI specification [Source 1]. It provides a structured way to represent various authentication methods, including API keys (in headers or query parameters), bearer tokens, and basic authentication [Source 1, 2].

This configuration is primarily used with the `OpenAPIToolset` to provide global authentication credentials that apply to all generated tools. It can be passed via the `auth` property in the `OpenAPIToolsetOptions` [Source 2].

Internally, the framework uses helper functions like `applyAuth` to take an `AuthConfig` object and modify the headers and query parameters of an outgoing HTTP request accordingly. The `resolveAuth` and `schemeToAuthConfig` functions help in automatically determining the correct `AuthConfig` from an OpenAPI specification's security schemes and user-provided credentials [Source 1].

## Signature

`AuthConfig` is a union type that can represent different authentication strategies. The known structures are for API keys and bearer tokens [Source 1, 2].

```typescript
export type AuthConfig =
  | { type: "apiKey"; in: "header" | "query"; name: string; value: string }
  | { type: "bearer"; token: string }
  // Other authentication types like 'basic' may also be supported.
```

**Type Members:**

*   **API Key Auth**:
    *   `type`: Must be `"apiKey"`.
    *   `in`: The location of the API key, either `"header"` or `"query"`.
    *   `name`: The name of the header or query parameter (e.g., `X-API-Key`).
    *   `value`: The secret API key.
*   **Bearer Token Auth** (inferred from examples [Source 2]):
    *   `type`: Must be `"bearer"`.
    *   `token`: The bearer token value.

## Examples

### Global Bearer Token Authentication

This example shows how to provide a global bearer token for all tools created by `OpenAPIToolset.fromSpec`. This configuration will add an `Authorization: Bearer <token>` header to every API call.

```typescript
import { OpenAPIToolset } from 'yaaf';
import type { AuthConfig } from 'yaaf';

// Your OpenAPI specification string
const spec = `...`;

// Define the bearer token authentication
const authConfig: AuthConfig = {
  type: 'bearer',
  token: process.env.API_TOKEN!,
};

// Create the toolset with global authentication
const tools = OpenAPIToolset.fromSpec(spec, {
  auth: authConfig,
});
```

### API Key in Header

This example demonstrates configuring an API key sent in a custom header.

```typescript
import { OpenAPIToolset } from 'yaaf';
import type { AuthConfig } from 'yaaf';

const spec = `...`;

// Define authentication for an API key in the 'X-API-KEY' header
const authConfig: AuthConfig = {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-KEY',
  value: 'my-secret-api-key-12345',
};

const tools = OpenAPIToolset.fromSpec(spec, {
  auth: authConfig,
});
```

## Sources

[Source 1]: src/tools/openapi/auth.ts
[Source 2]: src/tools/openapi/index.ts