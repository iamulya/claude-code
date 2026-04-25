---
summary: A core pattern in YAAF for bridging internal agent event streams to simplified, consumer-facing runtime event streams.
title: Stream Adapter
entity_type: concept
related_subsystems:
 - runtime
 - agents
search_terms:
 - bridging agent events
 - runtime event stream
 - RunnerStreamEvent to RuntimeStreamEvent
 - how to use agent with createCLI
 - what is adaptStream
 - what is toStreamableAgent
 - agent stream compatibility
 - YAAF event mapping
 - internal vs external events
 - simplify agent output stream
 - connect agent to runtime
 - streamable agent interface
stub: false
compiled_at: 2026-04-24T18:02:38.365Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The Stream Adapter is a design pattern in YAAF that translates the detailed, internal event stream produced by an agent's core execution logic into a simplified, public-facing event stream suitable for runtime consumers [Source 1].

YAAF's internal `AgentRunner` emits a rich set of events known as `RunnerStreamEvent`. These include detailed operational data such as `text_delta`, `tool_call_start`, `tool_call_result`, `llm_request`, and `iteration` counts. While this level of detail is valuable for the framework's internal workings and advanced debugging, it is overly complex for typical end-user applications [Source 1].

Runtime harnesses, such as `createCLI`, `createServer`, and `createWorker`, are designed to consume a much simpler stream of events, `RuntimeStreamEvent`. This public-facing stream typically includes only events relevant to the consumer, like `text_delta`, `tool_call_start`, `tool_call_end`, `error`, and `done` [Source 1].

The Stream Adapter pattern solves this impedance mismatch. It acts as a bridge, allowing a standard YAAF `Agent` to be used directly with any runtime harness without requiring the developer to manually filter or transform the event stream [Source 1].

## How It Works in YAAF

The Stream Adapter pattern is implemented in YAAF through two primary exports: the `adaptStream` function and the `toStreamableAgent` wrapper function [Source 1].

### `adaptStream`

`adaptStream` is an asynchronous generator function that performs the core translation logic. It accepts an `AsyncIterable` of `RunnerStreamEvent` (the internal stream from an agent run) as input. It then iterates over this source stream, performing two key actions [Source 1]:

1.  **Filtering**: It filters out events that are considered internal-only, such as `iteration`, `llm_request`, and `llm_response`.
2.  **Mapping**: It maps the remaining events to the simplified `RuntimeStreamEvent` format.

The function yields a new `AsyncGenerator` that produces the clean, consumer-facing `RuntimeStreamEvent` objects [Source 1].

### `toStreamableAgent`

`toStreamableAgent` is a higher-level convenience function that wraps an entire YAAF `Agent` instance. It returns a new object that conforms to the `StreamableAgent` interface, which is the standard interface expected by all YAAF runtime harnesses [Source 1].

The `StreamableAgent` interface defines `run` and `runStream` methods. The `runStream` method on the wrapped agent automatically pipes the output of the original agent's `runStream` through the `adaptStream` function. This makes the agent directly compatible with runtimes like `createCLI` [Source 1].

## Configuration

A developer can apply the Stream Adapter pattern in two primary ways, depending on their needs.

**1. Wrapping the Entire Agent**

To make a standard `Agent` compatible with a runtime harness, use the `toStreamableAgent` function. This is the most common use case [Source 1].

```typescript
import { Agent } from 'yaaf';
import { toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  // ... other agent configuration
});

// The agent is wrapped to make its stream compatible with createCLI.
createCLI(toStreamableAgent(agent), {
  name: 'my-assistant',
  streaming: true,
});
```

**2. Adapting a Single Stream**

For more granular control or custom stream processing, a developer can use `adaptStream` directly on the result of an agent's `runStream` call [Source 1].

```typescript
import { Agent } from 'yaaf';
import { adaptStream } from 'yaaf';

const agent = new Agent({ /* ... */ });
const agentStream = agent.runStream('Hello, world!');

// The raw agent stream is adapted to the simplified runtime format.
for await (const event of adaptStream(agentStream)) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.text);
  }
}
```

## Sources

[Source 1] src/runtime/adapter.ts