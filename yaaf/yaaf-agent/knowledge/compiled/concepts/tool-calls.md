---
title: Tool Calls
entity_type: concept
summary: The mechanism by which a Large Language Model (LLM) can request the execution of external functions, known as tools or skills, to interact with the outside world.
related_subsystems:
 - telemetry-system
see_also:
 - Tool Execution
 - Skills
 - Model Routing
 - OpenTelemetry Integration
search_terms:
 - function calling
 - how to use tools with LLM
 - agent tool use
 - parallel function calls
 - sequential tool execution
 - instrumenting tool calls
 - tool call telemetry
 - LLM external functions
 - tool call lifecycle
 - tool call events
 - tool use visualization
 - OpenAI parallelToolCalls
stub: false
compiled_at: 2026-04-25T00:25:41.874Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

A Tool Call is the mechanism by which a Large Language Model ([LLM](./llm.md)) requests the execution of an external, pre-defined function to perform actions or retrieve information from outside its own knowledge base [Source 1]. These external functions are referred to as tools or [Skills](./skills.md) within YAAF. This capability is fundamental for building effective agents, as it allows them to interact with APIs, access real-time data, and perform tasks that are not possible with text generation alone.

## How It Works in YAAF

In YAAF, a tool call is a multi-stage process that is deeply integrated with the framework's observability and runtime systems.

### Lifecycle and Telemetry

The lifecycle of a tool call is automatically instrumented when [OpenTelemetry Integration](./open-telemetry-integration.md) is active, providing detailed traces for debugging and performance analysis [Source 2].

1.  **LLM Request**: An agent's turn begins with an [LLM Call](./llm-call.md). The LLM is provided with the user's prompt, conversation history, and a list of available tools.
2.  **LLM Response**: The LLM may respond with a request to invoke one or more tools. This intent is captured in the `yaaf.llm.request` trace span, which will have an `llm.has_tool_calls` attribute set to true [Source 2].
3.  **Tool Call Span**: For each tool the LLM wants to use, YAAF creates a `yaaf.tool.call` span. This span represents the LLM's request and includes metadata like the tool's name (`tool.name`) [Source 2].
4.  **Tool Execution Span**: The framework then invokes the actual tool code. This action is wrapped in a nested `yaaf.tool.execution` span, which measures the duration and captures any errors that occur during the tool's execution (`tool.execution_ms`, `tool.error?`) [Source 2].
5.  **Result**: The output from the tool execution is collected and sent back to the LLM in a subsequent turn, allowing the model to use the new information to formulate its final response.

This explicit separation between the `tool.call` span (the LLM's intent) and the `tool.execution` span (the actual code execution) is crucial for diagnosing issues, such as whether a problem lies with the model's reasoning or the tool's implementation [Source 2].

### Parallel vs. Sequential Execution

YAAF supports both parallel and sequential tool calls, configurable at the model adapter level. For instance, the `OpenAIChatModel` allows developers to control this behavior via the `parallelToolCalls` property. By default, it is `true`, allowing the model to request multiple tool calls in a single turn, which YAAF can execute concurrently. Setting it to `false` forces the model to call tools one at a time, which is useful when tools have side-effects that depend on a specific execution order [Source 3].

### Influence on Model Routing

The presence and complexity of tools can influence [Model Routing](./model-routing.md). The [RouterChatModel](../apis/router-chat-model.md) uses the number of available tools as part of its default heuristic to decide whether to use a [Fast Model](./fast-model.md) or a more [Capable Model](./capable-model.md). For example, a task with more than five tools might be routed to the capable model, assuming it requires more complex reasoning to orchestrate them correctly [Source 4].

### Streaming and UI Representation

YAAF's runtimes provide real-time feedback on tool call activity. The framework's stream adapter emits discrete events for the tool call lifecycle:
*   `tool_call_start`: Fired when a tool begins execution.
*   `tool_call_end`: Fired when a tool completes, including its duration and any errors.
*   `tool_blocked`: Fired if a tool's execution is denied by a security policy [Source 1].

These events enable sophisticated user interfaces. The [createInkCLI](../apis/create-ink-cli.md) runtime, for example, uses these events to display in-place spinners for in-progress tool calls, which resolve to a checkmark (✓) or cross (✗) upon completion, providing a premium user experience. The more basic `createCLI` runtime simply renders this activity as plain text output [Source 1].

## Configuration

Developers can configure tool call behavior on specific model adapters. The following example demonstrates how to configure an OpenAI-compatible model to enforce sequential tool calls.

```typescript
import { OpenAIChatModel } from 'yaaf/models/openai';

// This model will only call one tool at a time per turn.
const sequentialAgentModel = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  // Force sequential tool calls for tools with dependent side-effects.
  parallelToolCalls: false,
});
```
[Source 3]

## See Also

*   [Tool Execution](./tool-execution.md)
*   [Skills](./skills.md)
*   [Model Routing](./model-routing.md)
*   [OpenTelemetry Integration](./open-telemetry-integration.md)
*   [RouterChatModel](../apis/router-chat-model.md)
*   [OpenAIModelConfig](../apis/open-ai-model-config.md)

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts