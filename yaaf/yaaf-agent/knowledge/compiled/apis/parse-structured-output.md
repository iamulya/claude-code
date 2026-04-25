---
title: parseStructuredOutput
entity_type: api
summary: A utility function to parse and validate a model's raw text output against a JSON Schema, handling common LLM formatting quirks like markdown fences and embedded JSON.
export_name: parseStructuredOutput
source_file: src/agents/structuredOutput.ts
category: function
search_terms:
 - parse LLM JSON output
 - validate model response against schema
 - extract JSON from text
 - handle markdown code fences
 - structured data from LLM
 - JSON schema validation
 - post-hoc validation
 - clean up model JSON
 - parse agent response
 - type-safe LLM output
 - result parsing
 - schema enforcement
stub: false
compiled_at: 2026-04-24T17:26:50.770Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `parseStructuredOutput` function is a utility for parsing and validating the raw text output from a Large Language Model ([LLM](../concepts/llm.md)) against a provided JSON Schema [Source 1]. It is designed to robustly handle common formatting inconsistencies in model outputs, making it easier to work with structured data from agents.

This function is particularly useful for post-hoc validation of a response from an agent that may also use [Tools](../subsystems/tools.md). Unlike the `structuredAgent` factory, which disables tool calling to ensure clean JSON output, `parseStructuredOutput` can be applied to the final text response of any agent [Source 1].

Key features include [Source 1]:
- Stripping markdown code fences (e.g., ` ```json ... ``` `).
- Removing leading and trailing whitespace.
- Extracting the first valid JSON object (`{...}`) found embedded within surrounding text.

The function returns a result object that indicates success or failure, providing either the type-safe parsed data or an error object.

## Signature

The function takes the raw string output from a model and a JSON Schema object for validation.

```typescript
// Note: The exact 'OutputSchema' and 'ParseResult' types are not fully
// specified in the source, but their structure can be inferred from usage.

type OutputSchema = Record<string, any>; // Represents a JSON Schema object

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: Error };

/**
 * Parse and validate a model's text output against a JSON Schema.
 *
 * @param output - Raw text output from the model.
 * @param schema - Expected JSON Schema (used for basic validation).
 * @returns ParseResult with the parsed data or error.
 */
export function parseStructuredOutput<T extends Record<string, unknown>>(
  output: string,
  schema: OutputSchema
): ParseResult<T>;
```

## Examples

The following example demonstrates how to use `parseStructuredOutput` to validate the response from a generic agent against a `classificationSchema`.

```typescript
// Assume 'agent' is an initialized AgentRunner instance
// and 'classificationSchema' is a valid JSON Schema object.

const response = await agent.run('Classify this email');

// The raw response might be:
// "Sure, here is the classification in JSON format: ```json\n{\"category\": \"spam\", \"confidence\": 0.98}\n```"

const parsed = parseStructuredOutput(response, classificationSchema);

if (parsed.ok) {
  // parsed.data is now a type-safe object
  console.log(parsed.data.category); // Outputs: "spam"
  console.log(parsed.data.confidence); // Outputs: 0.98
} else {
  console.error("Failed to parse [[[[[[[[Structured Output]]]]]]]]:", parsed.error);
}
```
[Source 1]

## See Also

- `structuredAgent`: A factory for creating agents that are dedicated to returning structured JSON and do not support tool calling. `parseStructuredOutput` is the recommended alternative [when](./when.md) both tools and a final Structured Output are required.

## Sources

[Source 1]: src/agents/structuredOutput.ts