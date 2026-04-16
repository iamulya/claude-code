---
title: AgentRunner
entity_type: api
summary: The core class driving the LLM ↔ Tool execution loop, handling message flow, tool parsing, and execution.
export_name: AgentRunner
source_file: src/agents/runner.ts
category: class
stub: false
compiled_at: 2026-04-16T14:13:53.724Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/runner.ts
confidence: 0.98
---

## Overview
`AgentRunner` is the central execution engine of the YAAF framework. It implements a generic agent loop that manages the interaction between a Large Language Model (LLM) and a set of tools. The runner handles the complexities of sending messages, parsing tool call requests from the LLM, executing those tools (potentially concurrently), feeding results back into the conversation history, and repeating the process until a final response is generated.

The class is designed to be provider-agnostic, working with any LLM that implements the `ChatModel` or `StreamingChatModel` interfaces. It supports advanced production features including:
- **Streaming**: Progressive UI updates via async generators.
- **Concurrent Execution**: Running multiple tool calls in parallel.
- **Safety and Governance**: Integration with permission policies, access control, and sandboxed execution.
- **Observability**: Hooks for lifecycle events and OpenTelemetry (OTel) propagation.
- **Resilience**: Support for retry configurations and tool result budgeting.

## Signature / Constructor

```typescript
export class AgentRunner {
  constructor(config: {
    model: ChatModel | StreamingChatModel;
    tools: Tool[];
    systemPrompt?: string;
    hooks?: Hooks;
    permissionPolicy?: PermissionPolicy;
    accessPolicy?: AccessPolicy;
    userContext?: UserContext;
    sandbox?: Sandbox;
    retryConfig?: RetryConfig;
    toolResultBudget?: ToolResultBudgetConfig;
    contextManager?: ContextManager;
  })
}
```

### Supporting Interfaces

#### ChatModel
The primary interface for LLM providers.
```typescript
export interface ChatModel {
  readonly model?: string;
  complete(params: {
    messages: ChatMessage[];
    tools?: ToolSchema[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): Promise<ChatResult>;
}
```

#### StreamingChatModel
An extension of `ChatModel` for providers that support real-time delta updates.
```typescript
export interface StreamingChatModel extends ChatModel {
  stream(params: {
    messages: ChatMessage[];
    tools?: ToolSchema[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): AsyncGenerator<ChatDelta, void, undefined>;
}
```

## Methods & Properties

### run()
Executes a full agent loop and returns the final consolidated response.
- **Parameters**: `input: string` (The user prompt or message).
- **Returns**: `Promise<string>` (The final text response from the agent).

### runStream()
Executes the agent loop and yields events as they occur, allowing for progressive rendering of text and tool execution status.
- **Parameters**: `input: string`.
- **Returns**: `AsyncGenerator<AgentEvent>` (A stream of events such as `text_delta` or tool execution updates).

## Events
When using `runStream`, the runner emits various event types to track the internal lifecycle:
- `text_delta`: Partial text content from the LLM.
- `tool_call`: Notification that a tool has been invoked.
- `tool_result`: The output of a tool execution.
- `error`: Encountered during the LLM or tool execution phase.

## Examples

### Basic Usage
This example demonstrates initializing a runner with an OpenAI model and a set of tools to perform a coding task.

```typescript
import { AgentRunner } from 'yaaf';
import { OpenAIChatModel } from 'yaaf/providers/openai';
import { grepTool, readTool, writeTool } from './my-tools';

const runner = new AgentRunner({
  model: new OpenAIChatModel({ apiKey: process.env.OPENAI_API_KEY }),
  tools: [grepTool, readTool, writeTool],
  systemPrompt: 'You are a helpful coding assistant.',
});

const response = await runner.run('Find all TODO comments in the src directory');
console.log(response);
```

### Streaming Response
For interactive applications, `runStream` allows the UI to display text as it is generated.

```typescript
const runner = new AgentRunner({
  model: new OpenAIChatModel({ apiKey: '...' }),
  tools: [searchTool],
});

for await (const event of runner.runStream('What is the current weather in London?')) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.content);
  } else if (event.type === 'tool_call') {
    console.log(`\n[Executing tool: ${event.name}]`);
  }
}
```

## See Also
- `ChatModel`: The interface for implementing custom LLM providers.
- `Tool`: The interface for defining executable functions for the agent.
- `Sandbox`: The environment where tools are executed for safety.