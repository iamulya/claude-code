---
summary: The Server Runtime subsystem provides utilities to expose YAAF agents as HTTP APIs with REST and Server-Sent Events (SSE) streaming endpoints, enabling easy deployment and integration.
primary_files:
 - src/server/index.ts
title: Server Runtime
entity_type: subsystem
exports:
 - createServer
search_terms:
 - expose agent as http api
 - create rest api for agent
 - streaming agent responses
 - server-sent events sse
 - deploy yaaf agent
 - agent http server
 - yaaf createServer function
 - agent health check endpoint
 - custom routes for agent
 - rate limiting agent api
 - cors configuration for agent
 - dockerize yaaf agent
 - how to ship an agent as an api
stub: false
compiled_at: 2026-04-24T18:19:26.297Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/server.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Server Runtime is an opt-in subsystem that enables developers to ship a YAAF agent as a standalone HTTP API [Source 2, Source 3]. It solves the problem of exposing an agent's capabilities over a network, providing pre-built endpoints for both standard request-response interactions and real-time [Streaming](../concepts/streaming.md) via Server-Sent Events (SSE) [Source 2]. This facilitates integration with web frontends, mobile applications, and other backend services [Source 1].

## Architecture

The core of the Server Runtime is the `createServer` function, which wraps a YAAF `Agent` instance in a pre-configured HTTP server [Source 2]. [when](../apis/when.md) initialized, the server automatically exposes a set of standardized endpoints [Source 2]:

*   **`POST /chat`**: A RESTful endpoint for synchronous, JSON-based request-response interactions with the agent.
*   **`POST /chat/stream`**: An endpoint that uses the Server-Sent Events (SSE) protocol to stream the agent's response chunks and tool usage events to the client in real-time.
*   **`GET /health`**: A health check endpoint that provides server status, uptime, and request counts.
*   **`GET /info`**: An informational endpoint that returns metadata about the agent, such as its name, version, and available endpoints.

The server is designed to be production-ready, incorporating features like CORS handling, [Rate Limiting](./rate-limiting.md), and request body size limits through its configuration options [Source 2].

## Integration Points

The Server Runtime's primary integration point is with the core `Agent` class. The `createServer` function requires an `Agent` instance as its first argument. For streaming functionality to work, the agent must first be wrapped using the `toStreamableAgent` utility function [Source 2]. This indicates an adapter pattern is used to make a standard agent compatible with the streaming server architecture.

## Key APIs

The main public API provided by this subsystem is `createServer`.

*   **`createServer(agent, options)`**: This function instantiates and starts an HTTP server configured to handle requests for the provided agent. It accepts a configuration object to customize server behavior, including network settings, security policies, and custom routes [Source 2].

## Configuration

The Server Runtime is configured by passing an options object to the `createServer` function. The available options allow for extensive customization of the server's behavior [Source 2].

| Option | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | `3000` | Listen port |
| `host` | `string` | `'0.0.0.0'` | Bind address |
| `cors` | `boolean` | `true` | Enable CORS headers |
| `corsOrigin` | `string` | `'*'` | Allowed origin |
| `name` | `string` | `'yaaf-agent'` | Agent name (shown in /info) |
| `version` | `string` | `'0.1.0'` | Agent version |
| `maxBodySize` | `number` | `1MB` | Max request body bytes |
| `rateLimit` | `number` | `60` | Max requests/min/IP |
| `timeout` | `number` | `120000` | Request timeout (ms) |
| `beforeRun` | `(input, req) => string` | — | Pre-processing hook |
| `afterRun` | `(input, response, req) => void` | — | Post-processing hook |
| `routes` | `Record<string, RouteHandler>` | — | Custom route handlers |
| `onStart` | `(port) => void` | — | Startup callback |

A full configuration example from the documentation demonstrates how these options are used [Source 2]:

```typescript
const server = createServer(agent, {
  // Network
  port: 3000,
  host: '0.0.0.0',
  timeout: 120_000,

  // Identity
  name: 'my-api-agent',
  version: '1.0.0',

  // CORS
  cors: true,
  corsOrigin: 'https://myapp.com',

  // Security
  maxBodySize: 1_048_576,  // 1MB
  rateLimit: 60,           // requests per minute per IP

  // Hooks
  beforeRun: async (input, req) => {
    const userId = req.headers['x-user-id'];
    return `[User: ${userId}] ${input}`;
  },
  afterRun: async (input, response, req) => {
    await analytics.log({ input, response, ip: req.socket.remoteAddress });
  },

  // Custom Routes
  routes: {
    '/api/reset': (_req, res) => {
      agent.reset();
      res.writeHead(200);
      res.end('OK');
    },
  },

  // Lifecycle
  onStart: (port) => {
    console.log(`Server ready on port ${port}`);
  },
});
```

## Extension Points

The Server Runtime provides several extension points through its configuration object, allowing developers to add custom logic and endpoints [Source 2]:

*   **Hooks**: The `beforeRun` and `afterRun` properties accept asynchronous functions that execute before and after the agent processes a request. These hooks are suitable for implementing cross-cutting concerns like authentication, context injection from headers, and logging.
*   **Custom Routes**: The `routes` property allows developers to define additional HTTP endpoints on the server. This is useful for adding custom API functionality beyond the standard agent chat interaction, such as an endpoint to reset the agent's state or retrieve a list of its [Tools](./tools.md).

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/server.ts