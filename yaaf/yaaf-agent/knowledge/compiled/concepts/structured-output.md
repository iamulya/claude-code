---
summary: A mechanism to force LLMs to return JSON matching a specific schema instead of free-text, supporting both native provider features and prompt-based fallbacks.
title: Structured Output
entity_type: concept
related_subsystems:
  - agents
stub: false
compiled_at: 2026-04-16T14:14:57.829Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/structuredOutput.ts
confidence: 0.95
---

## What It Is
Structured Output is a core abstraction in YAAF that ensures Large Language Models (LLMs) produce machine-readable JSON data conforming to a predefined schema. This addresses the inherent unpredictability of LLM text generation, where models might otherwise return conversational prose, markdown, or malformed data structures. By enforcing a schema, YAAF allows developers to treat agent responses as type-safe objects within a production application.

## How It Works in YAAF
YAAF implements structured output through three primary mechanisms:

1.  **Native Provider Integration**: YAAF leverages native features of underlying LLM providers when available:
    *   **OpenAI**: Uses `response_format: { type: "json_schema", json_schema: { schema } }`.
    *   **Gemini**: Uses `responseMimeType: "application/json"` and `responseSchema`.
    *   **Anthropic**: Implements a workaround using a "fake tool" via the tool-use API to capture structured data.
    *   **Ollama**: Uses the `format: "json"` parameter combined with schema instructions in the prompt.

2.  **The `structuredAgent` Factory**: This function creates a specialized agent runner dedicated to returning JSON. When using `structuredAgent`, tool calling is disabled to ensure the model focuses entirely on the schema. This is functionally similar to the `output_schema` pattern found in other frameworks like ADK, but YAAF allows for more selective application.

3.  **Post-hoc Validation**: For agents that require both tool-calling capabilities and structured final responses, YAAF provides `parseStructuredOutput()`. This utility validates raw text against a schema and handles common LLM formatting quirks, such as:
    *   Stripping markdown code fences (e.g., ` ```json `).
    *   Removing leading/trailing whitespace.
    *   Extracting the first valid JSON block `{ ... }` found within a prose response.

4.  **Prompt-based Fallbacks**: For providers lacking native schema enforcement, `buildSchemaPromptSection()` generates system prompt instructions that guide the model to adhere to the required JSON structure.

## Configuration
Developers can implement structured output either by defining a schema-only agent or by parsing a standard agent's response.

### Schema-Only Agent
A schema-only agent is configured with a JSON schema and a system prompt. This configuration disables tool calling to ensure clean JSON output.

```ts
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
console.log(result); // { grade: 'pass', score: 95, issues: [] }
```

### Post-hoc Validation
For agents that use tools, developers can apply validation to the final response manually.

```ts
const response = await agent.run('Classify this email');
const parsed = parseStructuredOutput(response, classificationSchema);
if (parsed.ok) {
  console.log(parsed.data.category); // Type-safe access
}
```