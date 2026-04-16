---
title: toStreamableAgent
entity_type: api
summary: Utility function to wrap an Agent instance for streaming-compatible runtimes.
export_name: toStreamableAgent
source_file: src/agent.ts
category: function
stub: false
compiled_at: 2026-04-16T14:05:42.467Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/cli-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/server-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/worker-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/adapter.ts
confidence: 1
---

## Overview
`toStreamableAgent` is a utility function that adapts a standard YAAF `Agent` instance into a `StreamableAgent` compatible with production runtimes. 

The core `Agent` class yields detailed internal events (such as `iteration` counts and `llm_request` metadata) via its `runStream` method. However, production-grade runtimes—including the CLI, Server, and Worker runtimes—expect a simplified, consumer-facing event stream. `toStreamableAgent` bridges this gap by filtering out internal-only events and mapping the remaining data to the `RuntimeStreamEvent` format.

## Signature / Constructor

```typescript
function toStreamableAgent(agent: Agent): StreamableAgent
```

### StreamableAgent Interface
The function returns an object implementing the `StreamableAgent` interface:

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `run` | `input: string`, `signal?: AbortSignal` | `Promise<string>` | Executes the agent and returns the final text response. |
| `runStream` | `input: string`, `signal?: AbortSignal` | `AsyncIterable<RuntimeStreamEvent>` | Executes the agent and yields simplified runtime events. |

## Events
The `runStream` method of the adapted agent yields `RuntimeStreamEvent` objects. These events provide a clean interface for UI and API consumers:

| Event Type | Payload Fields | Description |
|:---|:---|:---|
| `text_delta` | `text: string` | A token chunk or text fragment from the LLM. |
| `tool_call_start` | `toolName: string`, `args?: any` | Indicates a tool execution has begun. |
| `tool_call_end` | `toolName: string`, `durationMs?: number`, `error?: any` | Indicates a tool execution has completed. |
| `tool_blocked` | `toolName: string`, `reason: string` | Indicates a tool execution was denied (e.g., by security policy). |
| `usage` | `promptTokens: number`, `completionTokens: number`, `totalCalls: number` | Provides token usage and call statistics. |
| `done` | `text: string` | Indicates the stream is complete and provides the full final response. |

## Examples

### Using with the CLI Runtime
The CLI runtime requires a `StreamableAgent` to handle live re-rendering and tool spinners.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [searchTool],
});

// Wrap the agent before passing it to the runtime harness
createCLI(toStreamableAgent(agent), {
  name: 'my-assistant',
  streaming: true,
});
```

### Using with the Server Runtime
The server runtime uses the adapted agent to power both standard JSON and SSE (Server-Sent Events) endpoints.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are an API assistant.',
});

const server = createServer(toStreamableAgent(agent), {
  port: 3000,
});
```

### Manual Stream Adaptation
You can also use the underlying `adaptStream` logic to transform a single stream manually.

```typescript
import { Agent, adaptStream } from 'yaaf';

const agent = new Agent({ ... });

// Manually adapt a single execution stream
for await (const event of adaptStream(agent.runStream('Hello'))) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.text);
  }
}
```

## See Also
- [[Agent]]
- [[createCLI]]
- [[createServer]]
- [[createWorker]]