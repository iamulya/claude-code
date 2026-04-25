---
export_name: YAAFError
source_file: src/errors.ts
category: class
summary: The base class for all structured, typed errors in YAAF.
title: YAAFError
entity_type: api
search_terms:
 - base error class
 - custom error types
 - structured exceptions
 - how to handle YAAF errors
 - error code
 - retryable errors
 - unified error handling
 - YAAF exception hierarchy
 - diagnosing agent failures
 - provider-specific errors
 - catch all YAAF exceptions
 - typed error system
stub: false
compiled_at: 2026-04-24T17:50:20.834Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`YAAFError` is the base class for all custom errors thrown by the YAAF framework. It provides a structured and typed approach to error handling, ensuring that all framework-level exceptions can be caught and inspected in a unified way [Source 1].

The primary design principle behind `YAAFError` is to provide more context than a standard `Error` object. Every instance carries a machine-readable `code`, a boolean `retryable` flag to guide [Retry Logic](../concepts/retry-logic.md), and an optional `provider` field for diagnostics in multi-provider environments. Subclasses of `YAAFError`, such as `RateLimitError` or `ToolExecutionError`, add domain-specific fields to provide even more context [Source 1].

Developers should use `instanceof YAAFError` to create a catch-all block for framework errors, while also being able to check for more specific error subclasses [when](./when.md) needed [Source 1].

## Signature / Constructor

`YAAFError` extends the built-in JavaScript `Error` class.

```typescript
export class YAAFError extends Error {
  /** A machine-readable error identifier. */
  readonly code: ErrorCode;

  /** Indicates if the operation can be safely retried. */
  readonly retryable: boolean;

  /** The provider that originated the error, if applicable. */
  readonly provider?: string;

  // Constructor and other properties...
}
```

The `code` property is of type `ErrorCode`, which is a union of string literals representing all possible error types within YAAF [Source 1]:

```typescript
export type ErrorCode =
  | "RATE_LIMIT"
  | "OVERLOADED"
  | "AUTH_ERROR"
  | "API_ERROR"
  | "API_CONNECTION_ERROR"
  | "CONTEXT_OVERFLOW"
  | "TOOL_EXECUTION_ERROR"
  - "SANDBOX_VIOLATION"
  | "PERMISSION_DENIED"
  | "ABORT"
  | "RETRY_EXHAUSTED"
  | "MAX_ITERATIONS"
  | "COMPACTION_ERROR"
  | "UNKNOWN";
```

## Methods & Properties

### Properties

- **`code: ErrorCode`**: A machine-readable string literal that identifies the category of the error. This is useful for programmatic error handling.
- **`retryable: boolean`**: A flag indicating whether the operation that failed is idempotent and can be safely retried. This is used by [Utilities](../subsystems/utilities.md) like `withRetry` to decide whether to attempt the operation again [Source 1, Source 2].
- **`provider?: string`**: An optional string that identifies the external provider (e.g., an [LLM](../concepts/llm.md) API provider) that was the source of the error. This is valuable for debugging systems that interact with multiple providers [Source 1].
- **`message: string`**: (Inherited from `Error`) A human-readable description of the error.
- **`name: string`**: (Inherited from `Error`) The name of the error class, e.g., `"YAAFError"`.
- **`stack?: string`**: (Inherited from `Error`) A string containing the stack [Trace](../concepts/trace.md) of where the error was instantiated.

## Examples

The following example demonstrates the recommended pattern for handling YAAF errors. It shows how to catch a specific subclass for special handling (like a rate limit error) and then fall back to a general `YAAFError` catch block for all other framework errors [Source 1].

```typescript
import { YAAFError, RateLimitError } from 'yaaf'; // Note: RateLimitError is a subclass

async function callModel() {
  try {
    // some YAAF operation that might throw
    await model.complete({ prompt: "..." });
  } catch (err) {
    // Check for a specific, actionable error first
    if (err instanceof RateLimitError) {
      console.log(`Rate limit hit. Retry after ${err.retryAfterMs}ms`);
      // Implement retry logic here...
    } 
    // Fall back to the base class for any other YAAF error
    else if (err instanceof YAAFError) {
      console.error(`A YAAF error occurred: ${err.code}`);
      console.error(`Message: ${err.message}`);
      console.error(`Retryable: ${err.retryable}`);
      if (err.provider) {
        console.error(`Provider: ${err.provider}`);
      }
    } 
    // Handle any other unexpected errors
    else {
      console.error("An unknown error occurred:", err);
    }
  }
}
```

## See Also

- **`classifyAPIError`**: A utility function that converts raw HTTP responses and errors into appropriate `YAAFError` subclasses [Source 1].
- **`withRetry`**: A helper function that implements [Exponential Backoff](../concepts/exponential-backoff.md) retry logic, which relies on the `retryable` property of `YAAFError` instances [Source 2].

## Sources

- [Source 1]: `src/errors.ts`
- [Source 2]: `src/utils/retry.ts`