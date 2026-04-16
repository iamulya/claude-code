---
summary: Identifies which keys in a flattened tool input schema correspond to the original HTTP request body.
export_name: getBodyPropertyNames
source_file: src/tools/openapi/schema.ts
category: function
title: getBodyPropertyNames
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:50.846Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/schema.ts
confidence: 1
---

## Overview
`getBodyPropertyNames` is a utility function used to facilitate the execution of OpenAPI-based tools. In YAAF, OpenAPI operations are converted into a flattened JSON Schema (via `operationToToolInput`) to improve LLM performance, as models typically handle flat argument structures more reliably than nested ones.

When the agent provides arguments for a tool, `getBodyPropertyNames` is used to determine which of those arguments belong in the HTTP request body versus other locations like path or query parameters. This is essential for reconstructing the valid HTTP request from the flattened input provided by the LLM.

## Signature / Constructor

```typescript
export function getBodyPropertyNames(operation: ParsedOperation): Set<string>
```

### Parameters
*   **operation**: A `ParsedOperation` object containing the metadata and schema definitions for a specific OpenAPI endpoint.

### Returns
*   Returns a `Set<string>` containing the keys that should be extracted from the tool input and placed into the request body.

## Examples

### Identifying Body Properties
This example demonstrates how the function identifies which keys from a hypothetical tool input belong in the request body.

```typescript
import { getBodyPropertyNames } from './src/tools/openapi/schema.js';

// Assume parsedOp represents a POST /users endpoint 
// with a query param 'debug' and a body containing 'username' and 'email'
const bodyKeys = getBodyPropertyNames(parsedOp);

console.log(bodyKeys); 
// Output: Set { 'username', 'email' }

// When processing tool arguments:
const toolArgs = { username: 'alice', email: 'alice@example.com', debug: 'true' };
const requestBody = {};

for (const key of Object.keys(toolArgs)) {
  if (bodyKeys.has(key)) {
    requestBody[key] = toolArgs[key];
  }
}
```

## Sources
- `src/tools/openapi/schema.ts`