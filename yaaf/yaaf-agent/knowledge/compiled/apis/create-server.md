---
title: createServer
entity_type: api
summary: A factory function to create an HTTP server that exposes a YAAF agent as a REST and SSE API, handling requests, streaming, and health checks.
export_name: createServer
source_file: src/server/index.ts
category: function
search_terms:
 - expose agent as API
 - HTTP server for agent
 - REST API for LLM
 - Server-Sent Events streaming
 - SSE agent endpoint
 - how to deploy yaaf agent
 - agent health check
 - CORS configuration for agent
 - rate limiting agent API
 - custom routes for agent server
 - yaaf server runtime
 - agent deployment
 - production agent server
 - ship agent as http api
stub: false
compiled_at: 2026-04-24T17:00:03.000Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/server.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `createServer` function is a factory for creating a production-ready HTTP server that exposes a YAAF agent over the network [Source 1]. It is part of the optional [Server Runtime](../subsystems/server-runtime.md) module, which allows developers to ship their agents as standalone services [Source 2].

The server provides a standardized set of endpoints for interacting with the agent, including a JSON-based REST endpoint for simple request-response cycles and a Server-Sent Events (SSE) endpoint for [Streaming](../concepts/streaming.md) responses. It also includes built-in endpoints for health checks and agent information, along with configurable options for security, CORS, and custom routing [Source 1].

This function is the primary entry point for deploying a YAAF agent as a web service, suitable for production environments like Docker containers or cloud platforms [Source 1].

## Signature

```typescript
createServer(agent: StreamableAgent, config?: ServerConfig): ServerInstance
```

### Parameters

*   **`agent`** `StreamableAgent`: An instance of a YAAF agent that supports streaming. A standard `Agent` can be converted using the `toStreamableAgent` utility [Source 1].
*   **`config`** `ServerConfig` (optional): A configuration object to customize the server's behavior [Source 1].

### Configuration (`ServerConfig`)

The `config` object accepts the following properties [Source 1]:

| Option | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | `3000` | The network port the server will listen on. |
| `host` | `string` | `'0.0.0.0'` | The network address to bind to. |
| `timeout` | `number` | `120000` | Request timeout in milliseconds. |
| `name` | `string` | `'yaaf-agent'` | The agent's name, exposed via the `/info` endpoint. |
| `version` | `string` | `'0.1.0'` | The agent's version, exposed via the `/info` endpoint. |
| `cors` | `boolean` | `true` | Enables or disables Cross-Origin Resource Sharing (CORS) headers. |
| `corsOrigin` | `string` | `'*'` | The value for the `Access-Control-Allow-Origin` header. |
| `maxBodySize` | `number` | `1048576` (1MB) | The maximum allowed size for a request body in bytes. |
| `rateLimit` | `number` | `60` | The maximum number of requests allowed per minute per IP address. |
| `beforeRun` | `(input: string, req: http.IncomingMessage) => Promise<string> \| string` | `undefined` | A hook to pre-process the input message before it's sent to the agent. Can be used to inject context from request headers. |
| `afterRun` | `(input: string, response: any, req: http.IncomingMessage) => Promise<void> \| void` | `undefined` | A hook that runs after the agent has processed the request. Useful for logging or analytics. |
| `routes` | `Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => void>` | `undefined` | A map of custom route paths to handler functions, allowing for the extension of the server's API. |
| `onStart` | `(port: number) => void` | `undefined` | A callback function that is executed once the server has successfully started. |

### Return Value (`ServerInstance`)

The function returns a `ServerInstance` object which has a `close` method.

*   **`close(): Promise<void>`**: Gracefully shuts down the HTTP server. This is useful for handling signals like `SIGTERM` in production environments [Source 1].

## Default Endpoints

The created server exposes the following built-in endpoints [Source 1]:

### `POST /chat`

A standard JSON request/response endpoint for interacting with the agent.

*   **Request Body**: `{ "message": "Your query here" }`
*   **Response Body**: `{ "response": "The agent's full response" }`

### `POST /chat/stream`

A Server-Sent Events (SSE) endpoint for streaming the agent's response as it is generated. This is useful for real-time UI updates.

*   **Request Body**: `{ "message": "Your query here" }`
*   **Response Stream**: A stream of `data:`-prefixed JSON objects representing events like text deltas, [Tool Calls](../concepts/tool-calls.md), and the final `done` event.

### `GET /health`

A health check endpoint that provides server status and basic metrics.

*   **Response Body**: `{ "status": "ok", "uptime": 3600, "requests": 142 }`

### `GET /info`

An endpoint that returns metadata about the agent and the server.

*   **Response Body**: `{ "name": "my-api-agent", "version": "1.0.0", "endpoints": [...], "streaming": true }`

## Examples

### Basic Server Setup

This example demonstrates how to create a simple agent and expose it via an HTTP server on port 3000.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

// Assume searchTool is defined elsewhere
const agent = new Agent({
  systemPrompt: 'You are an API assistant.',
  tools: [searchTool],
});

const server = createServer(toStreamableAgent(agent), {
  port: 3000,
});

// The server automatically starts and logs the following:
// 🚀 yaaf-agent listening on http://0.0.0.0:3000
//    POST /chat         — Send a message
//    POST /chat/stream  — Stream response (SSE)
//    GET  /health       — Health check
//    GET  /info         — Agent info
```
[Source 1]

### Advanced Configuration

This example shows a more complex setup with custom configuration for security, identity, hooks, and custom routes. It also includes a graceful shutdown handler.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({ systemPrompt: 'You are a helpful assistant.' });

const server = createServer(toStreamableAgent(agent), {
  // Network configuration
  port: 3000,
  host: '0.0.0.0',
  timeout: 120_000,

  // Agent identity
  name: 'my-api-agent',
  version: '1.0.0',

  // CORS settings
  cors: true,
  corsOrigin: 'https://myapp.com',

  // Security settings
  maxBodySize: 1_048_576,  // 1MB
  rateLimit: 60,           // requests per minute per IP

  // Hooks for pre- and post-processing
  beforeRun: async (input, req) => {
    const userId = req.headers['x-user-id'];
    return `[User: ${userId}] ${input}`;
  },
  afterRun: async (input, response, req) => {
    // Assume analytics object is defined elsewhere
    await analytics.log({ input, response, ip: req.socket.remoteAddress });
  },

  // Custom API routes
  routes: {
    '/api/reset': (_req, res) => {
      agent.reset();
      res.writeHead(200);
      res.end('OK');
    },
  },

  // Lifecycle callback
  onStart: (port) => {
    console.log(`Server ready on port ${port}`);
  },
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
```
[Source 1]

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
*   [Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/server.ts