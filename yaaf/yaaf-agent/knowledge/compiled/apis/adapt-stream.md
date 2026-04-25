---
summary: Adapts a RunnerStreamEvent async iterable into a simplified RuntimeStreamEvent async iterable for use with runtime harnesses.
export_name: adaptStream
source_file: src/runtime/adapter.ts
category: function
title: adaptStream
entity_type: api
search_terms:
 - convert agent stream
 - runtime stream events
 - RunnerStreamEvent to RuntimeStreamEvent
 - bridge agent runner to runtime
 - simplify agent events
 - how to use agent with createCLI
 - stream adapter
 - filter internal agent events
 - connect agent to server runtime
 - agent stream compatibility
 - runStream adapter
stub: false
compiled_at: 2026-04-24T16:46:55.317Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `adaptStream` function is a [Stream Adapter](../concepts/stream-adapter.md) that bridges the detailed internal event stream from an `AgentRunner` to the simplified event stream expected by YAAF's runtime harnesses [Source 1].

An agent's `runStream` method yields an async iterable of `RunnerStreamEvent` objects. These events provide a detailed view of the agent's internal execution, including `text_delta`, `tool_call_start`, `tool_call_result`, `llm_request`, and `iteration` events.

Runtime harnesses, such as `createCLI`, `createServer`, and `createWorker`, are designed for consumer-facing applications and expect a simpler `RuntimeStreamEvent` stream. This stream typically includes only events like `text_delta`, `tool_call_start`, `tool_call_end`, `error`, and `done`.

`adaptStream` transforms the `RunnerStreamEvent` stream by filtering out internal-only events (like `iteration`, `llm_request`, `llm_response`) and mapping the remaining events to the simplified `RuntimeStreamEvent` format. This allows a standard YAAF `Agent` to be compatible with any runtime harness [Source 1].

## Signature

```typescript
export async function* adaptStream(
  source: AsyncIterable<RunnerStreamEvent>,
): AsyncGenerator<RuntimeStreamEvent, void, undefined>;
```

### Parameters

- **`source`**: `AsyncIterable<RunnerStreamEvent>`
  - An async iterable that yields detailed internal events from an agent's execution, typically from a call to `agent.runStream()`.

### Returns

- `AsyncGenerator<RuntimeStreamEvent, void, undefined>`
  - An async generator that yields simplified `RuntimeStreamEvent` objects suitable for consumption by runtime harnesses.

### Related Types

The function converts between these two event stream types:

**`RunnerStreamEvent`** (Input)
The detailed internal event stream from an `AgentRunner`.

**`RuntimeStreamEvent`** (Output)
The simplified event stream for runtime consumers. A common definition is:
```typescript
export type RuntimeStreamEvent =
  | { type: "text_delta"; text: string }
  // ... other events like tool_call_start, tool_call_end, error, done
```

## Examples

The following example demonstrates how to use `adaptStream` to manually process the simplified event stream from an agent's execution.

```typescript
import { Agent } from 'yaaf';
import { adaptStream } from 'yaaf';

// Assume 'agent' is an initialized YAAF Agent instance
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  // ... other agent configuration
});

async function processAgentStream(prompt: string) {
  const agentStream = agent.runStream(prompt);
  const runtimeStream = adaptStream(agentStream);

  console.log('--- Start of Runtime Stream ---');
  for await (const event of runtimeStream) {
    // Process simplified, consumer-facing events
    if (event.type === 'text_delta') {
      process.stdout.write(event.text);
    } else {
      console.log(`\nReceived event:`, event);
    }
  }
  console.log('\n--- End of Runtime Stream ---');
}

processAgentStream('Hello, world!');
```
[Source 1]

## See Also

- `toStreamableAgent`: A higher-level utility that wraps an entire `Agent` instance to make it compatible with runtimes, using `adaptStream` internally.
- `createCLI`: A runtime harness for creating command-line interfaces.
- `createServer`: A runtime harness for creating server-based applications.

## Sources

[Source 1]: src/runtime/adapter.ts