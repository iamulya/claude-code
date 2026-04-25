---
summary: Configuration interface for `createRestApiTool`.
export_name: RestApiToolConfig
source_file: src/tools/openapi/restApiTool.ts
category: type
title: RestApiToolConfig
entity_type: api
search_terms:
 - OpenAPI tool configuration
 - REST API tool settings
 - how to configure createRestApiTool
 - set timeout for API tool
 - add headers to REST tool
 - API tool authentication
 - provide credentials for OpenAPI tool
 - auth config for REST tool
 - security schemes for API tool
 - HTTP tool options
 - configure fetch in tool
 - RestApiTool options
stub: false
compiled_at: 2026-04-24T17:33:07.887Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/restApiTool.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`RestApiToolConfig` is a TypeScript type that defines the shared configuration for [Tools](../subsystems/tools.md) created from an OpenAPI specification using the `createRestApiTool` function [Source 1]. It centralizes settings that apply to all API operations being converted into tools, such as HTTP request timeouts, custom headers, and authentication details.

This configuration object is passed to `createRestApiTool` alongside a parsed API operation to produce a fully configured YAAF Tool [Source 1].

## Signature

The `RestApiToolConfig` type is defined as follows [Source 1]:

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

### Properties

*   **`timeoutMs`**: `number`
    The timeout for HTTP requests in milliseconds.

*   **`extraHeaders`**: `Record<string, string>`
    A key-value map of extra HTTP headers to be sent with every request made by the tool.

*   **`auth`**: `AuthConfig` (optional)
    Global authentication configuration. See the `AuthConfig` type for more details.

*   **`credentials`**: `Record<string, string>`
    A key-value map where the key is the name of a security scheme (e.g., `apiKeyAuth`) and the value is the corresponding credential (e.g., the API key string).

*   **`securitySchemes`**: `Record<string, SecurityScheme>`
    A map of all security schemes defined in the OpenAPI specification, as provided by the [OpenAPI Parser](../subsystems/open-api-parser.md). The keys are the scheme names. See the `SecurityScheme` type for more details.

## Examples

The following example demonstrates how to create a `RestApiToolConfig` object and use it with `createRestApiTool`.

```typescript
import { createRestApiTool, RestApiToolConfig } from 'yaaf';
import type { ParsedOperation, SecurityScheme } from 'yaaf/openapi';

// Assume these are provided by an OpenAPI parser
const parsedOperation: ParsedOperation = { /* ... parsed operation data ... */ };
const securitySchemes: Record<string, SecurityScheme> = {
  'apiKeyAuth': {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-KEY',
  }
};

// Define the shared configuration for all API tools
const config: RestApiToolConfig = {
  timeoutMs: 10000, // 10 second timeout
  extraHeaders: {
    'User-Agent': 'YAAF-Agent/1.0',
  },
  credentials: {
    // Provide the API key for the 'apiKeyAuth' security scheme
    'apiKeyAuth': 'your-secret-api-key-here',
  },
  securitySchemes: securitySchemes,
};

// Create a specific tool using the shared configuration
const getPetByIdTool = createRestApiTool(parsedOperation, config);

// Now `getPetByIdTool` can be used in an agent.
// When executed, it will use the timeout, headers, and credentials
// from the config object.
```

## Sources

[Source 1]: src/tools/openapi/restApiTool.ts