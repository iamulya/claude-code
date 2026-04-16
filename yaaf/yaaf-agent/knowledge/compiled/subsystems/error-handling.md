---
title: Error Handling
entity_type: subsystem
summary: Unified error management system providing structured, typed errors across all YAAF subsystems.
primary_files:
  - src/errors.ts
exports:
  - YAAFError
  - ErrorCode
  - classifyAPIError
  - parseRetryAfterHeader
stub: false
compiled_at: 2026-04-16T14:17:52.144Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/errors.ts
confidence: 0.95
---

## Purpose
The Error Handling subsystem provides a unified, structured, and typed hierarchy for managing failures across the YAAF framework. It ensures that errors originating from disparate sources—such as LLM providers, tool execution environments, or internal state management—are normalized into a consistent format. This allows developers to implement robust retry logic, diagnostic logging, and graceful degradation.

## Architecture
The subsystem is built around a centralized error hierarchy designed for machine readability and developer ergonomics.

### The YAAFError Base Class
All framework-specific errors extend the `YAAFError` class. This common inheritance allows for a single `catch` block to handle any framework-related failure. Every `YAAFError` instance carries:
- **code**: A machine-readable `ErrorCode` string.
- **retryable**: A boolean flag indicating if the operation can be safely retried.
- **provider**: An optional string identifying the external service (e.g., OpenAI, Anthropic) that triggered the error.

### Error Classification
The subsystem defines a specific set of error codes via the `ErrorCode` type to categorize failures:
- **Infrastructure**: `API_CONNECTION_ERROR`, `API_ERROR`, `ABORT`.
- **Limits & Permissions**: `RATE_LIMIT`, `OVERLOADED`, `AUTH_ERROR`, `PERMISSION_DENIED`.
- **Execution**: `TOOL_EXECUTION_ERROR`, `SANDBOX_VIOLATION`, `CONTEXT_OVERFLOW`.
- **Internal**: `RETRY_EXHAUSTED`, `COMPACTION_ERROR`, `UNKNOWN`.

## Integration Points
The Error Handling subsystem is utilized by several other framework components:
- **Model Adapters**: Use classification utilities to map raw HTTP responses to typed errors.
- **Retry Logic**: Inspects the `retryable` flag and `retryAfterMs` properties to determine backoff strategies.
- **Tool Host**: Wraps external code execution failures in `TOOL_EXECUTION_ERROR` or `SANDBOX_VIOLATION`.

## Key APIs

### YAAFError
The base class for all errors within the framework. Subclasses (such as `RateLimitError`) may add domain-specific fields like `retryAfterMs`.

```typescript
try {
  await model.complete(params);
} catch (err) {
  if (err instanceof YAAFError) {
    console.log(`${err.code}: ${err.message} [retryable=${err.retryable}]`);
  }
}
```

### classifyAPIError()
A utility function used primarily by model adapters to convert raw HTTP response data (status codes, body content, and headers) into the appropriate `YAAFError` subclass.

### parseRetryAfterHeader()
A helper function that parses the standard `Retry-After` HTTP header. It supports both delay-seconds and HTTP-date formats, returning the delay in milliseconds.

## Extension Points
Developers can extend the error system by:
1. **Creating Subclasses**: Extending `YAAFError` to define new error types for custom plugins or tools.
2. **Custom Classification**: Implementing custom logic around `classifyAPIError` to handle proprietary error formats from niche LLM providers.