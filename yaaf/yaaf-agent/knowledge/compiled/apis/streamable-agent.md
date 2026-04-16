---
summary: An interface defining the shape of an agent that can be consumed by YAAF runtime harnesses.
export_name: StreamableAgent
source_file: src/runtime/adapter.ts
category: type
title: StreamableAgent
entity_type: api
stub: false
compiled_at: 2026-04-16T14:32:49.546Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/adapter.ts
confidence: 0.98
---

## Overview
`StreamableAgent` is a TypeScript type definition that describes the standard interface for agents compatible with YAAF runtime harnesses, such as the CLI, Server, and Worker runtimes. 

While the internal `Agent` class produces complex, low-level events (including iteration counts and LLM request metadata), runtime harnesses require a simplified event stream. `StreamableAgent` ensures that an agent provides a consistent `run` and `runStream` signature using `RuntimeStreamEvent` objects, which are optimized for consumer-facing displays and API responses.

## Signature / Constructor

```typescript
export type StreamableAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>
  runStream(input: string, signal?: AbortSignal): AsyncIterable<RuntimeStreamEvent>
}
```

## Methods & Properties

### run()
Executes the agent with the provided input and returns the final aggregated text response.
- **Parameters**:
  - `input`: The string prompt or message to process.
  - `signal` (optional): An `AbortSignal` to cancel the execution.
- **Returns**: `Promise<string>`

### runStream()
Executes the agent and yields a stream of simplified runtime events.
- **Parameters**:
  - `input`: The string prompt or message to process.
  - `signal` (optional): An `AbortSignal` to cancel the execution.
- **Returns**: `AsyncIterable<RuntimeStreamEvent>`

## Events
The `runStream` method yields `RuntimeStreamEvent` objects. These events are simplified versions of internal runner events and typically include:

| Event Type | Description |
| :--- | :--- |
| `text_delta` | Contains a chunk of generated text. |
| `tool_call_start` | Indicates a tool has started execution. |
| `tool_call_end` | Indicates a tool has finished execution. |
| `error` | Communicates an execution error. |
| `done` | Signals the completion of the stream. |

## Examples

### Using with a Runtime Harness
Standard YAAF agents can be converted to the `StreamableAgent` interface using the `toStreamableAgent` utility to make them compatible with runtimes like the CLI.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

// Convert the standard Agent to a StreamableAgent
const streamable = toStreamableAgent(agent);

// Pass the streamable agent to a runtime harness
createCLI(streamable, {
  name: 'my-assistant',
  streaming: true,
});
```

### Manual Stream Consumption
You can consume the `runStream` method directly to handle simplified events.

```typescript
async function consumeAgent(agent: StreamableAgent) {
  const stream = agent.runStream("Explain quantum physics.");
  
  for await (const event of stream) {
    if (event.type === 'text_delta') {
      process.stdout.write(event.text);
    }
  }
}
```

## See Also
- `RuntimeStreamEvent`
- `toStreamableAgent`
- `adaptStream`