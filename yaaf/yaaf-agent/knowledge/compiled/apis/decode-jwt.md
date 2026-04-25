---
summary: A utility function to decode a JWT token and extract its payload.
export_name: decodeJwt
source_file: src/iam/utils.ts
category: function
title: decodeJwt
entity_type: api
search_terms:
 - parse JWT token
 - read JWT payload
 - get claims from JWT
 - JSON Web Token decoding
 - how to get jti from token
 - extract expiration from JWT
 - JWT utility function
 - token introspection
 - get JWT ID
 - token revocation helper
 - jwt claims
 - decode token without verification
stub: false
compiled_at: 2026-04-25T00:06:18.411Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
compiled_from_quality: unknown
confidence: 0.8
---

## Overview

The `decodeJwt` function is a utility for parsing a JSON Web Token (JWT) string and extracting its payload. It provides access to the claims embedded within the token, such as the JWT ID (`jti`) and expiration time (`exp`).

This function is particularly useful in identity and access management (IAM) flows. For example, it can be used to retrieve a token's `jti` to add it to a revocation list (blocklist) when a user logs out, ensuring the token cannot be reused even if it has not yet expired [Source 1].

## Signature

The source material demonstrates the function's usage but does not provide its formal TypeScript signature. Based on its use, the function accepts a single JWT string and returns an object containing the decoded payload.

```typescript
// Usage pattern from source
const { payload } = decodeJwt(token: string);

// `payload` is an object containing the JWT claims, e.g.:
// {
//   jti?: string;
//   exp?: number;
//   // ... other claims
// }
```

**Parameters:**

*   `token` (`string`): The JWT string to decode.

**Returns:**

*   An object with a `payload` property, which is an object containing the decoded claims from the JWT.

## Examples

### Retrieving Claims for Token Revocation

The most common use case shown in the source material is to decode a token to get its `jti` (JWT ID) and `exp` (expiration time) in order to add it to a `JtiBlocklist`. This effectively revokes the token [Source 1].

```typescript
import { InMemoryJtiBlocklist } from 'yaaf/iam';
import { decodeJwt } from 'yaaf/iam';

// Assume 'token' is a JWT string received from a client.
const token = '...'; 
const blocklist = new InMemoryJtiBlocklist();

// Decode the token to access its payload
const { payload } = decodeJwt(token);

// Use the claims to add the token to a revocation list
if (payload.jti && payload.exp) {
  // The blocklist requires expiration in milliseconds
  await blocklist.add(payload.jti, payload.exp * 1000);
}
```

## See Also

*   `JtiBlocklist`: An interface for JWT revocation lists where `decodeJwt` is commonly used.
*   `InMemoryJtiBlocklist`: An in-memory implementation of the `JtiBlocklist`.
*   `RedisJtiBlocklist`: A Redis-backed, distributed implementation of the `JtiBlocklist`.

## Sources

*   [Source 1]: `src/iam/jtiBlocklist.ts`