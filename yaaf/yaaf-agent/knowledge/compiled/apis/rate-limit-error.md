---
summary: A specific YAAF error indicating that a rate limit has been exceeded, often including a `retryAfterMs` property.
export_name: RateLimitError
source_file: src/errors.ts
category: class
title: RateLimitError
entity_type: api
search_terms:
 - "429 too many requests"
 - API rate limiting
 - how to handle rate limit errors
 - retry after delay
 - YAAF error handling
 - provider API limits
 - backoff strategy
 - retryable errors
 - HTTP 429 error
 - exponential backoff
 - LLM API throttling
 - throttling error
stub: false
compiled_at: 2026-04-25T00:11:37.012Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`RateLimitError` is a specialized error class that extends the base `YAAFError`. It is thrown when an operation, typically a request to an external LLM provider, fails because a rate limit has been exceeded [Source 1].

This error is crucial for implementing robust [Retry Logic](../concepts/retry-logic.md). It signals that the failed operation was not due to a permanent failure but a temporary condition. The error often includes a `retryAfterMs` property, which provides a specific delay recommended by the service provider before the next attempt should be made [Source 1].

LLM adapters within YAAF typically use the [classifyAPIError](./classify-api-error.md) utility to convert HTTP 429 "Too Many Requests" responses into a `RateLimitError` instance [Source 1].

## Signature / Constructor

`RateLimitError` extends the base `YAAFError` and adds properties specific to rate-limiting scenarios.

```typescript
export class RateLimitError extends YAAFError {
  public readonly code: 'RATE_LIMIT';
  public readonly retryable: true;
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    options?: {
      provider?: string;
      retryAfterMs?: number;
    }
  );
}
```

## Methods & Properties

Instances of `RateLimitError` have the following properties:

| Property       | Type                  | Description                                                                                                                                                           |
| -------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | `string`              | The error name. Always `'RateLimitError'`.                                                                                                                            |
| `message`      | `string`              | A human-readable description of the error.                                                                                                                            |
| `code`         | `'RATE_LIMIT'`        | A machine-readable error code identifying the error type [Source 1].                                                                                                  |
| `retryable`    | `true`                | A boolean flag indicating that the operation can be retried. For `RateLimitError`, this is always `true` [Source 1].                                                    |
| `provider`     | `string \| undefined` | The name of the service provider (e.g., 'openai', 'anthropic') that enforced the rate limit [Source 1].                                                                 |
| `retryAfterMs` | `number \| undefined` | The recommended delay in milliseconds before retrying the operation. This value is often derived from the [Retry-After Header](../concepts/retry-after-header.md) of an HTTP response [Source 1]. |

## Examples

The most common use case for `RateLimitError` is to catch it and schedule a retry after the specified delay.

```typescript
import { RateLimitError, YAAFError } from 'yaaf';
import { model } from './my-llm-provider';

async function makeApiCall() {
  try {
    const response = await model.complete({ prompt: "Tell me a story." });
    console.log("Success:", response);
  } catch (err) {
    if (err instanceof RateLimitError) {
      const delay = err.retryAfterMs || 5000; // Default to 5s if not provided
      console.error(
        `Rate limit exceeded for provider '${err.provider}'. Retrying after ${delay}ms...`
      );
      
      // Use setTimeout to wait for the recommended delay before retrying
      setTimeout(makeApiCall, delay);

    } else if (err instanceof YAAFError) {
      console.error(`A YAAF error occurred: ${err.code} - ${err.message}`);
      // Handle other non-retryable YAAF errors
    } else {
      console.error('An unexpected error occurred:', err);
    }
  }
}

makeApiCall();
```
This example demonstrates how to specifically handle a `RateLimitError`, extract the `retryAfterMs` value, and implement a simple retry mechanism using `setTimeout` [Source 1].

## See Also

*   [classifyAPIError](./classify-api-error.md): The utility function often used to create `RateLimitError` instances from HTTP responses.
*   [computeRetryDelay](./compute-retry-delay.md): A helper for implementing more advanced backoff strategies.
*   [Retry Logic](../concepts/retry-logic.md): A guide on patterns for handling retryable errors like this one.
*   [Retry-After Header](../concepts/retry-after-header.md): The concept behind the `retryAfterMs` property.

## Sources

[Source 1]: src/errors.ts