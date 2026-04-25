---
title: APIConnectionError
entity_type: api
summary: Represents an error that occurs when there is a problem connecting to an external API at the network level.
export_name: APIConnectionError
source_file: src/errors.ts
category: class
search_terms:
 - network error
 - API request failed
 - connection refused
 - failed to fetch
 - LLM provider connection issue
 - http request error
 - timeout error
 - DNS resolution failed
 - unreachable API endpoint
 - YAAF error types
 - handle connection errors
 - api client exceptions
stub: false
compiled_at: 2026-04-25T00:04:45.728Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`APIConnectionError` is a custom error class that indicates a failure to establish a connection with an external API endpoint, such as an LLM provider. This error is thrown for network-level issues, including DNS failures, timeouts, refused connections, or other problems that prevent the HTTP request from completing successfully [Source 1].

It is distinct from API errors where the server is reachable but returns an error status code (e.g., 4xx or 5xx responses). It is used within LLM adapters like `OpenAIChatModel` to handle transient or persistent network problems [Source 1].

## Signature / Constructor

`APIConnectionError` extends the built-in JavaScript `Error` class.

```typescript
export declare class APIConnectionError extends Error {
  constructor(message: string, options?: { cause?: unknown });
}
```

It follows the standard pattern for modern JavaScript error classes, accepting a descriptive message and an optional `options` object which can contain a `cause` for the error (e.g., the underlying `fetch` error).

## Methods & Properties

As a subclass of `Error`, `APIConnectionError` instances have the following standard properties:

-   `name`: The name of the error, which will be `'APIConnectionError'`.
-   `message`: The error message string passed to the constructor.
-   `stack`: A string containing the call stack at the point the error was thrown.
-   `cause`: The original error that caused the `APIConnectionError`, if one was provided. This is useful for inspecting the underlying network failure.

## Examples

This example demonstrates how to specifically catch an `APIConnectionError` when making a call with an LLM adapter, allowing for retry logic or specific error handling for network issues.

```typescript
import { OpenAIChatModel } from './models/openai'; // Assuming local project structure
import { APIConnectionError } from './errors';     // Assuming local project structure

const model = new OpenAIChatModel({
  apiKey: 'your-api-key',
  // Using a non-existent base URL to trigger a connection error
  baseUrl: 'http://localhost:12345/v1',
  timeoutMs: 2000, // Short timeout
});

async function makeRequest() {
  try {
    const response = await model.query('Hello, world!');
    console.log('Success:', response);
  } catch (error) {
    if (error instanceof APIConnectionError) {
      console.error(
        'Failed to connect to the API. Please check your network connection and the API endpoint URL.',
        error.message
      );
      // Implement retry logic here if desired
    } else {
      console.error('An unexpected error occurred:', error);
    }
  }
}

makeRequest();
```

## See Also

-   [classifyAPIError](./classify-api-error.md): A function to categorize different types of API-related errors.
-   [AbortError](./abort-error.md): An error thrown when an API request is intentionally aborted.
-   `OpenAIChatModel`: An LLM adapter that may throw `APIConnectionError`.

## Sources

[Source 1]: src/models/openai.ts