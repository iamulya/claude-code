---
title: YAAFError
entity_type: api
summary: The base class for all errors thrown by the YAAF framework, ensuring consistent error reporting and retry logic.
export_name: YAAFError
source_file: src/errors.ts
category: class
stub: false
compiled_at: 2026-04-16T14:17:56.134Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/errors.ts
confidence: 1
---

## Overview
`YAAFError` is the foundational class for the YAAF error hierarchy. It provides a structured, typed approach to error handling across all framework subsystems. By extending the native `Error` class, it allows for unified catch blocks while providing additional metadata necessary for production-grade agent operations, such as machine-readable error codes and retry logic indicators.

Design principles for `YAAFError` include:
- **Unified Catching**: All framework-specific errors extend this class.
- **Machine-Readable**: Every error carries a specific `code` for programmatic handling.
- **Retry Logic**: A `retryable` flag informs automated retry mechanisms whether an operation should be attempted again.
- **Provider Diagnostics**: An optional `provider` field helps identify which external service (e.g., OpenAI, Anthropic) originated the error in multi-provider environments.

## Signature / Constructor
```typescript
export class YAAFError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly provider?: string;

  constructor(message: string, options: {
    code: ErrorCode;
    retryable: boolean;
    provider?: string;
    cause?: Error;
  });
}
```

### ErrorCode Type
The `code` property is constrained to the `ErrorCode` union type:
- `RATE_LIMIT`: The provider has throttled the request.
- `OVERLOADED`: The provider or system is currently under too much load.
- `AUTH_ERROR`: Authentication or API key issues.
- `API_ERROR`: General error returned by a provider API.
- `API_CONNECTION_ERROR`: Network-level connectivity issues.
- `CONTEXT_OVERFLOW`: The input or conversation exceeds the model's context window.
- `TOOL_EXECUTION_ERROR`: An error occurred while running a tool.
- `SANDBOX_VIOLATION`: A security or boundary violation within a tool sandbox.
- `PERMISSION_DENIED`: Insufficient permissions for the requested operation.
- `ABORT`: The operation was manually aborted.
- `RETRY_EXHAUSTED`: All retry attempts have failed.
- `COMPACTION_ERROR`: Failure during memory or context compaction.
- `UNKNOWN`: An unspecified or unclassified error.

## Methods & Properties
- `code`: (Property) A machine-readable string from the `ErrorCode` union.
- `retryable`: (Property) A boolean indicating if the framework's retry logic should attempt the operation again.
- `provider`: (Property) Optional string identifying the external service provider associated with the error.
- `message`: (Property) Inherited human-readable description of the error.

## Examples
### Basic Error Handling
This example demonstrates how to catch `YAAFError` and use its properties to inform application logic.

```typescript
try {
  await model.complete(params);
} catch (err) {
  if (err instanceof YAAFError) {
    console.log(`${err.code}: ${err.message} [retryable=${err.retryable}]`);
    
    if (err.code === 'RATE_LIMIT') {
      // Handle specific rate limiting logic
    }
  }
}
```

### Handling Subclasses
Specific errors like `RateLimitError` (which extends `YAAFError`) may provide additional domain-specific fields.

```typescript
try {
  await model.complete(params);
} catch (err) {
  if (err instanceof RateLimitError) {
    // Access subclass-specific properties
    console.log(`Retry after ${err.retryAfterMs}ms`);
  } else if (err instanceof YAAFError) {
    // Fallback for other YAAF-specific errors
    console.error(`YAAF Error [${err.code}]: ${err.message}`);
  }
}
```

## See Also
- `classifyAPIError`: A utility function used to convert raw HTTP responses into typed `YAAFError` instances.
- `parseRetryAfterHeader`: A utility for extracting retry timing information from provider headers.