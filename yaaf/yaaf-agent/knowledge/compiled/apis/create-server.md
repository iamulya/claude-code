---
title: createServer
entity_type: api
summary: Wraps a YAAF agent in a production-ready HTTP server with support for streaming and standard endpoints.
export_name: createServer
source_file: src/runtime/server.ts
category: function
stub: false
compiled_at: 2026-04-16T14:11:18.207Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/server-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/server.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/server.ts
confidence: 1
---

## Overview
`createServer` is a utility function used to deploy a YAAF agent as a production-ready HTTP API. It provides a set of standardized endpoints for synchronous chat, Server-Sent Events (SSE) streaming, health monitoring, and metadata inspection. 

The server is built using Node.js's native `http` module, ensuring zero external dependencies. It includes built-in support for CORS, basic rate limiting, request body size limits, and graceful shutdown. It also optionally serves a "Dev UI"—a web-based chat interface for local testing.

## Signature / Constructor

```typescript
function createServer(agent: any, config?: ServerConfig): ServerHandle;
```

### Parameters
- `agent`: The YAAF agent instance to wrap. For streaming support, this should typically be passed through `toStreamableAgent`.
- `config`: An optional [[ServerConfig]] object to customize network settings, security, and lifecycle hooks.

### ServerConfig
| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `port` | `number` | `3000` | The port to listen on. |
| `host` | `string` | `'0.0.0.0'` | The bind address. |
| `cors` | `boolean` | `true` | Whether to enable CORS headers. |
| `corsOrigin` | `string` | `'*'` | Allowed origins for CORS. |
| `name` | `string` | `'yaaf-agent'` | Agent name shown in the `/info` endpoint. |
| `version` | `string` | `'0.1.0'` | Agent version shown in the `/info` endpoint. |
| `maxBodySize` | `number` | `1048576` | Max request body size in bytes (default 1MB). |
| `rateLimit` | `number` | `60` | Max requests per minute per IP address. |
| `timeout` | `number` | `120000` | Request timeout in milliseconds. |
| `devUi` | `boolean` | `false` | If true, serves a chat interface at `GET /`. |
| `multiTurn` | `boolean` | `false` | If true, accepts a `history` array in request bodies. |
| `beforeRun` | `Function` | - | Hook to modify input before the agent processes it. |
| `afterRun` | `Function` | - | Hook to perform actions after the agent responds. |
| `routes` | `Record` | - | Custom route handlers for additional endpoints. |
| `onStart` | `Function` | - | Callback triggered when the server starts listening. |

## Methods & Properties
The function returns a `ServerHandle` object:

- `close()`: `() => Promise<void>` — Initiates a graceful shutdown of the server.
- `port`: `number` — The port the server is currently listening on.
- `url`: `string` — The base URL of the running server.

## Endpoints

### POST /chat
Standard JSON endpoint for request/response interaction.
- **Request Body**: `{"message": string, "history"?: Array}`
- **Response**: `{"response": string}`

### POST /chat/stream
Server-Sent Events (SSE) endpoint for real-time streaming.
- **Request Body**: `{"message": string, "history"?: Array}`
- **Events**: Emits `text_delta`, `tool_call_start`, `tool_call_result`, and `done` events.

### GET /health
Returns the server status, uptime, and total request count.

### GET /info
Returns metadata about the agent, including its name, version, supported endpoints, and model identifier (if configured).

## Examples

### Basic Usage
```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

const server = createServer(toStreamableAgent(agent), {
  port: 3000,
  devUi: true
});

console.log(`Server running at ${server.url}`);
```

### Advanced Configuration with Hooks
```typescript
const server = createServer(agent, {
  port: 8080,
  name: 'research-agent',
  beforeRun: async (input, req) => {
    const userId = req.headers['x-user-id'];
    return `[User Context: ${userId}] ${input}`;
  },
  routes: {
    '/api/status': (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'operational' }));
    }
  },
  onStart: (port) => {
    console.log(`Agent API active on port ${port}`);
  }
});
```

### Consuming the Stream (Client-side)
```javascript
const response = await fetch('http://localhost:3000/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Explain quantum physics' }),
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

## See Also
- [[ServerConfig]]
- [[ServerHandle]]
- [[RouteHandler]]