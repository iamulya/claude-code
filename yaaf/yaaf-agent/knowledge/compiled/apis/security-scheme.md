---
summary: Represents a security scheme defined in an OpenAPI specification.
export_name: SecurityScheme
source_file: src/tools/openapi/parser.ts
category: type
title: SecurityScheme
entity_type: api
search_terms:
 - OpenAPI authentication
 - API key security
 - bearer token auth
 - HTTP basic auth
 - OAuth2 configuration
 - OpenID Connect scheme
 - API security definition
 - how to define auth in OpenAPI
 - what is a security scheme
 - YAAF OpenAPI auth
 - apiKey in header
 - cookie authentication
stub: false
compiled_at: 2026-04-24T17:36:28.912Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/parser.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `SecurityScheme` type represents a single security scheme object as defined within an OpenAPI 3.x specification, typically found under `components.securitySchemes` [Source 2]. It is a data structure that describes how to authenticate API requests, such as using an API key, a bearer token, or other HTTP authentication methods [Source 2].

This type is part of the output of the `parseOpenAPISpec` function, which returns a `[[[[[[[[ParseResult]]]]]]]]` object containing all parsed operations and a record of all defined security schemes [Source 2]. The `OpenAPI[[[[[[[[Tools]]]]]]]]et` uses this information to correctly configure authentication for the Tools it generates [Source 1].

## Signature

`SecurityScheme` is a TypeScript type alias. Its structure varies based on the `type` property [Source 2].

```typescript
export type SecurityScheme = {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  name?: string; // for apiKey
  in?: string; // for apiKey: 'header' | 'query' | 'cookie'
  scheme?: string; // for http: 'bearer', 'basic'
};
```

### Properties

*   **`type`**: ` "apiKey" | "http" | "oauth2" | "openIdConnect" `
    The type of the security scheme. This property determines which other properties are applicable [Source 2].
*   **`name`**: ` string ` (optional)
    Used [when](./when.md) `type` is `"apiKey"`. It specifies the name of the header, query parameter, or cookie that holds the API key [Source 2].
*   **`in`**: ` string ` (optional)
    Used when `type` is `"apiKey"`. It specifies the location of the API key, which can be `'header'`, `'query'`, or `'cookie'` [Source 2].
*   **`scheme`**: ` string ` (optional)
    Used when `type` is `"http"`. It specifies the authentication scheme, such as `'bearer'` for JWTs or `'basic'` for Basic Authentication [Source 2].

## Examples

The following examples illustrate how `SecurityScheme` objects represent common authentication methods found in OpenAPI specifications.

### API Key in Header

This example shows a security scheme for an API key named `X-API-Key` passed in the request header.

```typescript
import type { SecurityScheme } from 'yaaf';

const apiKeyScheme: SecurityScheme = {
  type: 'apiKey',
  name: 'X-API-Key',
  in: 'header',
};
```

### HTTP Bearer Token

This example represents a standard OAuth 2.0 bearer token, passed in the `Authorization` header.

```typescript
import type { SecurityScheme } from 'yaaf';

const bearerAuthScheme: SecurityScheme = {
  type: 'http',
  scheme: 'bearer',
};
```

### Usage in ParseResult

The `parseOpenAPISpec` function returns a map of these schemes, keyed by the names defined in the OpenAPI document.

```typescript
import type { ParseResult, SecurityScheme } from 'yaaf';

const result: ParseResult = {
  // ... other properties like operations
  securitySchemes: {
    'ApiKeyAuth': {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
    },
    'BearerAuth': {
      type: 'http',
      scheme: 'bearer',
    }
  }
};
```

## Sources

[Source 1]: src/tools/openapi/index.ts
[Source 2]: src/tools/openapi/parser.ts