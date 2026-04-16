---
export_name: resolveAuth
source_file: src/tools/openapi/auth.ts
category: function
title: resolveAuth
entity_type: api
summary: Resolves authentication configuration from OpenAPI security schemes and user-provided credentials.
stub: false
compiled_at: 2026-04-16T14:38:01.083Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/auth.ts
confidence: 1
---

## Overview
`resolveAuth` is a utility function used to determine the appropriate authentication configuration for an OpenAPI operation. It reconciles the security requirements of a specific endpoint with the available security schemes defined in the OpenAPI document and the credentials provided by the user.

The function prioritizes schemes required by the operation. It iterates through the `requiredSchemes` and returns the first valid `AuthConfig` generated from a scheme that has a corresponding entry in the `credentials` map. If no required schemes can be resolved, it returns the `globalAuth` fallback if one is provided.

## Signature
```typescript
export function resolveAuth(
  requiredSchemes: string[] | undefined,
  allSchemes: Record<string, SecurityScheme>,
  credentials: Record<string, string>,
  globalAuth?: AuthConfig,
): AuthConfig | undefined
```

### Parameters
*   **requiredSchemes**: An array of strings representing the names of security schemes required by the specific OpenAPI operation.
*   **allSchemes**: A record of all `SecurityScheme` objects defined in the OpenAPI specification, keyed by their names.
*   **credentials**: A record of user-provided credential values (such as API keys or tokens), keyed by the security scheme name they correspond to.
*   **globalAuth**: An optional `AuthConfig` to use as a fallback if no specific operation-level security scheme can be resolved.

### Related Types
The function utilizes the `AuthConfig` type for its return value and fallback:
```typescript
export type AuthConfig =
  | { type: 'apiKey'; in: 'header' | 'query'; name: string; value: string }
```

## Examples

### Resolving Operation-Specific Auth
In this example, the function matches the required "ApiKeyAuth" scheme against the provided credentials.

```typescript
const allSchemes = {
  ApiKeyAuth: {
    type: 'apiKey',
    name: 'X-API-Key',
    in: 'header'
  }
};

const credentials = {
  ApiKeyAuth: 'secret-token-123'
};

const required = ['ApiKeyAuth'];

const auth = resolveAuth(required, allSchemes, credentials);
/*
Result:
{
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
  value: 'secret-token-123'
}
*/
```

### Falling Back to Global Auth
If the operation does not specify required schemes or the provided credentials do not match the requirements, the global configuration is used.

```typescript
const globalAuth = {
  type: 'apiKey',
  in: 'header',
  name: 'Authorization',
  value: 'Bearer default-token'
};

const auth = resolveAuth(
  undefined, 
  {}, 
  {}, 
  globalAuth
);
// Returns the globalAuth object
```