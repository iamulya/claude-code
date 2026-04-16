---
title: StreamingChatModel
entity_type: api
summary: An extension of ChatModel that supports streaming responses via async generators.
export_name: StreamingChatModel
source_file: src/agents/runner.ts
category: interface
stub: false
compiled_at: 2026-04-16T14:14:02.900Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/runner.ts
confidence: 0.95
---

## Overview
`StreamingChatModel` is a TypeScript interface that extends the base `ChatModel` to support streaming completions. It defines the contract for Large Language Model (LLM) providers that can emit responses incrementally rather than waiting for the entire generation to complete.

This interface is utilized by components like the `AgentRunner` to provide progressive updates, such as real-time text rendering in a user interface or early detection of tool calls. Models implementing this interface must provide both a standard `complete` method and a `stream` method that returns an asynchronous generator.

## Signature / Constructor

```typescript
export interface StreamingChatModel extends ChatModel {
  /**
   * Stream a completion as an async generator of deltas.
   * The caller assembles the full response from the deltas.
   */
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

### stream()
The primary method for initiating a streaming request.
- **Parameters**:
    - `messages`: An array of `ChatMessage` objects representing the conversation history.
    - `tools` (optional): An array of `ToolSchema` objects defining available functions the model can call.
    - `temperature` (optional): Controls the randomness of the output.
    - `maxTokens` (optional): Limits the length of the generated response.
    - `signal` (optional): An `AbortSignal` to cancel the request.
- **Returns**: An `AsyncGenerator` that yields `ChatDelta` objects. The caller is responsible for accumulating these deltas into a final response.

### model (inherited)
- **Type**: `readonly string | undefined`
- **Description**: An optional identifier for the specific model being used (e.g., "gpt-4o"). This is typically propagated to OpenTelemetry spans for observability.

### complete() (inherited)
- **Type**: `(params: ChatParams) => Promise<ChatResult>`
- **Description**: The standard non-streaming completion method required by the base `ChatModel` interface.

## Examples

### Implementing a Streaming Model
This example demonstrates how a provider might implement the `StreamingChatModel` interface.

```typescript
import { StreamingChatModel, ChatMessage, ChatDelta, ChatResult } from 'yaaf';

class MyCustomProvider implements StreamingChatModel {
  readonly model = 'my-custom-model';

  async *stream(params: { messages: ChatMessage[] }): AsyncGenerator<ChatDelta> {
    // Hypothetical implementation yielding chunks
    yield { role: 'assistant', content: 'Hello' };
    yield { content: ' there' };
    yield { content: '!' };
  }

  async complete(params: { messages: ChatMessage[] }): Promise<ChatResult> {
    return {
      role: 'assistant',
      content: 'Hello there!',
    };
  }
}
```

### Consuming a Streaming Model via AgentRunner
The `AgentRunner` can consume a `StreamingChatModel` to provide real-time feedback.

```typescript
const runner = new AgentRunner({
  model: new MyCustomProvider(),
  tools: [],
});

for await (const event of runner.runStream('Hello!')) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.content);
  }
}
```