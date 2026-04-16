---
title: parseRetryAfterHeader
entity_type: api
summary: Utility for parsing standard HTTP Retry-After headers into millisecond delays.
export_name: parseRetryAfterHeader
source_file: src/errors.ts
category: function
stub: false
compiled_at: 2026-04-16T14:18:04.839Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/errors.ts
confidence: 1
---

## Overview
`parseRetryAfterHeader` is a utility function designed to extract and normalize retry timing information from standard HTTP response headers. It is primarily utilized by model adapters and error handling logic to determine the appropriate wait duration before retrying a failed request, specifically when encountering rate limits or server overloads.

The function handles the two standard formats defined for the `Retry-After` header:
1.  **Delay-seconds**: A non-negative decimal integer indicating the seconds to wait.
2.  **HTTP-date**: A specific date and time after which to retry.

## Signature / Constructor

```typescript
export function parseRetryAfterHeader(headers?: Headers): number | undefined
```

### Parameters
*   `headers`: An optional `Headers` object (standard Web API) from an HTTP response.

### Return Value
*   Returns a `number` representing the delay in **milliseconds**.
*   Returns `undefined` if the `Retry-After` header is missing, null, or contains an invalid format.

## Examples

### Parsing Delay Seconds
When a provider returns a simple integer representing seconds, the function converts it to milliseconds.

```typescript
import { parseRetryAfterHeader } from 'yaaf';

const responseHeaders = new Headers({
  'Retry-After': '30'
});

const delay = parseRetryAfterHeader(responseHeaders);
console.log(delay); // 30000
```

### Parsing HTTP Dates
When a provider returns a full UTC timestamp, the function calculates the difference between that timestamp and the current system time.

```typescript
import { parseRetryAfterHeader } from 'yaaf';

// Set a date 1 minute in the future
const retryDate = new Date(Date.now() + 60000).toUTCString();
const responseHeaders = new Headers({
  'Retry-After': retryDate
});

const delay = parseRetryAfterHeader(responseHeaders);
// delay will be approximately 60000 (depending on processing time)
```

### Usage in Error Handling
This utility is often used in conjunction with error classification to populate error metadata.

```typescript
import { parseRetryAfterHeader, RateLimitError } from 'yaaf';

function handleResponse(response: Response) {
  if (response.status === 429) {
    const retryAfterMs = parseRetryAfterHeader(response.headers);
    throw new RateLimitError('Rate limit exceeded', { retryAfterMs });
  }
}
```