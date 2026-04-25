---
title: StructuredAgentConfig
entity_type: api
summary: A TypeScript type defining the configuration options for a structured agent, including its name, system prompt, and output schema.
export_name: StructuredAgentConfig
source_file: src/agents/structuredOutput.ts
category: type
search_terms:
 - structured output configuration
 - JSON schema for agents
 - define agent output format
 - schema-enforced JSON
 - configure structuredAgent
 - system prompt for JSON output
 - agent name and schema
 - how to make an agent return JSON
 - force JSON response from LLM
 - type-safe agent output
 - structured agent setup
 - output schema definition
stub: false
compiled_at: 2026-04-24T17:41:55.446Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`StructuredAgentConfig` is a TypeScript type that defines the configuration for an agent created with the `structuredAgent` factory function. It encapsulates all the necessary information to create an agent that is constrained to produce JSON output conforming to a specific schema [Source 1].

This configuration is used for agents that specialize in returning structured data and do not support tool calling. The configuration includes a descriptive name, a [System Prompt](../concepts/system-prompt.md) to guide the model's behavior, and the JSON schema that the output must adhere to [Source 1].

## Signature

While the source file does not export the type definition directly, its structure can be inferred from its usage within the `structuredAgent` function [Source 1].

```typescript
type StructuredAgentConfig = {
  /**
   * A descriptive name for the agent.
   */
  name: string;

  /**
   * The system prompt that instructs the model on its task and output format.
   */
  systemPrompt: string;

  /**
   * The JSON schema that the model's output must conform to.
   * This is used to enforce the structure of the JSON response.
   */
  schema: Record<string, unknown>; // Represents a JSON Schema object
};
```

## Properties

*   **`name`**: `string`
    A descriptive name for the agent, used for identification and logging purposes.

*   **`systemPrompt`**: `string`
    The main instruction or prompt provided to the language model. It should guide the model on its task and explicitly mention that it should return a structured JSON response.

*   **`schema`**: `Record<string, unknown>`
    A standard JSON Schema object that defines the expected structure, types, and constraints of the JSON output. The `structuredAgent` uses this schema to configure the model provider's native [Structured Output](../concepts/structured-output.md) feature or to include schema instructions in the prompt as a fallback [Source 1].

## Examples

The following example demonstrates how to create a `StructuredAgentConfig` object and use it with the `structuredAgent` function to build a code quality evaluator [Source 1].

```typescript
import { structuredAgent } from 'yaaf';
import { someModel } from './my-model-provider';

// Define the configuration for the structured agent
const evaluatorConfig: StructuredAgentConfig = {
  name: 'evaluator',
  systemPrompt: 'Evaluate the code quality. Return a structured grade.',
  schema: {
    type: 'object',
    properties: {
      grade: { type: 'string', enum: ['pass', 'fail'] },
      score: { type: 'number', minimum: 0, maximum: 100 },
      issues: { type: 'array', items: { type: 'string' } },
    },
    required: ['grade', 'score', 'issues'],
  },
};

// Create the agent using the model and configuration
const evaluator = structuredAgent(someModel, evaluatorConfig);

// Run the agent
const result = await evaluator.run('function add(a, b) { return a + b; }');

// The result is a type-safe object matching the schema
console.log(result);
// Expected output: { grade: 'pass', score: 95, issues: [] }
```

## See Also

*   `structuredAgent`: The factory function that consumes this configuration object to create a schema-enforced agent.
*   `parseStructuredOutput`: A function for post-hoc validation of a model's output against a schema, used as an alternative for agents that also support [Tools](../subsystems/tools.md).

## Sources

[Source 1]: src/agents/structuredOutput.ts