---
title: applyAuth
entity_type: api
summary: Applies the specified authentication configuration to a request's headers and query parameters.
export_name: applyAuth
source_file: src/tools/openapi/auth.ts
category: function
search_terms:
 - add auth to request
 - set API key header
 - OpenAPI authentication
 - HTTP request authorization
 - modify request headers
 - add query parameter for auth
 - how to authenticate API calls
 - apply AuthConfig
 - tool authentication
 - agent API credentials
 - inject credentials into request
 - programmatically set auth headers
stub: false
compiled_at: 2026-04-24T16:48:29.522Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/auth.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `applyAuth` function is a utility for modifying HTTP request headers and query parameters to include authentication credentials [Source 1]. It takes a mutable `headers` object, a mutable `query` object, and an `AuthConfig` object. Based on the configuration in `AuthConfig`, it adds the appropriate authentication information (such as an API key) to either the headers or the query parameters [Source 1].

This function is a key component in the OpenAPI tool subsystem, used to prepare outgoing API requests with the necessary credentials before they are sent. It operates by mutating the objects passed to it, so it does not have a return value [Source 1].

## Signature

The function signature is as follows [Source 1]:

```typescript
export function applyAuth(
  headers: Record<string, string>,
  query: Record<string, string>,
  auth: AuthConfig,
): void;
```

### Parameters

-   **`headers`**: `Record<string, string>`
    A mutable object representing the HTTP headers of the request. The function will add a new header if the authentication type is `apiKey` in a header.
-   **`query`**: `Record<string, string>`
    A mutable object representing the URL query parameters of the request. The function will add a new query parameter if the authentication type is `apiKey` in the query.
-   **`auth`**: `AuthConfig`
    The authentication configuration object that specifies the type of authentication and the credentials to apply. The supported `AuthConfig` type is [Source 1]:
    ```typescript
    type AuthConfig =
      | { type: "apiKey"; in: "header" | "query"; name: string; value: string };
    ```

### Returns

-   **`void`**
    This function does not return a value. It modifies the `headers` and `query` objects in place.

## Examples

### Applying an API Key to a Header

This example demonstrates how to use `applyAuth` to add an API key to the request headers.

```typescript
import { applyAuth, AuthConfig } from 'yaaf';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};
const query: Record<string, string> = {};

const authConfig: AuthConfig = {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
  value: 'my-secret-api-key',
};

applyAuth(headers, query, authConfig);

console.log(headers);
// Output:
// {
//   'Content-Type': 'application/json',
//   'X-API-Key': 'my-secret-api-key'
// }

console.log(query);
// Output: {}
```

### Applying an API Key to Query Parameters

This example shows how to add an API key as a URL query parameter.

```typescript
import { applyAuth, AuthConfig } from 'yaaf';

const headers: Record<string, string> = {};
const query: Record<string, string> = {
  search: 'example',
};

const authConfig: AuthConfig = {
  type: 'apiKey',
  in: 'query',
  name: 'api_key',
  value: 'another-secret-key',
};

applyAuth(headers, query, authConfig);

console.log(headers);
// Output: {}

console.log(query);
// Output:
// {
//   search: 'example',
//   api_key: 'another-secret-key'
// }
```

## See Also

-   `AuthConfig` type: The configuration object that defines the authentication method.
-   `resolveAuth` function: A related utility for determining the correct `AuthConfig` from a set of credentials and OpenAPI security schemes.
-   `schemeToAuthConfig` function: A helper to convert an OpenAPI security scheme object into an `AuthConfig` object.

## Sources

[Source 1]: src/[Tools](../subsystems/tools.md)/openapi/auth.ts