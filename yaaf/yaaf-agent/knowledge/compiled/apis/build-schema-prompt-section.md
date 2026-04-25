---
title: buildSchemaPromptSection
entity_type: api
summary: Generates a system prompt section that instructs an LLM to output valid JSON matching a given schema, serving as a fallback for providers without native structured output.
export_name: buildSchemaPromptSection
source_file: src/agents/structuredOutput.ts
category: function
search_terms:
 - JSON schema prompt
 - force LLM to output JSON
 - structured output without native support
 - prompt engineering for JSON
 - fallback for structured output
 - how to get JSON from LLM
 - Ollama JSON format
 - system prompt for JSON schema
 - instruct model to return JSON
 - schema enforcement via prompt
 - generate prompt from schema
 - text-based JSON enforcement
stub: false
compiled_at: 2026-04-24T16:53:38.080Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `buildSchemaPromptSection` function generates a string intended for inclusion in a [System Prompt](../concepts/system-prompt.md). This string instructs a Large Language Model ([LLM](../concepts/llm.md)) to generate a response that is a valid JSON object conforming to a provided JSON Schema [Source 1].

This function serves as a crucial fallback mechanism for LLM providers that do not have native support for enforcing structured JSON output. While providers like OpenAI, Gemini, and Anthropic have dedicated API parameters for this purpose, others may require the schema to be described directly in the prompt. This function automates the creation of that instructional text [Source 1].

## Signature

The function takes a JSON Schema object and returns a formatted string.

```typescript
export function buildSchemaPromptSection(schema: OutputSchema): string;
```

### Parameters

-   **`schema`** `OutputSchema`: A standard JSON Schema object that defines the structure, types, and constraints of the desired JSON output. `OutputSchema` is a type alias for a JSON Schema definition.

### Returns

-   **`string`**: A block of text to be included in a system prompt, describing the required JSON format and schema.

## Examples

The primary use case is to construct a system prompt for an agent that needs to produce structured data, especially [when](./when.md) the underlying model provider lacks native JSON output features.

```typescript
import { buildSchemaPromptSection } from 'yaaf';

// 1. Define the desired output schema
const userProfileSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'The full name of the user.' },
    age: { type: 'number', description: 'The age of the user.' },
    isVerified: { type: 'boolean', description: 'Whether the user account is verified.' },
  },
  required: ['name', 'age'],
};

// 2. Generate the instructional prompt section from the schema
const schemaPrompt = buildSchemaPromptSection(userProfileSchema);

// 3. Combine it with the main system prompt
const systemPrompt = `
You are an expert data extraction assistant.
Extract user profile information from the given text.
${schemaPrompt}
`;

console.log(systemPrompt);
/*
Outputs a system prompt containing instructions like:
"You are an expert data extraction assistant.
Extract user profile information from the given text.
You MUST respond with a single, valid JSON object that conforms to the following JSON Schema:
...[schema details]..."
*/

// This systemPrompt can now be used with an AgentRunner.
```

## See Also

-   `structuredAgent`: A higher-level utility for creating agents that are dedicated to returning structured JSON and do not use [Tools](../subsystems/tools.md).
-   `parseStructuredOutput`: A function for parsing and validating JSON from a model's free-text response against a schema, useful for agents that use both tools and [Structured Output](../concepts/structured-output.md).

## Sources

[Source 1]: src/agents/structuredOutput.ts