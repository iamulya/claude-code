---
title: ChatModel
entity_type: api
summary: Interface for LLM providers to implement OpenAI-compatible tool calling and message exchange.
export_name: ChatModel
source_file: src/agents/runner.ts
category: interface
stub: false
compiled_at: 2026-04-16T14:13:58.336Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/runner.ts
confidence: 0.95
---

## Overview
`ChatModel` is the primary abstraction for Large Language Model (LLM) providers within the YAAF framework. It defines a standardized, OpenAI-compatible interface for message exchange and tool calling. By implementing this interface, developers can integrate various LLM backends—such as OpenAI, Google Gemini, Ollama, or Groq—into the framework's agentic workflows.

The interface is designed to be LLM-agnostic, allowing the `AgentRunner` to interact with any provider that can process a list of messages and return either text or tool execution requests.

## Signature / Constructor

### Interface Definition
```typescript
export interface ChatModel {
  /** Optional model identifier — propagated to OTel spans */
  readonly model?: string

  complete(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): Promise<ChatResult>
}
```

### Supporting Types
The interface relies on several standardized types for message and tool definitions:

```typescript
export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string }

export type ToolCall = {
  id: string
  name: string
  arguments: string // JSON string
}

export type ToolSchema = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}
```

## Methods & Properties

| Name | Type | Description |
| :--- | :--- | :--- |
| `model` | `readonly string` (optional) | An optional identifier for the specific model version (e.g., "gpt-4o"). This is used for observability and OpenTelemetry (OTel) tracing. |
| `complete` | `Method` | The core execution method. It accepts an array of messages and optional tool schemas, returning a promise that resolves to a `ChatResult`. |

## Examples

### Implementing a Custom Provider
This conceptual example shows how one might wrap a provider to satisfy the `ChatModel` interface.

```typescript
import { ChatModel, ChatMessage, ToolSchema, ChatResult } from 'yaaf';

class MyCustomProvider implements ChatModel {
  readonly model = 'my-llm-v1';

  async complete(params: {
    messages: ChatMessage[];
    tools?: ToolSchema[];
  }): Promise<ChatResult> {
    // Implementation logic to call the specific LLM API
    // and map the response back to the ChatResult format.
    const response = await fetch('https://api.myprovider.ai/v1/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    return response.json();
  }
}
```

### Usage with AgentRunner
The `ChatModel` is typically passed into an `AgentRunner` to drive the agent loop.

```typescript
const runner = new AgentRunner({
  model: new MyCustomProvider(),
  tools: [grepTool, readTool],
  systemPrompt: 'You are a helpful coding assistant.',
});

const response = await runner.run('Find all TODO comments');
```

## See Also
- `StreamingChatModel` — An extension of this interface for models supporting real-time delta updates.
- `AgentRunner` — The execution loop that utilizes `ChatModel` to process agent tasks.