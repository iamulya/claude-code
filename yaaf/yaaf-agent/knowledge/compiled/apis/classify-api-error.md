---
export_name: classifyAPIError
source_file: src/errors.ts
category: function
summary: Classifies raw HTTP responses into appropriate YAAF error types.
title: classifyAPIError
entity_type: api
search_terms:
 - HTTP error handling
 - convert fetch error to YAAF error
 - API response classification
 - model adapter error conversion
 - status code to error type
 - rate limit error detection
 - authentication error handling
 - server overload error
 - provider-specific errors
 - parse API error response
 - YAAFError hierarchy
 - typed errors from HTTP
stub: false
compiled_at: 2026-04-24T16:55:10.971Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `classifyAPIError` function is a utility used to translate raw HTTP response details into structured, typed errors that are part of the YAAF error hierarchy [Source 1]. Its primary purpose is to provide a consistent error handling mechanism within model adapters.

[when](./when.md) an [LLM](../concepts/llm.md) provider's API returns an error (e.g., a 429 Too Many Requests, 401 Unauthorized, or 503 Service Unavailable), this function inspects the HTTP status code, response body, and headers to create and return an appropriate subclass of `YAAFError`, such as `RateLimitError` or `AuthError`. This allows consumers of the model adapter to catch specific, meaningful error types instead of dealing with raw HTTP error objects, simplifying [Retry Logic](../concepts/retry-logic.md) and diagnostics across different providers [Source 1].

## Signature

```typescript
export function classifyAPIError(
  status: number,
  body: string,
  provider?: string,
  headers?: Headers,
): YAAFError;
```

### Parameters

| Parameter  | Type      | Description                                                                                             |
| :--------- | :-------- | :------------------------------------------------------------------------------------------------------ |
| `status`   | `number`  | The HTTP status code from the API response (e.g., `429`, `500`).                                        |
| `body`     | `string`  | The raw string content of the HTTP response body, which may contain additional error details.           |
| `provider` | `string`  | (Optional) A string identifier for the API provider (e.g., 'openai', 'anthropic') for better diagnostics. |
| `headers`  | `Headers` | (Optional) The `Headers` object from the response, used to parse metadata like the `Retry-After` header. |

### Returns

An instance of a `YAAFError` subclass that corresponds to the classified error condition.

## Examples

The most common use case for `classifyAPIError` is within a model adapter that makes HTTP requests to an LLM provider. It is used in the `catch` block to convert a generic network error into a specific YAAF error.

```typescript
// Inside a hypothetical model adapter's `complete` method

import { classifyAPIError, YAAFError, RateLimitError } from 'yaaf';

async function callMyLLMProvider(prompt: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('https://api.example-provider.com/v1/complete', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      // If the response indicates an error, throw it to be caught below
      throw response;
    }

    const data = await response.json();
    return data.completion;

  } catch (error) {
    // If the error is a Response object from a failed HTTP call
    if (error instanceof Response) {
      const body = await error.text();
      // Classify the raw response into a specific YAAFError
      const classifiedError = classifyAPIError(
        error.status,
        body,
        'example-provider',
        error.headers
      );
      // Throw the structured error for upstream consumers
      throw classifiedError;
    }
    // Re-throw other unexpected errors
    throw error;
  }
}

// --- Consumer of the model adapter ---

try {
  await callMyLLMProvider("Tell me a joke.");
} catch (err) {
  if (err instanceof RateLimitError) {
    console.error(`Rate limited. Please retry after ${err.retryAfterMs}ms.`);
  } else if (err instanceof YAAFError) {
    console.error(`A YAAF error occurred: ${err.code} - ${err.message}`);
  } else {
    console.error("An unknown error occurred:", err);
  }
}
```

## See Also

- `YAAFError`: The base class for all custom errors within the YAAF framework.
- `parseRetryAfterHeader`: A related utility function for parsing the `Retry-After` HTTP header.

## Sources

[Source 1]: src/errors.ts