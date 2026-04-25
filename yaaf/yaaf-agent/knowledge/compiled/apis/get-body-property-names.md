---
title: getBodyPropertyNames
entity_type: api
summary: Extracts input keys corresponding to body properties for request construction.
export_name: getBodyPropertyNames
source_file: src/tools/openapi/schema.ts
category: function
search_terms:
 - OpenAPI request body
 - construct HTTP request
 - map tool input to body
 - identify body parameters
 - request body properties
 - how to build request body from tool input
 - OpenAPI tool generation
 - separating body and query params
 - ParsedOperation body keys
 - tool input to HTTP body
 - JSON schema to request body
stub: false
compiled_at: 2026-04-24T17:08:54.899Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/schema.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `getBodyPropertyNames` function is a utility within the OpenAPI tool subsystem that identifies which property names from a flattened tool input schema correspond to the HTTP request body [Source 1].

[when](./when.md) an OpenAPI operation is converted into a YAAF tool, its parameters (path, query, header) and request body properties are merged into a single, flat `ToolInput` schema for the [LLM](../concepts/llm.md). After the LLM provides arguments for this flat schema, `getBodyPropertyNames` is used to determine which of those arguments must be collected and placed into the body of the outgoing HTTP request. This is a crucial step in reconstructing the correct API call from the LLM's output [Source 1].

It works in tandem with `operationToToolInput`, which creates the initial flat schema.

## Signature

```typescript
export function getBodyPropertyNames(operation: ParsedOperation): Set<string>;
```

### Parameters

-   **`operation`** (`ParsedOperation`): The parsed representation of an OpenAPI operation, containing details about its parameters and request body [Source 1].

### Returns

-   `Set<string>`: A `Set` containing the names of all properties that belong in the request body. This includes properties that may have been prefixed with `__body_` during the schema flattening process to resolve name collisions [Source 1].

## Examples

Consider an OpenAPI operation for `POST /users` which accepts a query parameter `sendWelcomeEmail` and has a request body with `name` and `email` fields.

The `operationToToolInput` function would generate a flat schema with properties: `sendWelcomeEmail`, `name`, and `email`.

To construct the API call after receiving LLM-generated arguments, `getBodyPropertyNames` is used to separate the body properties from the query parameter.

```typescript
import { getBodyPropertyNames } from "yaaf";
import type { ParsedOperation } from "yaaf/types"; // Fictional import for example

// Assume 'parsedPostUserOperation' is the ParsedOperation object
// for the POST /users endpoint.
const parsedPostUserOperation: ParsedOperation = {
  // ... details of the parsed operation
  method: "post",
  path: "/users",
  requestBody: {
    // ... details of the request body schema
    properties: {
      name: { type: "string" },
      email: { type: "string" },
    },
  },
  // ... other parsed details
};

// Get the names of properties that belong in the request body
const bodyProperties = getBodyPropertyNames(parsedPostUserOperation);

console.log(bodyProperties);
// Expected output: Set(2) { 'name', 'email' }

// Later, when handling LLM output:
const llmArguments = {
  name: "Jane Doe",
  email: "jane.doe@example.com",
  sendWelcomeEmail: true,
};

const requestBody = {};
for (const key in llmArguments) {
  if (bodyProperties.has(key)) {
    requestBody[key] = llmArguments[key];
  }
}

console.log(requestBody);
// Expected output: { name: 'Jane Doe', email: 'jane.doe@example.com' }
```

## See Also

-   `operationToToolInput`: The function that creates the flat `ToolInput` schema from a `ParsedOperation`.
-   `ParsedOperation`: The data structure representing a parsed OpenAPI operation that this function consumes.

## Sources

[Source 1]: src/[Tools](../subsystems/tools.md)/openapi/schema.ts