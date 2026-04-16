---
title: classifyAPIError
entity_type: api
summary: Utility function to convert raw HTTP responses into typed YAAF errors based on status codes and response bodies.
export_name: classifyAPIError
source_file: src/errors.ts
category: function
stub: false
compiled_at: 2026-04-16T14:18:01.053Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/errors.ts
confidence: 1
---

## Overview
`classifyAPIError` is a utility function used primarily by model adapters and provider implementations within the YAAF framework. Its purpose is to normalize disparate HTTP error responses from various LLM providers into a unified, typed error hierarchy. 

By analyzing the HTTP status code, response body, and headers, the function returns a specific subclass of `YAAFError`. This normalization allows the framework and end-users to implement consistent error handling logic (such as retry strategies for rate limits) regardless of which underlying provider is being used.

## Signature / Constructor

```typescript
export function classifyAPIError(
  status: number,
  body: string,
  provider?: string,
  headers?: Headers,
): YAAFError
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `status` | `number` | The HTTP status code returned by the remote API. |
| `body` | `string` | The raw string body of the response, typically containing provider-specific error messages in JSON format. |
| `provider` | `string` | (Optional) An identifier for the provider (e.g., 'openai', 'anthropic') used for diagnostic metadata. |
| `headers` | `Headers` | (Optional) The HTTP response headers, used to extract additional context such as `Retry-After` values. |

### Return Value
The function returns an instance of `YAAFError` (or one of its specialized subclasses). The returned error object includes a machine-readable `ErrorCode`, a `retryable` boolean flag, and any provider-specific diagnostics.

## Examples

### Basic Usage in a Model Adapter
This example demonstrates how a provider implementation might use the utility when a request fails.

```typescript
const response = await fetch("https://api.provider.com/v1/chat", {
  method: "POST",
  // ... configuration
});

if (!response.ok) {
  const errorBody = await response.text();
  
  // Convert the raw HTTP error into a typed YAAF error
  throw classifyAPIError(
    response.status,
    errorBody,
    'my-provider',
    response.headers
  );
}
```

### Handling the Classified Error
Once classified, the error can be handled based on its type or properties.

```typescript
try {
  await model.generate(prompt);
} catch (err) {
  if (err.code === 'RATE_LIMIT') {
    // classifyAPIError will have parsed headers to determine if it's retryable
    console.error(`Rate limited. Retryable: ${err.retryable}`);
  }
}
```

## See Also
- `YAAFError`
- `ErrorCode`
- `parseRetryAfterHeader`