---
export_name: applyAuth
source_file: src/tools/openapi/auth.ts
category: function
title: applyAuth
entity_type: api
summary: Applies authentication configuration to HTTP request headers and query parameters.
stub: false
compiled_at: 2026-04-16T14:37:48.019Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/auth.ts
confidence: 1
---

## Overview
`applyAuth` is a utility function used within the YAAF OpenAPI toolset to inject authentication credentials into outgoing HTTP requests. It modifies mutable header and query parameter objects based on a provided `AuthConfig`. This function is typically used during the execution phase of an LLM tool that interacts with an external API defined by an OpenAPI specification.

## Signature / Constructor

```typescript
export function applyAuth(
  headers: Record<string, string>,
  query: Record<string, string>,
  auth: AuthConfig,
): void
```

### Parameters
*   **headers**: A mutable object representing the HTTP headers. The function modifies this object in place.
*   **query**: A mutable object representing the URL query parameters. The function modifies this object in place.
*   **auth**: An `AuthConfig` object containing the credentials and the method of application.

### Associated Types

#### AuthConfig
The configuration object defining how authentication should be applied.
```typescript
export type AuthConfig =
  | { type: 'apiKey'; in: 'header' | 'query'; name: string; value: string }
```
*Note: While the source documentation mentions support for bearer tokens, basic auth, and custom headers, the exported type definition in the provided source extract specifically defines the `apiKey` structure.*

## Examples

### Applying an API Key via Headers
This example demonstrates how to use `applyAuth` to add a security header to a request.

```typescript
import { applyAuth, AuthConfig } from './auth';

const headers: Record<string, string> = { 'Content-Type': 'application/json' };
const query: Record<string, string> = {};

const auth: AuthConfig = {
  type: 'apiKey',
  in: 'header',
  name: 'X-Service-Key',
  value: 'secret-token-123'
};

applyAuth(headers, query, auth);

// Result:
// headers: { 'Content-Type': 'application/json', 'X-Service-Key': 'secret-token-123' }
// query: {}
```

### Applying an API Key via Query Parameters
This example demonstrates injecting a credential into the URL query string.

```typescript
import { applyAuth, AuthConfig } from './auth';

const headers: Record<string, string> = {};
const query: Record<string, string> = { search: 'yaaf' };

const auth: AuthConfig = {
  type: 'apiKey',
  in: 'query',
  name: 'api_key',
  value: 'user-provided-key'
};

applyAuth(headers, query, auth);

// Result:
// headers: {}
// query: { search: 'yaaf', api_key: 'user-provided-key' }
```

## See Also
*   `schemeToAuthConfig`: A function to convert OpenAPI security schemes into `AuthConfig` objects.
*   `resolveAuth`: A function to determine which authentication configuration to use based on operation requirements and available credentials.