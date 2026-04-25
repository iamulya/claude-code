---
summary: The YAAF Runtime subsystem provides mechanisms and adapters for deploying and interacting with LLM-powered agents across various execution environments like CLI, server, and worker.
primary_files:
 - src/runtime/adapter.ts
title: Runtime
entity_type: subsystem
exports:
 - RuntimeStreamEvent
 - adaptStream
 - StreamableAgent
 - toStreamableAgent
search_terms:
 - agent execution environment
 - how to run an agent
 - CLI agent
 - server agent
 - worker agent
 - stream adapter
 - RunnerStreamEvent to RuntimeStreamEvent
 - deploying YAAF agents
 - runtime harness
 - StreamableAgent interface
 - connecting agent to CLI
 - adapting agent output
stub: false
compiled_at: 2026-04-25T00:30:31.303Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Runtime subsystem serves as a crucial bridge between the detailed, internal event stream produced by an [Agent](../apis/agent.md)'s core execution logic and the simplified event stream expected by various runtime environments [Source 1].

The core `AgentRunner` yields a rich set of internal events (`RunnerStreamEvent`), including `text_delta`, `tool_call_start`, `tool_call_result`, `llm_request`, and `iteration`. While useful for debugging and internal orchestration, these events contain details that are unnecessary for end-user-facing applications like a command-line interface or a web server [Source 1].

This subsystem solves the problem by providing an adapter layer that translates the internal `RunnerStreamEvent` into a cleaner, consumer-facing `RuntimeStreamEvent`. This allows a standard YAAF [Agent](../apis/agent.md) to be seamlessly used with any of the provided runtime harnesses (e.g., [CLI Runtime](./cli-runtime.md), [Server Runtime](./server-runtime.md), [Worker Runtime](./worker-runtime.md)) without requiring manual event handling or conversion logic from the developer [Source 1].

## Architecture

The subsystem employs an adapter pattern to decouple the agent's internal workings from its external presentation in different environments. The main components are:

- **`RunnerStreamEvent`**: The detailed event type emitted by the internal `AgentRunner`. This is the "source" event type that the adapter consumes [Source 1].
- **`[[RuntimeStreamEvent]]`**: A simplified, public-facing event type designed for runtime consumers. It strips away internal details like iteration counts and LLM metadata, providing a clean interface with events such as `text_delta`, `tool_call_start`, `tool_call_end`, `error`, and `done` [Source 1].
- **`[[adaptStream]]`**: An asynchronous generator function that performs the core translation. It takes an `AsyncIterable<RunnerStreamEvent>` and yields an `AsyncGenerator<RuntimeStreamEvent>`, filtering out internal-only events and mapping the rest to the simplified format [Source 1].
- **`[[StreamableAgent]]`**: An interface that defines the contract expected by runtime harnesses like [createCLI](../apis/create-cli.md), [createServer](../apis/create-server.md), and [createWorker](../apis/create-worker.md). It specifies `run` and `runStream` methods, where `runStream` must yield `RuntimeStreamEvent` [Source 1].
- **`[[toStreamableAgent]]`**: A high-level wrapper function that converts a standard YAAF [Agent](../apis/agent.md) into a `[[StreamableAgent]]`. It uses `[[adaptStream]]` internally to wrap the agent's `runStream` method, making the agent directly compatible with all runtime harnesses [Source 1].

## Integration Points

The Runtime subsystem acts as an intermediary layer:

- **Upstream**: It consumes the `RunnerStreamEvent` stream produced by the [Agent Core](./agent-core.md)'s `runStream` method.
- **Downstream**: It produces a `[[StreamableAgent]]` object, which is the expected input for runtime harness factories like [createCLI](../apis/create-cli.md) (from the [CLI Runtime](./cli-runtime.md)), [createServer](../apis/create-server.md) (from the [Server Runtime](./server-runtime.md)), and [createWorker](../apis/create-worker.md) (from the [Worker Runtime](./worker-runtime.md)) [Source 1].

## Key APIs

The primary public APIs provided by this subsystem are for adapting agent outputs for runtime consumption.

- **[adaptStream](../apis/adapt-stream.md)**: A function that takes a raw `RunnerStreamEvent` async iterable from an agent and returns an async generator that yields the simplified `[[RuntimeStreamEvent]]`. This is useful for manual, low-level integration.

  ```typescript
  // Option 2: Adapt a single stream
  for await (const event of adaptStream(agent.runStream('Hello'))) {
    console.log(event);
  }
  ```
  [Source 1]

- **[toStreamableAgent](../apis/to-streamable-agent.md)**: The main convenience function. It wraps an entire [Agent](../apis/agent.md) instance, returning an object that conforms to the `[[StreamableAgent]]` interface, ready to be passed directly to a runtime factory.

  ```typescript
  import { Agent } from 'yaaf';
  import { toStreamableAgent } from 'yaaf';
  import { createCLI } from 'yaaf/cli-runtime';

  const agent = new Agent({
    systemPrompt: 'You are a helpful assistant.',
    tools: myTools,
  });

  createCLI(toStreamableAgent(agent), {
    name: 'my-assistant',
    streaming: true,
  });
  ```
  [Source 1]

- **[RuntimeStreamEvent](../apis/runtime-stream-event.md)**: The simplified event type that runtime consumers will receive from a stream. It includes types like `{ type: "text_delta"; text: string }` [Source 1].

- **[StreamableAgent](../apis/streamable-agent.md)**: The interface defining the contract for a runtime-compatible agent, with `run` and `runStream` methods [Source 1].

## Sources

[Source 1]: src/runtime/adapter.ts