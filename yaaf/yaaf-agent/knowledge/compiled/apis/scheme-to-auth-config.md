---
title: schemeToAuthConfig
entity_type: api
summary: Converts an OpenAPI security scheme definition and a credential value into a YAAF AuthConfig object.
export_name: schemeToAuthConfig
source_file: src/tools/openapi/auth.ts
category: function
search_terms:
 - OpenAPI security scheme
 - convert security scheme to auth
 - create AuthConfig from OpenAPI
 - handle API key auth
 - bearer token configuration
 - basic auth setup
 - YAAF OpenAPI authentication
 - credential to AuthConfig
 - map credentials to security schemes
 - how to authenticate OpenAPI tool
 - auth helper function
 - programmatic auth config
stub: false
compiled_at: 2026-04-24T17:35:31.695Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/auth.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `schemeToAuthConfig` function is a utility for translating a security scheme object from a parsed OpenAPI specification into a YAAF `AuthConfig` object [Source 1]. It takes a `SecurityScheme` and a corresponding credential string (like an API key or token) and produces a structured configuration that can be used by other framework [Utilities](../subsystems/utilities.md), such as `applyAuth`, to authenticate HTTP requests [Source 1].

This function is essential [when](./when.md) building [Tools](../subsystems/tools.md) that interact with authenticated OpenAPI-defined endpoints. It bridges the gap between the declarative security definitions in an OpenAPI document and the concrete authentication details required for an API call. If the provided `SecurityScheme` type is not supported, the function returns `undefined` [Source 1].

## Signature

The function takes an OpenAPI `SecurityScheme` object and a string credential and returns an `AuthConfig` object or `undefined` [Source 1].

```typescript
export function schemeToAuthConfig(
  scheme: SecurityScheme,
  credential: string,
): AuthConfig | undefined;
```

### Parameters

-   **`scheme`** (`SecurityScheme`): The security scheme object from the parsed OpenAPI specification [Source 1].
-   **`credential`** (`string`): The credential value, such as an API key, a bearer token, or a "user:pass" string for basic authentication [Source 1].

### Return Value

-   (`AuthConfig | undefined`): A structured `AuthConfig` object if the scheme type is supported, otherwise `undefined` [Source 1].

### Related Types

The `AuthConfig` type defines the structure for authentication details. An example for an API key is shown below [Source 1]:

```typescript
export type AuthConfig =
  | { type: "apiKey"; in: "header" | "query"; name: string; value: string };
  // ... other auth types
```

The `SecurityScheme` type is imported from the [OpenAPI Parser](../subsystems/open-api-parser.md) module and represents a single security scheme definition from the specification [Source 1].

## Examples

The following example demonstrates how to convert an OpenAPI `apiKey` security scheme and a secret key into an `AuthConfig` object [Source 1].

```typescript
import { schemeToAuthConfig } from 'yaaf';
import type { SecurityScheme } from 'yaaf/openapi'; // Fictional import for type

// Example security scheme from an OpenAPI document
const apiKeyScheme: SecurityScheme = {
  type: 'apiKey',
  name: 'X-API-Key',
  in: 'header'
};

// The user-provided credential
const userCredential = 'my-secret-key';

// Convert to AuthConfig
const authConfig = schemeToAuthConfig(apiKeyScheme, userCredential);

console.log(authConfig);
/*
Output:
{
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
  value: 'my-secret-key'
}
*/
```

## See Also

-   `applyAuth`: A function that uses an `AuthConfig` object to modify request headers and query parameters.
-   `resolveAuth`: A higher-level function that resolves the correct `AuthConfig` from a list of required schemes and a map of user-provided credentials.

## Sources

[Source 1]: src/tools/openapi/auth.ts