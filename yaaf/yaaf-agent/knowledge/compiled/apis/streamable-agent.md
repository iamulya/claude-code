---
title: StreamableAgent
entity_type: api
summary: The interface expected by runtime harnesses for agents that can stream events.
export_name: StreamableAgent
source_file: src/runtime/adapter.ts
category: type
search_terms:
 - agent streaming interface
 - runtime agent contract
 - how to use createCLI
 - how to use createServer
 - agent stream adapter
 - RuntimeStreamEvent
 - runStream method
 - YAAF runtime harness
 - connect agent to CLI
 - what is a streamable agent
 - agent event stream
 - toStreamableAgent function
stub: false
compiled_at: 2026-04-24T17:41:04.493Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`StreamableAgent` is a TypeScript type that defines a standardized interface for agents that support [Streaming](../concepts/streaming.md) responses [Source 2]. This interface serves as the common contract expected by YAAF's runtime harnesses, such as `createCLI`, `createServer`, and `createWorker` [Source 2].

The primary purpose of `StreamableAgent` is to provide a consistent way for runtimes to interact with agents, whether they are consuming a complete response at once or handling a stream of events. It abstracts away the agent's detailed internal event types (like `RunnerStreamEvent`) and exposes a simplified, consumer-facing set of events (`RuntimeStreamEvent`) [Source 2].

Developers typically do not implement this interface manually. Instead, they use the `toStreamableAgent` utility function to wrap a standard YAAF `Agent` instance, making it compatible with any runtime that requires a `StreamableAgent` [Source 1, Source 2].

## Signature

The `StreamableAgent` type is defined as an object with two methods: `run` and `runStream` [Source 2].

```typescript
export type StreamableAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>;
  runStream(input: string, signal?: AbortSignal): AsyncIterable<RuntimeStreamEvent>;
};
```

## Methods & Properties

`StreamableAgent` defines the following methods:

### run

Executes the agent for a single turn and returns the final, complete response. This method is for non-streaming interactions [Source 2].

**Signature:**
`run(input: string, signal?: AbortSignal): Promise<string>`

*   **`input`**: `string` - The user's input to the agent.
*   **`signal`**: `AbortSignal` (optional) - A signal to cancel the agent's execution.
*   **Returns**: `Promise<string>` - A promise that resolves with the agent's final text response.

### runStream

Executes the agent and returns an asynchronous iterable that yields events as they occur during the agent's execution [Source 2]. This is the core method for streaming functionality.

**Signature:**
`runStream(input: string, signal?: AbortSignal): AsyncIterable<RuntimeStreamEvent>`

*   **`input`**: `string` - The user's input to the agent.
*   **`signal`**: `AbortSignal` (optional) - A signal to cancel the agent's execution.
*   **Returns**: `AsyncIterable<RuntimeStreamEvent>` - An async iterable that yields `RuntimeStreamEvent` objects. Events include `text_delta`, `tool_call_start`, `tool_call_end`, `usage`, and `done` [Source 1].

## Examples

The most common use case is to adapt a standard `Agent` using `toStreamableAgent` and pass it to a runtime harness like `createCLI` [Source 1, Source 2].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

// 1. Create a standard YAAF Agent
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  // tools: [myTool],
});

// 2. Adapt the agent to the StreamableAgent interface
const streamableAgent: StreamableAgent = toStreamableAgent(agent);

// 3. Pass the adapted agent to a runtime harness
createCLI(streamableAgent, {
  name: 'my-assistant',
  greeting: '👋 Hello! How can I help?',
  streaming: true,
});
```

## See Also

*   `toStreamableAgent`: The utility function used to convert a standard `Agent` into a `StreamableAgent`.
*   `RuntimeStreamEvent`: The simplified event type yielded by the `runStream` method.
*   `createCLI`: A runtime harness that consumes a `StreamableAgent` to create a command-line interface.

## Sources

*   [Source 1]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md`
*   [Source 2]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts`