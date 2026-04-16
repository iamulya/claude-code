---
summary: An async generator function that transforms internal RunnerStreamEvents into simplified RuntimeStreamEvents.
export_name: adaptStream
source_file: src/runtime/adapter.ts
category: function
title: adaptStream
entity_type: api
stub: false
compiled_at: 2026-04-16T14:32:40.968Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/adapter.ts
confidence: 0.98
---

## Overview
`adaptStream` is a utility function designed to bridge the gap between the internal execution events of an agent and the simplified event format required by runtime harnesses. 

The YAAF `AgentRunner` yields detailed `RunnerStreamEvent` objects containing internal metadata such as iteration counts, LLM request/response payloads, and tool execution results. While useful for debugging, these are often too verbose for consumer-facing interfaces. `adaptStream` filters out these internal-only events and maps the remaining stream to `RuntimeStreamEvent` objects, which are compatible with runtimes like `createCLI`, `createServer`, and `createWorker`.

## Signature / Constructor

```typescript
export async function* adaptStream(
  source: AsyncIterable<RunnerStreamEvent>,
): AsyncGenerator<RuntimeStreamEvent, void, undefined>
```

### Parameters
- `source`: An `AsyncIterable` of `RunnerStreamEvent` objects, typically produced by calling `agent.runStream()`.

### Return Value
Returns an `AsyncGenerator` that yields `RuntimeStreamEvent` objects.

## Types

### RuntimeStreamEvent
The simplified event type accepted by runtime harnesses. It strips internal details and provides a clean consumer-facing interface. According to the source documentation, this includes:
- `text_delta`: Incremental text updates from the LLM.
- `tool_call_start`: Notification that a tool has begun execution.
- `tool_call_end`: Notification that a tool has finished execution.
- `error`: Error details if the run fails.
- `done`: Signal that the stream has completed.

## Examples

### Adapting a Single Stream
This example demonstrates manually adapting an agent's stream for custom processing.

```typescript
import { Agent, adaptStream } from 'yaaf';

const agent = new Agent({ /* ... */ });

// Adapt a single stream for manual consumption
for await (const event of adaptStream(agent.runStream('Hello'))) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.text);
  }
}
```

### Using with Runtime Harnesses
While `adaptStream` can be used directly, it is often used implicitly via `toStreamableAgent` when passing an agent to a runtime.

```typescript
import { Agent, adaptStream, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({ /* ... */ });

// Option: Wrap the entire agent to make it compatible with CLI runtime
createCLI(toStreamableAgent(agent), { streaming: true });
```

## See Also
- `toStreamableAgent`: A higher-level utility that wraps an entire Agent instance using `adaptStream`.
- `RunnerStreamEvent`: The internal event type produced by the agent runner.