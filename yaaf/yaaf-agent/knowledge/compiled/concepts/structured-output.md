---
title: Structured Output
entity_type: concept
summary: A core YAAF concept enabling agents to return schema-enforced JSON responses instead of free-text, ensuring predictable and parsable results.
primary_files:
 - src/agents/structuredOutput.ts
related_subsystems:
 - agents
search_terms:
 - JSON output from LLM
 - schema-enforced JSON
 - force LLM to return JSON
 - structured data from agent
 - YAAF JSON schema
 - parse JSON from model response
 - OpenAI JSON mode
 - Anthropic tool use for JSON
 - Gemini JSON response
 - Ollama JSON format
 - post-hoc JSON validation
 - structuredAgent vs AgentRunner
 - disable tool calling for JSON
stub: false
compiled_at: 2026-04-24T18:02:57.142Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
compiled_from_quality: unknown
confidence: 0.98
---

## What It Is

Structured Output is a YAAF capability that compels a large language model ([LLM](./llm.md)) to return a response formatted as JSON that conforms to a specified schema, rather than generating free-form text [Source 1]. This ensures that the agent's output is predictable, machine-readable, and can be safely parsed and validated by the application, solving the problem of unreliable or unstructured text responses from LLMs.

## How It Works in YAAF

YAAF implements structured output by leveraging the native capabilities of different model providers where available, and providing fallbacks for others [Source 1].

The framework abstracts the provider-specific implementations:
*   **OpenAI**: Uses the `response_format` parameter with `type: "json_schema"` [Source 1].
*   **Gemini**: Uses the `responseMimeType: "application/json"` and `responseSchema` parameters [Source 1].
*   **Anthropic**: Employs a workaround using `tool_use`, where a "fake" tool is defined with a schema matching the desired output structure [Source 1].
*   **Ollama**: Uses the `format: "json"` parameter and includes the schema directly in the [System Prompt](./system-prompt.md) [Source 1].

For providers that lack native support, YAAF can use the `buildSchemaPromptSection()` function to generate a system prompt section that instructs the model to output JSON matching the schema [Source 1].

YAAF offers two primary methods for working with structured output:

1.  **`structuredAgent()`**: This factory function creates a specialized agent that is configured exclusively for returning structured JSON output. To guarantee a clean JSON response, tool calling is disabled for these agents. This approach is analogous to the `output_schema` feature in some other frameworks [Source 1].

2.  **`parseStructuredOutput()`**: This is a utility function for post-hoc parsing and validation. It can be applied to the raw text response from any agent, including those that use [Tools](../subsystems/tools.md). The function is designed to handle common LLM output quirks, such as stripping markdown code fences (e.g., ` ```json ... ``` `), removing whitespace, and extracting the first valid JSON object from a response that contains surrounding prose [Source 1].

The key distinction is that `structuredAgent` is for dedicated, schema-only agents, while `parseStructuredOutput` provides flexibility to validate responses from more complex agents that may also use tools [Source 1].

## Configuration

Developers can implement structured output using either a dedicated agent or post-hoc validation.

### Schema-Only Agent (No Tools)

The `structuredAgent` function is used to create an agent that always returns a JSON object matching the provided schema.

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
// result is guaranteed to be a type-safe object:
// { grade: 'pass', score: 95, issues: [] }
```
[Source 1]

### Post-hoc Validation

The `parseStructuredOutput` function can be used to validate the text output from any standard agent against a schema.

```typescript
// 'agent' is a regular agent that may or may not use tools
const response = await agent.run('Classify this email');

// classificationSchema is a standard JSON Schema object
const parsed = parseStructuredOutput(response, classificationSchema);

if (parsed.ok) {
  // parsed.data is type-safe based on the schema
  console.log(parsed.data.category);
}
```
[Source 1]

## Sources

[Source 1]: src/agents/structuredOutput.ts