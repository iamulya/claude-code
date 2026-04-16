---
summary: How to use the built-in server runtime to expose your agent via HTTP.
title: Deploying an Agent as an API
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:33:10.103Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/server.ts
confidence: 0.9
---

## Overview
YAAF provides a built-in server runtime designed to wrap any agent in a production-ready HTTP API. This runtime uses Node.js's native `http` module, ensuring zero external dependencies while providing essential features like streaming support, CORS, rate limiting, and a development UI.

By the end of this guide, you will have an agent accessible via standard REST endpoints and Server-Sent Events (SSE).

## Prerequisites
- A configured YAAF agent instance.
- Node.js environment.
- Basic understanding of HTTP methods and JSON payloads.

## Step-by-Step

### 1. Initialize the Server
To expose an agent, use the `createServer` function from the `yaaf/server` module. This function accepts an agent instance and a configuration object.

```typescript
import { Agent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  model: 'gpt-4o', // Example model
});

const server = createServer(agent, {
  port: 3000,
  cors: true,
  devUi: true, // Enable the chat interface for local testing
});

console.log(`Agent API running at ${server.url}`);
```

### 2. Interact with the API
The server exposes several standard endpoints:

#### Request/Response (JSON)
Send a `POST` request to `/chat` with a JSON body.

**Request:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, agent!"}'
```

**Response:**
```json
{
  "content": "Hello! How can I assist you today?"
}
```

#### Streaming (SSE)
For real-time token streaming and tool-call updates, use the `/chat/stream` endpoint.

**Request:**
```bash
curl -X POST http://localhost:3000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me a long story."}'
```

The server will emit events of type `text_delta`, `tool_call_start`, `tool_call_result`, and `done`.

### 3. Enable Multi-Turn Conversations
By default, the server treats each request as a standalone interaction. To support conversation history, set `multiTurn: true` in the configuration and provide a `history` array in the request body.

```typescript
const server = createServer(agent, {
  port: 3000,
  multiTurn: true
});
```

**Request with History:**
```json
{
  "message": "What was the first thing I said?",
  "history": [
    { "role": "user", "content": "My name is Alice." },
    { "role": "assistant", "content": "Nice to meet you, Alice!" }
  ]
}
```

### 4. Graceful Shutdown
In production environments, ensure the server closes connections properly when the process terminates.

```typescript
process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
```

## Configuration Reference

The `ServerConfig` object supports the following options:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `port` | `number` | `3000` | Port to listen on. |
| `host` | `string` | `'0.0.0.0'` | Hostname to bind to. |
| `cors` | `boolean` | `true` | Enable CORS headers. |
| `devUi` | `boolean` | `false` | Serve a built-in chat interface at `GET /`. |
| `multiTurn` | `boolean` | `false` | If true, accepts a `history` array in request bodies. |
| `rateLimit` | `number` | `60` | Max requests per minute per IP. |
| `maxBodySize` | `number` | `1MB` | Max request body size in bytes. |
| `timeout` | `number` | `120000` | Request timeout in milliseconds. |
| `systemPrompt`| `string` | `undefined` | If set, exposes the prompt via `GET /info`. |

## Common Mistakes

*   **Missing Multi-Turn Configuration**: Sending a `history` array to a server where `multiTurn` is not explicitly set to `true` will result in the history being ignored.
*   **Port Conflicts**: Attempting to start the server on a port already in use by another process.
*   **Exposing System Prompts**: Setting the `systemPrompt` in `ServerConfig` makes your internal instructions visible via the `/info` endpoint. This should be avoided if the prompt contains sensitive logic or proprietary information.
*   **CORS in Production**: Using the default `corsOrigin: '*'` is convenient for development but should be restricted to specific domains in production for security.

## Next Steps
*   Explore the `/info` endpoint to see agent metadata and model identifiers.
*   Implement `beforeRun` and `afterRun` hooks for custom logging or input sanitization.
*   Add custom routes using the `routes` configuration object to extend the API functionality.

## Sources
- `src/runtime/server.ts`