---
title: Streaming Responses
entity_type: concept
summary: The pattern of delivering agent responses incrementally using Server-Sent Events (SSE).
related_subsystems:
  - Server Runtime
stub: false
compiled_at: 2026-04-16T14:11:20.352Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/server-runtime.md
confidence: 0.92
---

## What It Is
Streaming Responses is a communication pattern in YAAF that enables the incremental delivery of Large Language Model (LLM) outputs to a client. Instead of waiting for the entire response to be generated—which can introduce significant latency—the framework transmits data chunks as they become available. This is particularly important for maintaining a responsive user experience during long-form text generation or complex tool-use sequences.

YAAF utilizes the Server-Sent Events (SSE) protocol to facilitate this real-time data flow, allowing the server to push updates to the client over a single HTTP connection.

## How It Works in YAAF
In YAAF, streaming is primarily handled by the Server Runtime. When an agent is deployed as a server, it exposes a dedicated endpoint, typically `POST /chat/stream`, which returns a `text/event-stream` response.

### The Streaming Lifecycle
The framework emits several discrete event types during a streaming session, each represented as a JSON object:

- `text_delta`: Contains a fragment of the generated text (e.g., `{"type":"text_delta","text":"Relativity "}`).
- `tool_call_start`: Indicates the agent has initiated a tool execution, providing the `toolName`.
- `tool_call_end`: Indicates the tool execution has completed, providing the `toolName` and the `durationMs`.
- `done`: Signals the completion of the stream and provides the full, concatenated response string.

### Implementation
To enable streaming, a standard `Agent` instance must be transformed using the `toStreamableAgent` utility. This wrapper adapts the agent's internal execution logic to emit the necessary SSE events. The resulting object is then passed to the `createServer` function.

## Configuration
Developers configure streaming by wrapping their agent and mounting it within the YAAF server runtime.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are an API assistant.',
  tools: [searchTool],
});

// Transform the agent to support streaming
const streamableAgent = toStreamableAgent(agent);

const server = createServer(streamableAgent, {
  port: 3000,
});
```

### Client-Side Consumption
Clients consume the stream by reading the response body as a stream and parsing the `data: ` prefixed lines.

```javascript
const response = await fetch('http://localhost:3000/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      if (event.type === 'text_delta') {
        process.stdout.write(event.text);
      }
    }
  }
}
```

## Sources
- Source 1: Server Runtime documentation