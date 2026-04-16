---
summary: Bridges internal agent execution events to simplified runtime-facing events for CLI, server, and worker environments.
primary_files:
  - src/runtime/adapter.ts
title: Runtime Adapter
entity_type: subsystem
exports:
  - adaptStream
  - toStreamableAgent
  - RuntimeStreamEvent
  - StreamableAgent
stub: false
compiled_at: 2026-04-16T14:32:37.275Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/adapter.ts
confidence: 0.95
---

## Purpose
The Runtime Adapter subsystem serves as a translation layer between the internal execution logic of the YAAF framework and external runtime environments. While the core execution engine (AgentRunner) produces granular events containing internal metadata—such as iteration counts, raw LLM request/response data, and tool execution details—these are often too verbose for end-user interfaces.

The adapter solves this by mapping complex internal `RunnerStreamEvent` objects into simplified `RuntimeStreamEvent` objects. This allows YAAF agents to be consumed by various runtime harnesses, including Command Line Interfaces (CLI), web servers, and worker threads, without requiring those harnesses to understand the framework's internal state transitions.

## Architecture
The subsystem is built around a transformation pipeline that filters and maps asynchronous event streams.

### Event Mapping
The adapter distinguishes between two primary event categories:
*   **RunnerStreamEvent**: Detailed events yielded by the internal runner, including `text_delta`, `tool_call_start`, `tool_call_result`, `llm_request`, and `iteration`.
*   **RuntimeStreamEvent**: A simplified set of events intended for consumer-facing interfaces, including `text_delta`, `tool_call_start`, `tool_call_end`, `error`, and `done`.

The adapter explicitly strips internal-only details, such as iteration counts and LLM request metadata, to provide a clean interface for the runtime.

### StreamableAgent Interface
To ensure compatibility across different runtimes, the subsystem defines the `StreamableAgent` interface. This interface acts as a contract that any agent-like object must satisfy to be used with YAAF runtime harnesses (such as `createCLI`, `createServer`, or `createWorker`).

```typescript
export type StreamableAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>
  runStream(input: string, signal?: AbortSignal): AsyncIterable<RuntimeStreamEvent>
}
```

## Integration Points
The Runtime Adapter sits between the **Agent** subsystem and the **Runtime Harnesses**:
*   **Input**: It accepts an `Agent` instance or a raw `AsyncIterable<RunnerStreamEvent>`.
*   **Output**: It produces a `StreamableAgent` or an `AsyncGenerator<RuntimeStreamEvent>`.
*   **Consumers**: The output is typically passed to `createCLI`, `createServer`, or `createWorker`.

## Key APIs

### adaptStream
An async generator function that transforms a stream of internal runner events into simplified runtime events. It filters out internal metadata and maps the remaining data to the `RuntimeStreamEvent` format.

### toStreamableAgent
A utility function that wraps a standard YAAF `Agent` instance. It returns a `StreamableAgent` object where the `runStream` method automatically applies `adaptStream` to the agent's internal output.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({ /* config */ });

// Wrap the agent for use in a CLI runtime
createCLI(toStreamableAgent(agent), { streaming: true });
```

## Sources
* `src/runtime/adapter.ts`