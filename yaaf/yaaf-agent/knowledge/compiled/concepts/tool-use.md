---
title: Tool Use
entity_type: concept
summary: The mechanism by which LLMs interact with external functions and tools via structured input and output schemas.
stub: false
compiled_at: 2026-04-16T14:30:41.463Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/anthropic.ts
confidence: 0.9
---

---
title: Tool Use
entity_type: concept
summary: The mechanism by which LLMs interact with external functions and tools via structured input and output schemas.
related_subsystems:
  - models
  - agents

## What It Is
Tool Use is a core abstraction in YAAF that enables Large Language Models (LLMs) to extend their capabilities beyond text generation by interacting with external code, APIs, and data sources. It solves the "closed-box" limitation of LLMs by providing a structured protocol for the model to request the execution of specific functions and receive the results of those executions.

In YAAF, Tool Use allows developers to define a set of capabilities (tools) that an agent can invoke when it determines that a task requires external data or actions.

## How It Works in YAAF
YAAF provides a provider-agnostic interface for tool interaction, though the underlying implementation details vary by model provider. The framework handles the translation between the model's specific requirements and the tool's execution logic.

### Tool Definition and Schema
Tools are defined using structured schemas that describe the function's purpose and the expected format of its arguments. For example, in the Anthropic implementation, tools utilize an `input_schema` to define parameters, which differs from the `parameters` field used by other providers like OpenAI.

### The Tool Use Lifecycle
1.  **Request**: When a model decides to use a tool, it returns a response containing a `tool_use` block. This block includes a unique `tool_use_id` and the arguments for the function call.
2.  **Execution**: The framework or the `Agent` identifies the requested tool, executes the corresponding function with the provided arguments, and captures the output.
3.  **Response**: The result of the tool execution is sent back to the model. In the Anthropic provider, this is formatted as a user message containing a `tool_result` type, which includes the original `tool_use_id` to maintain context.

### Provider-Specific Implementation (Anthropic)
The `AnthropicChatModel` implements Tool Use following the Anthropic Messages API. Key characteristics include:
*   **Typed Blocks**: Response content is returned as an array of typed blocks, which may include `text` or `tool_use`.
*   **Result Mapping**: Tool results must be explicitly linked to the request via the `tool_use_id`.
*   **Schema Format**: Uses `input_schema` for tool definitions.

## Configuration
Tool Use is typically configured at the `Agent` or `Model` level. While the specific tool logic is defined by the developer, the model configuration ensures the LLM is aware of the available tools.

```typescript
// Example of model-level configuration for a provider supporting Tool Use
const model = new AnthropicChatModel({ 
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet'
});

// Tools are typically passed during the agent initialization or completion request
// The framework ensures the schema is translated to the provider's format (e.g., input_schema)
```

## See Also
* [[AnthropicChatModel]]
* [[Agent]]