---
export_name: parseRetryAfterHeader
source_file: src/errors.ts
category: function
summary: Parses the `Retry-After` HTTP header into milliseconds for retry logic.
title: parseRetryAfterHeader
entity_type: api
search_terms:
 - handle Retry-After header
 - HTTP 429 backoff
 - rate limit delay
 - calculate retry delay
 - HTTP-date parsing
 - delay-seconds parsing
 - how to implement retry logic
 - YAAF error handling
 - get milliseconds from header
 - "429 Too Many Requests"
 - "503 Service Unavailable"
 - backoff strategy
stub: false
compiled_at: 2026-04-24T17:26:34.471Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `parseRetryAfterHeader` function is a utility for parsing the standard `Retry-After` HTTP response header. This header is typically sent with `429 Too Many Requests` or `503 Service Unavailable` status codes to indicate how long a client should wait before making another request.

This function supports both formats specified by the standard [Source 1]:
1.  **Delay-seconds**: An integer number of seconds to wait.
2.  **HTTP-date**: A specific timestamp after which the client may retry.

It converts the value from either format into a single, consistent unit—milliseconds—making it easy to use with `setTimeout` or other delay mechanisms in [Retry Logic](../concepts/retry-logic.md). If the header is not present or cannot be parsed, the function returns `undefined`.

## Signature

```typescript
export function parseRetryAfterHeader(headers?: Headers): number | undefined;
```

**Parameters:**

*   `headers?: Headers`: An optional `Headers` object, typically from a `fetch` response. If not provided, the function returns `undefined`.

**Returns:**

*   `number | undefined`: The calculated delay in milliseconds, or `undefined` if the `Retry-After` header is missing or invalid.

## Examples

### Parsing a delay-seconds value

This example demonstrates parsing a `Retry-After` header that specifies a delay in seconds.

```typescript
import { parseRetryAfterHeader } from 'yaaf';

// Simulate response headers with a 120-second delay
const headers = new Headers();
headers.set('Retry-After', '120');

const delayInMs = parseRetryAfterHeader(headers);

console.log(delayInMs);
// Expected output: 120000
```

### Parsing an HTTP-date value

This example shows how the function handles a `Retry-After` header containing a specific date and time. The function calculates the difference between the specified time and the current time.

```typescript
import { parseRetryAfterHeader } from 'yaaf';

// Create a date 60 seconds in the future
const retryDate = new Date(Date.now() + 60 * 1000);

// Simulate response headers with an HTTP-date
const headers = new Headers();
headers.set('Retry-After', retryDate.toUTCString());

const delayInMs = parseRetryAfterHeader(headers);

// The result will be slightly less than 60000 due to the time elapsed
// during execution.
console.log(delayInMs);
// Expected output: A number close to 60000
```

### Handling a missing header

If the `Retry-After` header is not present in the `Headers` object, the function returns `undefined`.

```typescript
import { parseRetryAfterHeader } from 'yaaf';

// Simulate response headers without the Retry-After header
const headers = new Headers();
headers.set('Content-Type', 'application/json');

const delayInMs = parseRetryAfterHeader(headers);

console.log(delayInMs);
// Expected output: undefined
```

## See Also

*   `classifyAPIError`: A function that uses `parseRetryAfterHeader` to help construct typed YAAF errors from raw HTTP responses.
*   `YAAFError`: The base error class in YAAF, which is often subclassed into specific errors like `RateLimitError` that might carry the `retryAfterMs` value.

## Sources

[Source 1] src/errors.ts