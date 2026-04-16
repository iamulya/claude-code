---
summary: Creates a simple agent that returns structured JSON output by disabling tool calling and enforcing a schema.
export_name: structuredAgent
source_file: src/agents/structuredOutput.ts
category: function
title: structuredAgent
entity_type: api
stub: false
compiled_at: 2026-04-16T14:14:54.165Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/structuredOutput.ts
confidence: 0.98
---

## Overview
`structuredAgent` is a factory function used to create agents that return structured JSON responses instead of free-text prose. It is designed for specialized tasks where the output must conform to a specific data contract, such as classification, extraction, or evaluation.

To ensure the integrity of the JSON output, this agent implementation explicitly disables tool calling. It leverages native provider capabilities where available (such as OpenAI's `json_schema` or Gemini's `responseSchema`) and falls back to prompt-based enforcement for other providers.

## Signature / Constructor
```typescript
export function structuredAgent<T extends Record<string, unknown> = Record<string, unknown>>(
  model: ChatModel,
  config: StructuredAgentConfig,
): {
  run: (input: string | ChatMessage[]) => Promise<T>;
}
```

### Parameters
*   **model**: The `ChatModel` instance used to execute the LLM requests.
*   **config**: A configuration object of type `StructuredAgentConfig` containing:
    *   `name`: (Optional) An identifier for the agent.
    *   `systemPrompt`: The instructions defining the agent's behavior.
    *   `schema`: A JSON Schema object defining the required structure of the response.

## Methods & Properties
The function returns an object with the following method:

### run()
Executes the agent with the provided input and returns the parsed, validated JSON data.
*   **Signature**: `run(input: string | ChatMessage[]): Promise<T>`
*   **Parameters**: Accepts either a raw string prompt or an array of chat messages.
*   **Returns**: A promise that resolves to the parsed JSON object matching the provided schema.

## Examples

### Schema-Only Agent
This example demonstrates creating an evaluator agent that returns a structured grade and a list of issues for a given code snippet.

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
console.log(result); 
// Output: { grade: 'pass', score: 95, issues: [] }
```

## See Also
*   `parseStructuredOutput`: A utility for validating and parsing JSON from standard agent responses without disabling tools.
*   `buildSchemaPromptSection`: A helper used to generate prompt instructions for providers lacking native structured output support.