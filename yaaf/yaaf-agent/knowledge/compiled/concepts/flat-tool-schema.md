---
summary: The design pattern of flattening nested API structures into a single-level JSON Schema to improve LLM function calling reliability.
title: Flat Tool Schema
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:38:48.352Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/schema.ts
confidence: 0.9
---

---
title: Flat Tool Schema
entity_type: concept
summary: The design pattern of flattening nested API structures into a single-level JSON Schema to improve LLM function calling reliability.
related_subsystems:
  - tools
  - openapi

## What It Is
Flat Tool Schema is a design pattern used in YAAF to optimize how Large Language Models (LLMs) interact with complex API definitions. While modern APIs often use deeply nested JSON structures for request bodies and parameters, LLMs demonstrate higher reliability and fewer errors when generating function call arguments for schemas where all properties exist at the top level.

By flattening these structures, YAAF reduces the cognitive load on the model during the tool-calling phase, leading to more accurate parameter extraction and fewer validation errors.

## How It Works in YAAF
The transformation from complex API definitions (such as OpenAPI specifications) to a flat schema is handled primarily by the `operationToToolInput` function within the `tools/openapi/schema` module.

The framework follows a specific strategy to flatten a `ParsedOperation` into a `ToolInput`:
1.  **Parameter Promotion**: Every API parameter (path, query, or header) is converted into a top-level property in the JSON Schema.
2.  **Body Inlining**: Properties defined within the request body are extracted and placed at the top level alongside the parameters.
3.  **Collision Resolution**: In the event that a request body property shares the same name as a path or query parameter, the framework appends a `__body_` prefix to the body property to ensure uniqueness.
4.  **Schema Simplification**: The resulting schema is stripped of metadata "noise" that is not relevant to the LLM's decision-making process, ensuring the context window is used efficiently.

When the tool is eventually invoked, the framework uses the `getBodyPropertyNames` utility to map the flattened input back into the correct nested structure required by the underlying API.

## Configuration
The flattening process is an internal architectural decision of the OpenAPI tool provider. The following example demonstrates how a nested API operation is represented to the LLM as a flat schema:

```typescript
// Original API Structure:
// POST /pets { name: string, tag?: string } + query param dryRun

// Resulting Flat Tool Schema:
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string' },
//     tag: { type: 'string' },
//     dryRun: { type: 'boolean' }
//   },
//   required: ['name']
// }
```

In cases of name collisions, the schema adapts as follows:

```typescript
// GET /user/{id} + POST body { id: string }
// Resulting properties:
// {
//   id: { ... },        // From path parameter
//   __body_id: { ... }  // From request body
// }
```

## Sources
- `src/tools/openapi/schema.ts`