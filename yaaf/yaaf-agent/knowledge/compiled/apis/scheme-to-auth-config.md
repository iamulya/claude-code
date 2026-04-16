---
export_name: schemeToAuthConfig
source_file: src/tools/openapi/auth.ts
category: function
title: schemeToAuthConfig
entity_type: api
summary: Build an AuthConfig object from an OpenAPI security scheme and a credential value.
stub: false
compiled_at: 2026-04-16T14:37:57.859Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/auth.ts
confidence: 1
---

## Overview
The `schemeToAuthConfig` function is a utility within the YAAF OpenAPI toolset designed to bridge the gap between static OpenAPI security definitions and active authentication configurations. It takes a security scheme parsed from an OpenAPI specification and combines it with a runtime credential (such as an API key or token) to produce an `AuthConfig` object.

This function is primarily used during the tool execution phase to prepare authentication data before it is applied to an HTTP request. If the provided security scheme type is not supported by the framework, the function returns `undefined`.

## Signature / Constructor
```typescript
export function schemeToAuthConfig(
  scheme: SecurityScheme,
  credential: string,
): AuthConfig | undefined;
```

### Parameters
*   `scheme`: The `SecurityScheme` object extracted from the OpenAPI specification.
*   `credential`: A string containing the actual credential value (e.g., the API key, a bearer token, or a "user:pass" string for basic auth).

### Return Value
Returns an `AuthConfig` object if the scheme is supported, or `undefined` if the framework cannot process the specific security scheme type.

## Examples
The following example demonstrates how an `apiKey` security scheme is converted into a functional configuration.

```typescript
// Define a scheme typically found in an OpenAPI document
const scheme = { 
  type: 'apiKey', 
  name: 'X-API-Key', 
  in: 'header' 
};

// Provide the runtime credential
const credential = 'my-secret-key';

// Generate the AuthConfig
const authConfig = schemeToAuthConfig(scheme, credential);

/**
 * Resulting authConfig:
 * { 
 *   type: 'apiKey', 
 *   in: 'header', 
 *   name: 'X-API-Key', 
 *   value: 'my-secret-key' 
 * }
 */
```

## See Also
*   `AuthConfig`
*   `applyAuth`
*   `resolveAuth`