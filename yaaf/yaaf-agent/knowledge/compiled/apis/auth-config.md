---
export_name: AuthConfig
source_file: src/tools/openapi/auth.ts
category: type
title: AuthConfig
entity_type: api
summary: Defines authentication configuration for OpenAPI tool requests, supporting API keys in headers or query parameters.
stub: false
compiled_at: 2026-04-16T14:38:13.478Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/auth.ts
confidence: 1
---

## Overview
`AuthConfig` defines the structure for authentication credentials used when interacting with OpenAPI-based tools. It is used to map security schemes from an OpenAPI specification to concrete values that can be applied to HTTP requests.

The framework provides several utility functions to work with this type:
- `applyAuth`: Modifies request headers and query parameters based on an `AuthConfig`.
- `schemeToAuthConfig`: Converts an OpenAPI security scheme and a raw credential into an `AuthConfig`.
- `resolveAuth`: Selects and builds the appropriate `AuthConfig` from a set of available credentials and required security schemes.

Note: While the source documentation mentions support for bearer tokens, basic auth, and custom headers, the current type definition explicitly defines the `apiKey` structure.

## Signature / Constructor
```typescript
export type AuthConfig =
  | { type: 'apiKey'; in: 'header' | 'query'; name: string; value: string };
```

## Methods & Properties
### apiKey Properties
- `type`: The authentication strategy identifier, set to `'apiKey'`.
- `in`: Specifies the transport mechanism for the credential, either `'header'` or `'query'`.
- `name`: The identifier for the credential (e.g., the header name or query parameter key).