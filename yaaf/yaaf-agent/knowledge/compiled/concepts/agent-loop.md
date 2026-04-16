---
title: Agent Loop
entity_type: concept
summary: The iterative cycle of LLM inference and tool execution that forms the basis of YAAF agent behavior.
stub: false
compiled_at: 2026-04-16T14:14:03.098Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/runner.ts
confidence: 0.9
---

---
title: Agent Loop
entity_type: concept
summary: The iterative cycle of LLM inference and tool execution that forms the basis of YAAF agent behavior.
related_subsystems:
  - agents
  - tools
  - hooks
  - sandbox

## What It Is
The Agent Loop is the core execution mechanism in YAAF that facilitates the interaction between a Large Language Model (LLM) and external tools. It solves the problem of manual state management by providing a generic, automated cycle that sends messages to an LLM, parses tool call requests, executes those tools, feeds the results back into the model's context, and repeats the process until a final response is generated.

This loop allows YAAF to be provider-agnostic, meaning it can drive agents using any LLM that supports tool calling (such as OpenAI, Gemini, Ollama, or Groq) as long as they implement the framework's standard interfaces.

## How It Works in YAAF
The Agent Loop is primarily implemented via the `AgentRunner` class. The runner orchestrates a multi-step flow for every interaction:

1.  **Input Processing**: The loop begins with a user message or prompt.
2.  **Pre-Inference Hooks**: The `beforeLLM` hook is triggered, allowing for telemetry or prompt modification.
3.  **LLM Inference**: The runner calls the `ChatModel.complete()` (or `StreamingChatModel.stream()`) method.
4.  **Post-Inference Hooks**: The `afterLLM` hook is triggered once the model returns a result.
5.  **Tool Execution Cycle**: If the LLM requests tool calls, the runner enters a sub-loop:
    *   **Permission Check**: Validates the request against the defined `PermissionPolicy`.
    *   **Pre-Tool Hooks**: Triggers the `beforeToolCall` hook.
    *   **Execution**: The tool is executed, typically within a `Sandbox` environment. YAAF supports concurrent tool execution and utilizes a `StreamingToolExecutor` for real-time feedback.
    *   **Post-Tool Hooks**: Triggers the `afterToolCall` hook.
6.  **Feedback**: The results of the tool executions are appended to the message history and sent back to the LLM.
7.  **Termination**: The loop repeats until the LLM provides a final text response instead of further tool calls.

The loop includes built-in support for input validation, tool result budgeting (to prevent context window overflow), and retry logic via `withRetry`.

## Configuration
Developers configure the Agent Loop by instantiating an `AgentRunner` with a specific model, a set of tools, and optional configurations like system prompts or retry logic.

```typescript
import { AgentRunner } from 'yaaf/agents/runner';
import { OpenAIChatModel } from 'yaaf/providers/openai';

const runner = new AgentRunner({
  model: new OpenAIChatModel({ apiKey: '...' }),
  tools: [grepTool, readTool, writeTool],
  systemPrompt: 'You are a helpful coding assistant.',
});

// Standard execution
const response = await runner.run('Find all TODO comments');

// Streaming execution for progressive UI updates
for await (const event of runner.runStream('Find all TODO comments')) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.content);
  }
}
```

The loop behavior can be further customized by providing implementations for `Hooks`, `AccessPolicy`, or a `ContextManager` to handle complex conversation states.

## See Also
* [[ChatModel]]
* [[AgentRunner]]
* [[Tool]]
* [[Sandbox]]