---
summary: Builds a system prompt section instructing the model to output valid JSON matching a schema, used as a fallback for providers without native support.
export_name: buildSchemaPromptSection
source_file: src/agents/structuredOutput.ts
category: function
title: buildSchemaPromptSection
entity_type: api
stub: false
compiled_at: 2026-04-16T14:15:04.000Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/structuredOutput.ts
confidence: 0.98
---

## Overview
The `buildSchemaPromptSection` function is a utility used to enforce structured output through prompt engineering. While many LLM providers (such as OpenAI and Gemini) support native schema enforcement, others require explicit instructions within the system prompt to ensure the response adheres to a specific JSON format. 

This function generates a standardized string of instructions based on a provided JSON schema. This string is intended to be appended to an agent's system prompt to guide the model toward producing valid, parseable JSON that matches the expected structure.

## Signature
```typescript
export function buildSchemaPromptSection(schema: OutputSchema): string
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `schema` | `OutputSchema` | The JSON Schema definition that the model's output must satisfy. |

### Returns
`string`: A formatted prompt section containing instructions and the stringified schema.

## Examples

### Basic Usage
This example demonstrates how to generate a prompt section and manually append it to a system prompt.

```typescript
import { buildSchemaPromptSection } from 'yaaf';

const schema = {
  type: 'object',
  properties: {
    sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
    score: { type: 'number', minimum: 0, maximum: 1 }
  },
  required: ['sentiment', 'score']
};

const schemaInstructions = buildSchemaPromptSection(schema);
const systemPrompt = `You are a sentiment analysis assistant. ${schemaInstructions}`;

// The resulting systemPrompt will contain explicit instructions for the LLM
// to return JSON matching the sentiment/score schema.
```

## See Also
- `structuredAgent`: A high-level factory for creating agents with enforced JSON output.
- `parseStructuredOutput`: A utility for validating and parsing the text returned by a model against a schema.