---
summary: Manages the execution and streaming of YAAF agents in various runtime environments (CLI, server, worker) by adapting internal agent events into a simplified, consumer-facing format.
primary_files:
 - src/runtime/adapter.ts
title: Runtime Management
entity_type: subsystem
exports:
 - RuntimeStreamEvent
 - adaptStream
 - StreamableAgent
 - toStreamableAgent
search_terms:
 - how to run an agent in CLI
 - create server for agent
 - stream agent output
 - RunnerStreamEvent vs RuntimeStreamEvent
 - adapt agent stream
 - toStreamableAgent function
 - adaptStream function
 - CLI runtime harness
 - server runtime harness
 - worker runtime harness
 - agent execution environment
 - connecting agent to UI
stub: false
compiled_at: 2026-04-24T18:18:44.086Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Runtime Management subsystem serves as a bridge between the detailed internal event stream of an agent's execution and the simplified event stream required by various runtime environments like command-line interfaces (CLIs), servers, or background workers [Source 1].

The core `AgentRunner` in YAAF produces a rich stream of `RunnerStreamEvent`s, which include internal details such as `llm_request`, `iteration` counts, and `tool_call_result`. While useful for debugging and advanced instrumentation, these events are too granular for typical consumer-facing applications [Source 1].

This subsystem solves the problem by providing an adapter layer that filters and transforms the internal `RunnerStreamEvent`s into a stable, public `RuntimeStreamEvent` format. This ensures that runtime harnesses can depend on a consistent, simplified API, decoupling them from the internal workings of the agent execution loop [Source 1].

## Architecture

The subsystem is architected as a "[Stream Adapter](../concepts/stream-adapter.md)" that translates between two distinct event types [Source 1].

- **`RunnerStreamEvent`**: The internal, detailed event type produced by the `AgentRunner`. It includes events for text deltas, tool call lifecycle, [LLM](../concepts/llm.md) requests, and iteration steps.
- **`RuntimeStreamEvent`**: The simplified, public event type consumed by runtime harnesses. It provides a clean interface, stripping away internal details. The primary events include `text_delta`, `tool_call_start`, `tool_call_end`, `error`, and `done` [Source 1].

The key components of this architecture are:

- **`adaptStream` function**: An async generator that takes an `AsyncIterable<RunnerStreamEvent>` as input and yields an `AsyncGenerator<RuntimeStreamEvent>`. It is responsible for filtering out internal-only events and mapping the remaining events to the simplified runtime format [Source 1].
- **`StreamableAgent` interface**: Defines the contract expected by runtime harnesses. An object implementing this interface must have `run` and `runStream` methods, where `runStream` yields the simplified `RuntimeStreamEvent` [Source 1].
- **`toStreamableAgent` function**: A high-level wrapper that takes a standard YAAF `Agent` instance and returns an object conforming to the `StreamableAgent` interface. This function internally uses `adaptStream` to wrap the agent's `runStream` method, making it directly compatible with any YAAF runtime harness [Source 1].

## Integration Points

The Runtime Management subsystem is the primary integration point between the core agent logic and the execution environment.

- **Input**: It consumes the `RunnerStreamEvent` stream produced by the `AgentRunner`.
- **Output**: It produces a `StreamableAgent` object whose `runStream` method yields `RuntimeStreamEvent`s. This output is consumed by runtime harnesses such as `createCLI`, `createServer`, and `createWorker` [Source 1].

## Key APIs

The primary public APIs are designed to facilitate the use of a YAAF `Agent` in different runtime contexts.

- **`toStreamableAgent(agent)`**: The main entry point for developers. This function wraps a YAAF `Agent` to make it compatible with runtime harnesses.

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

- **`adaptStream(source)`**: A lower-level utility that adapts any `RunnerStreamEvent` async iterable into a `RuntimeStreamEvent` async iterable. This can be used for custom runtime [Integrations](./integrations.md).

  ```typescript
  import { Agent } from 'yaaf';
  import { adaptStream } from 'yaaf';

  const agent = new Agent({ ... });

  for await (const event of adaptStream(agent.runStream('Hello'))) {
    console.log(event);
  }
  ```
  [Source 1]

- **`RuntimeStreamEvent`**: The exported type representing the simplified events yielded by an adapted stream.
- **`StreamableAgent`**: The exported type defining the interface required by runtime harnesses.

## Sources

[Source 1]: src/runtime/adapter.ts