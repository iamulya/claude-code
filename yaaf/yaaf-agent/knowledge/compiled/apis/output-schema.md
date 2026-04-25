---
title: OutputSchema
entity_type: api
summary: A TypeScript type representing a JSON Schema used to define the expected structure of an agent's output.
export_name: OutputSchema
source_file: src/agents/structuredOutput.ts
category: type
search_terms:
 - JSON schema for LLM output
 - define agent response structure
 - structured JSON from model
 - force JSON output
 - schema validation for agents
 - type-safe agent responses
 - OpenAI json_schema
 - Gemini responseSchema
 - Anthropic tool use for JSON
 - Ollama JSON format
 - how to get JSON from LLM
 - YAAF structured output
 - schema-enforced JSON
stub: false
compiled_at: 2026-04-24T17:25:16.667Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`OutputSchema` is a TypeScript type representing a standard JSON Schema object. It is used to define and enforce a specific JSON structure for the output of a Large Language Model ([LLM](../concepts/llm.md)) agent, ensuring the response is predictable and machine-readable instead of free-form text [Source 1].

This type is a key component of YAAF's [Structured Output](../concepts/structured-output.md) capabilities. It is used by functions like `structuredAgent` to instruct the model to generate JSON matching the schema, and by `parseStructuredOutput` for post-hoc validation of a model's response [Source 1].

YAAF leverages native provider features for structured output where available, such as OpenAI's `json_schema` response format, Gemini's `responseSchema`, and Anthropic's tool-use workarounds. For providers without native support, a schema description is injected into the [System Prompt](../concepts/system-prompt.md) [Source 1].

## Signature

The `OutputSchema` type conforms to the JSON Schema specification. While it can represent any valid JSON Schema, a common structure for defining an object with specific properties is shown below.

```typescript
type OutputSchema = {
  type: 'object';
  properties: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      description?: string;
      enum?: (string | number)[];
      items?: {
        type: 'string' | 'number' | 'boolean' | 'object';
      };
      // ... other JSON Schema properties
    };
  };
  required?: string[];
};
```

## Examples

The following example defines an `OutputSchema` to evaluate code quality. This schema is then passed to the `structuredAgent` function to create an agent that is guaranteed to return JSON matching the defined structure [Source 1].

```typescript
import { structuredAgent } from 'yaaf';
import { model } from './your-model-setup'; // Placeholder for your model instance

const codeQualitySchema: OutputSchema = {
  type: 'object',
  properties: {
    grade: {
      type: 'string',
      description: 'The final evaluation grade.',
      enum: ['pass', 'fail'],
    },
    score: {
      type: 'number',
      description: 'A numerical score from 0 to 100.',
      minimum: 0,
      maximum: 100,
    },
    issues: {
      type: 'array',
      description: 'A list of identified issues or suggestions.',
      items: { type: 'string' },
    },
  },
  required: ['grade', 'score', 'issues'],
};

const evaluator = structuredAgent(model, {
  name: 'evaluator',
  systemPrompt: 'Evaluate the code quality. Return a structured grade.',
  schema: codeQualitySchema,
});

async function evaluateCode() {
  const result = await evaluator.run('function add(a, b) { return a + b; }');
  
  // result is type-safe and matches the schema
  console.log(result); 
  // Expected output: { grade: 'pass', score: 95, issues: [] }
}
```

## See Also

*   `structuredAgent`: A factory function to create an agent that only returns structured JSON.
*   `parseStructuredOutput`: A utility to parse and validate raw text output against an `OutputSchema`.
*   `buildSchemaPromptSection`: A function to generate a prompt fragment describing the schema for models without native JSON support.

## Sources

[Source 1] `src/agents/structuredOutput.ts`