---
title: structuredAgent
entity_type: api
summary: A factory function to create an agent that is constrained to return structured JSON output based on a provided schema, disabling tool calling for clean output.
export_name: structuredAgent
source_file: src/agents/structuredOutput.ts
category: function
search_terms:
 - JSON output agent
 - schema-enforced responses
 - structured data from LLM
 - how to get JSON from an agent
 - disable tool calling for JSON
 - force model to return JSON
 - OpenAI JSON mode
 - Anthropic structured output
 - Gemini JSON response
 - Ollama JSON format
 - agent without tools
 - schema validation for agents
 - type-safe LLM output
stub: false
compiled_at: 2026-04-24T17:41:50.165Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `structuredAgent` function is a factory for creating a simple agent that is constrained to return a JSON object matching a specified schema [Source 1]. This type of agent is useful [when](./when.md) the primary goal is to extract structured data from a model's response, rather than engaging in a multi-step process involving [Tools](../subsystems/tools.md).

To ensure clean JSON output, `structuredAgent` explicitly disables tool-calling capabilities [Source 1]. It leverages native provider features for [Structured Output](../concepts/structured-output.md) where available, such as OpenAI's `json_schema` response format, Gemini's `responseMimeType`, or a tool-use workaround for Anthropic models [Source 1]. For providers without native support, it can fall back to including the schema in the prompt [Source 1].

This function is the YAAF equivalent of the `output_schema` feature in ADK (Agent Development Kit) [Source 1]. For use cases that require both tool calling and structured output validation, the recommended approach is to use a standard agent and apply `parseStructuredOutput()` to its final response for post-hoc validation [Source 1].

## Signature / Constructor

The `structuredAgent` function is a generic factory that takes a chat model and a configuration object.

```typescript
export function structuredAgent<T extends Record<string, unknown> = Record<string, unknown>>(
  model: ChatModel,
  config: StructuredAgentConfig,
): {
  run(input: string): Promise<T>;
};
```

**Parameters:**

*   `model`: An instance of a `ChatModel` to be used for generating the response [Source 1].
*   `config`: A `StructuredAgentConfig` object containing the agent's definition [Source 1].

**Configuration (`StructuredAgentConfig`):**

The `config` object has the following properties, based on the provided examples [Source 1]:

*   `name` (string): A descriptive name for the agent.
*   `systemPrompt` (string): The [System Prompt](../concepts/system-prompt.md) that instructs the model on its task.
*   `schema` (object): A JSON Schema object that defines the structure of the expected output.

**Return Value:**

The function returns an object with a single method, `run`, which executes the agent and returns the parsed, type-safe JSON object corresponding to the provided schema `T` [Source 1].

## Methods & Properties

The object returned by `structuredAgent` has one method:

### run()

Executes the agent with a given input string and returns the structured JSON output.

**Signature:**

```typescript
run(input: string): Promise<T>;
```

**Parameters:**

*   `input` (string): The user prompt or text to be processed by the agent.

**Returns:**

A `Promise` that resolves to the parsed JSON object (`T`), which conforms to the schema provided in the agent's configuration [Source 1].

## Examples

The following example demonstrates creating a `structuredAgent` to evaluate code quality and return a structured grade [Source 1].

```typescript
const evaluator = structuredAgent(model, {
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
});

const result = await evaluator.run('function add(a, b) { return a + b; }');

// The result is a type-safe object
console.log(result); 
// Expected output: { grade: 'pass', score: 95, issues: [] }
```

## See Also

*   `parseStructuredOutput`: A function for post-hoc parsing and validation of a model's text output against a JSON schema, useful for agents that also use tools [Source 1].
*   `buildSchemaPromptSection`: A helper function to create a system prompt section that instructs a model to output JSON matching a schema, used as a fallback for providers without native support [Source 1].

## Sources

[Source 1]: src/agents/structuredOutput.ts