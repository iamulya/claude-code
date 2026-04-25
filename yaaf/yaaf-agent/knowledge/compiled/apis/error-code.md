---
export_name: ErrorCode
source_file: src/errors.ts
category: type
summary: A union type defining machine-readable error codes for YAAF errors.
title: ErrorCode
entity_type: api
search_terms:
 - YAAF error codes
 - machine-readable errors
 - error handling types
 - list of error codes
 - RATE_LIMIT error
 - CONTEXT_OVERFLOW error
 - TOOL_EXECUTION_ERROR
 - API_ERROR codes
 - agent error classification
 - typed errors in YAAF
 - what are the possible error codes
 - YAAFError code property
stub: false
compiled_at: 2026-04-24T17:04:44.016Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ErrorCode` is a string literal union type that defines a set of standardized, machine-readable identifiers for all errors originating from the YAAF framework [Source 1].

Every instance of a `YAAFError` or its subclasses contains a `code` property of type `ErrorCode`. This allows developers to build robust error handling logic, such as `switch` statements or `if/else` chains, that can reliably identify specific error conditions without resorting to fragile string matching on error messages [Source 1].

The use of `ErrorCode` is a core part of YAAF's structured error handling philosophy, ensuring that errors are typed, classifiable, and easy to handle programmatically [Source 1].

## Signature

The `ErrorCode` type is defined as a union of the following string literals [Source 1]:

```typescript
export type ErrorCode =
  | "RATE_LIMIT"
  | "OVERLOADED"
  | "AUTH_ERROR"
  | "API_ERROR"
  | "API_CONNECTION_ERROR"
  | "CONTEXT_OVERFLOW"
  | "TOOL_EXECUTION_ERROR"
  | "SANDBOX_VIOLATION"
  | "PERMISSION_DENIED"
  | "ABORT"
  | "RETRY_EXHAUSTED"
  | "MAX_ITERATIONS"
  | "COMPACTION_ERROR"
  | "UNKNOWN";
```

## Examples

### Handling Specific Error Codes

The following example demonstrates how to catch a `YAAFError` and use its `code` property to implement specific handling logic for different error types [Source 1].

```typescript
import { YAAFError, ErrorCode } from 'yaaf';

async function someAgentTask() {
  // ... some operation that might throw a YAAFError
}

try {
  await someAgentTask();
} catch (error) {
  if (error instanceof YAAFError) {
    switch (error.code) {
      case 'RATE_LIMIT':
        console.error('Rate limit exceeded. Please wait and try again.');
        // Additional logic, e.g., schedule a retry
        break;
      case 'CONTEXT_OVERFLOW':
        console.error('The context window is full. Please shorten your input.');
        break;
      case 'TOOL_EXECUTION_ERROR':
        console.error('A tool failed to execute:', error.message);
        break;
      default:
        console.error(`An unexpected YAAF error occurred: ${error.code} - ${error.message}`);
        break;
    }
  } else {
    // Handle non-YAAF errors
    console.error('An unknown error occurred:', error);
  }
}
```

## See Also

- `YAAFError`: The base class for all errors in the YAAF framework, which carries the `ErrorCode`.
- `classifyAPIError`: A utility function that converts raw HTTP errors into structured `YAAFError` instances with the appropriate `ErrorCode`.

## Sources

[Source 1] `src/errors.ts`