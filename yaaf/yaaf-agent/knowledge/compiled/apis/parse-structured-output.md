---
summary: Parses and validates a model's text output against a JSON Schema, handling common LLM quirks like markdown fences and embedded JSON.
export_name: parseStructuredOutput
source_file: src/agents/structuredOutput.ts
category: function
title: parseStructuredOutput
entity_type: api
stub: false
compiled_at: 2026-04-16T14:14:58.117Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/structuredOutput.ts
confidence: 0.98
---

## Overview
`parseStructuredOutput` is a utility function used to transform raw string responses from Large Language Models (LLMs) into validated, type-safe JSON objects. While some model providers support native structured output, this function provides a robust fallback and post-processing layer that handles common formatting inconsistencies produced by LLMs.

The function is designed to handle several "quirks" typical of model outputs:
*   **Markdown Fences**: Automatically strips ```json ... ``` or similar code blocks.
*   **Whitespace**: Cleans leading and trailing whitespace that may interfere with JSON parsing.
*   **Embedded JSON**: Extracts the first valid JSON object `{ ... }` found within a larger body of prose.

This function is typically used for post-hoc validation when using a standard agent runner that may also be performing tool calls, as opposed to a dedicated structured agent which might disable tools to ensure clean output.

## Signature
```typescript
export function parseStructuredOutput<T = Record<string, any>>(
  output: string,
  schema: any
): ParseResult<T>
```

### Parameters
*   `output`: The raw text string returned by the model.
*   `schema`: The JSON Schema object used to validate the structure of the parsed data.

### Return Value
Returns a `ParseResult` object. Based on the source documentation, this object indicates whether the operation was successful (`ok`) and contains either the validated `data` or error information.

## Examples

### Post-hoc Validation
This example demonstrates using the function to validate a response from a standard agent.

```typescript
const response = await agent.run('Classify this email');
const parsed = parseStructuredOutput(response, classificationSchema);

if (parsed.ok) {
  // parsed.data is now type-safe and validated against the schema
  console.log(parsed.data.category);
} else {
  console.error('Failed to parse structured output');
}
```

## See Also
*   structuredAgent
*   buildSchemaPromptSection