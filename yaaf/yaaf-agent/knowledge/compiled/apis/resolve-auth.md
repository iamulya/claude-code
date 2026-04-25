---
title: resolveAuth
entity_type: api
summary: Resolves the appropriate authentication configuration for an operation based on required security schemes, available credentials, and global fallback.
export_name: resolveAuth
source_file: src/tools/openapi/auth.ts
category: function
search_terms:
 - OpenAPI authentication
 - how to authenticate OpenAPI calls
 - security scheme resolution
 - agent tool authentication
 - find correct API key
 - credential management for tools
 - global auth fallback
 - dynamic auth config
 - select security scheme
 - user-provided credentials
 - operation-specific auth
 - yaaf openapi auth
stub: false
compiled_at: 2026-04-24T17:32:35.370Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/auth.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `resolveAuth` function is a utility within the YAAF OpenAPI tool subsystem responsible for determining the correct authentication method for a given API operation [Source 1]. It orchestrates the selection of credentials by cross-referencing the operation's security requirements with user-provided credentials and a potential global fallback.

This function is used internally by OpenAPI-based [Tools](../subsystems/tools.md) to dynamically apply authentication before making an HTTP request. Its logic is as follows:

1.  It iterates through the list of security scheme names required by the specific API operation.
2.  For each required scheme, it checks if a corresponding credential exists in the `credentials` map provided by the user.
3.  The first scheme that has a matching credential is selected. The function then uses the scheme's definition and the credential value to construct an `AuthConfig` object.
4.  If no match is found after checking all required schemes, it returns the `globalAuth` configuration, if one was provided.
5.  If no specific credential matches and no global fallback is available, it returns `undefined`.

This mechanism allows agents to interact with APIs that have multiple authentication methods, selecting the one for which the user has supplied credentials.

## Signature

```typescript
export function resolveAuth(
  requiredSchemes: string[] | undefined,
  allSchemes: Record<string, SecurityScheme>,
  credentials: Record<string, string>,
  globalAuth?: AuthConfig,
): AuthConfig | undefined;
```

### Parameters

| Name              | Type                                     | Description                                                                                             |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `requiredSchemes` | `string[] \| undefined`                  | An array of security scheme names required by the API operation. `undefined` if no auth is required.      |
| `allSchemes`      | `Record<string, SecurityScheme>`         | A map of all security schemes available in the OpenAPI specification, keyed by their names.             |
| `credentials`     | `Record<string, string>`                 | A map of user-provided credentials, keyed by the name of the security scheme they apply to.             |
| `globalAuth`      | `AuthConfig \| undefined`                | (Optional) A global `AuthConfig` object to use as a fallback if no specific credential can be resolved. |

### Returns

`AuthConfig | undefined`

The function returns a resolved `AuthConfig` object if a suitable credential is found or a global fallback is available. It returns `undefined` if no authentication method can be determined.

## Examples

### Example 1: Resolving a Specific Credential

This example shows `resolveAuth` successfully finding a matching credential for one of the operation's required security schemes.

```typescript
import { resolveAuth } from 'yaaf';
import type { SecurityScheme, AuthConfig } from 'yaaf';

// All schemes defined in the OpenAPI spec
const allSchemes: Record<string, SecurityScheme> = {
  ApiKeyAuth: { type: 'apiKey', name: 'X-API-KEY', in: 'header' },
  BearerAuth: { type: 'http', scheme: 'bearer' },
};

// Security schemes required for a specific API operation
const requiredSchemes = ['BearerAuth', 'ApiKeyAuth'];

// User-provided credentials
const credentials = {
  ApiKeyAuth: 'my-secret-api-key-12345',
};

// Resolve the authentication
const authConfig = resolveAuth(requiredSchemes, allSchemes, credentials);

console.log(authConfig);
// Expected output:
// {
//   type: 'apiKey',
//   in: 'header',
//   name: 'X-API-KEY',
//   value: 'my-secret-api-key-12345'
// }
```

### Example 2: Using the Global Fallback

[when](./when.md) no specific credential matches the required schemes, `resolveAuth` will use the provided `globalAuth` configuration.

```typescript
import { resolveAuth } from 'yaaf';
import type { SecurityScheme, AuthConfig } from 'yaaf';

const allSchemes: Record<string, SecurityScheme> = {
  ApiKeyAuth: { type: 'apiKey', name: 'X-API-KEY', in: 'header' },
};

const requiredSchemes = ['ApiKeyAuth'];

// User has not provided a credential for 'ApiKeyAuth'
const credentials = {
  SomeOtherAuth: 'some-other-value',
};

// A global auth config is provided as a fallback
const globalAuth: AuthConfig = {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-KEY',
  value: 'global-fallback-key',
};

const authConfig = resolveAuth(requiredSchemes, allSchemes, credentials, globalAuth);

console.log(authConfig);
// Expected output:
// {
//   type: 'apiKey',
//   in: 'header',
//   name: 'X-API-KEY',
//   value: 'global-fallback-key'
// }
```

### Example 3: No Resolution

If no matching credential is found and no global fallback is provided, the function returns `undefined`.

```typescript
import { resolveAuth } from 'yaaf';
import type { SecurityScheme } from 'yaaf';

const allSchemes: Record<string, SecurityScheme> = {
  ApiKeyAuth: { type: 'apiKey', name: 'X-API-KEY', in: 'header' },
};

const requiredSchemes = ['ApiKeyAuth'];
const credentials = {}; // No relevant credentials

const authConfig = resolveAuth(requiredSchemes, allSchemes, credentials);

console.log(authConfig);
// Expected output: undefined
```

## See Also

*   `applyAuth`: A function that applies a resolved `AuthConfig` to request headers and query parameters.
*   `schemeToAuthConfig`: A utility function used internally by `resolveAuth` to convert an OpenAPI `SecurityScheme` and a credential into an `AuthConfig` object.

## Sources

[Source 1]: src/tools/openapi/auth.ts