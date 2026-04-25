---
title: OpenAPI Tool Schema Generation
entity_type: subsystem
summary: A subsystem responsible for converting OpenAPI operation definitions into flat JSON Schemas suitable for LLM tool input.
primary_files:
 - src/tools/openapi/schema.ts
exports:
 - operationToToolInput
 - getBodyPropertyNames
search_terms:
 - convert OpenAPI to JSON Schema
 - LLM tool schema from OpenAPI
 - flatten OpenAPI parameters
 - OpenAPI request body to tool input
 - function calling schema generation
 - how to create tool schema from API spec
 - YAAF OpenAPI tools
 - operationToToolInput function
 - getBodyPropertyNames function
 - parameter name collision handling
 - "`__body_` prefix"
 - parsed operation to tool input
stub: false
compiled_at: 2026-04-24T18:17:38.467Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/schema.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The OpenAPI Tool Schema Generation subsystem converts structured OpenAPI operation definitions into a simplified, flat JSON Schema format. This format, known as `ToolInput`, is specifically designed for consumption by Large Language Models ([LLM](../concepts/llm.md)s) [Source 1].

The primary problem this subsystem solves is bridging the gap between the complex, nested structure of an OpenAPI specification (which can include parameters in the path, query, header, and a separate request body) and the input format that yields the best results for LLM tool-calling or function-calling features. The design is based on the observation that LLMs produce more reliable arguments [when](../apis/when.md) the input schema is flat, with all properties defined at the top level [Source 1].

## Architecture

The core architectural strategy of this subsystem is "flattening". It takes a `ParsedOperation` object, which represents a single API endpoint, and transforms its parameters and request body into a single `ToolInput` JSON Schema [Source 1].

The conversion process follows these steps:
1.  **Parameter Mapping**: Each parameter from the OpenAPI operation (e.g., path, query parameters) becomes a top-level property in the output JSON Schema.
2.  **Request Body Inlining**: If the operation has a request body defined with a schema, its properties are also inlined as top-level properties in the output schema.
3.  **Collision Resolution**: In cases where a request body property name conflicts with a parameter name, the property from the request body is prefixed with `__body_` to ensure uniqueness.
4.  **Simplification**: The subsystem simplifies the resulting schemas, removing unnecessary complexity or "noise" to make them more LLM-friendly [Source 1].

The output is a standard JSON Schema object that represents the complete set of inputs required to call the API endpoint.

## Integration Points

This subsystem integrates with other parts of the framework in a clear producer-consumer pattern:

*   **Input**: It consumes `ParsedOperation` objects, which are the output of the [OpenAPI Parser](./open-api-parser.md) subsystem.
*   **Output**: Its primary output, the `ToolInput` schema, is used by the agent's core tool-handling logic to define the tool's interface for the LLM.
*   **Execution**: The `[[[[[[[[getBodyPropertyNames]]]]]]]]` function provides crucial metadata to the [Tool Execution](../concepts/tool-execution.md) logic. When an LLM provides arguments for a tool based on the flattened schema, this function is used to identify which arguments belong in the HTTP request body versus other locations like the query string, enabling the correct reconstruction of the API call [Source 1].

## Key APIs

The public API for this subsystem consists of two primary functions exported from `src/[[[[[[[[Tools]]]]]]]]/openapi/schema.ts` [Source 1].

### [operationToToolInput](../apis/operation-to-tool-input.md)

```typescript
export function operationToToolInput(operation: ParsedOperation): ToolInput
```

This is the main function of the subsystem. It accepts a `ParsedOperation` object and returns a `ToolInput` JSON Schema. The schema is a flattened representation of all the operation's parameters and its request body, suitable for an LLM.

**Example Usage from Source [Source 1]:**

```typescript
// For an operation like: GET /pets?limit=10&status=available
// The function returns a schema like:
// { type: 'object', properties: { limit: {...}, status: {...} } }

// For an operation like: POST /pets with body { name: string, tag?: string } and query param dryRun
// The function returns a schema like:
// { type: 'object', properties: { name: {...}, tag: {...}, dryRun: {...} }, required: ['name'] }
```

### getBodyPropertyNames

```typescript
export function getBodyPropertyNames(operation: ParsedOperation): Set<string>
```

This utility function takes a `ParsedOperation` and returns a `Set` of strings. Each string in the set is the name of a property in the generated `ToolInput` schema that corresponds to a field from the original operation's request body. This is essential for correctly constructing the HTTP request during tool execution [Source 1].

## Sources

[Source 1]: src/Tools/openapi/schema.ts