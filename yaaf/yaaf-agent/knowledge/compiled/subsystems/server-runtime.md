---
title: Server Runtime
entity_type: subsystem
summary: Provides an HTTP API layer for YAAF agents with support for REST and SSE streaming.
primary_files:
  - src/server.ts
exports:
  - createServer
  - toStreamableAgent
stub: false
compiled_at: 2026-04-16T14:11:12.470Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/server-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/server.ts
confidence: 0.95
---

## Purpose
The Server Runtime subsystem provides an opt-in entry point for deploying YAAF agents as production-grade HTTP services. It abstracts the complexities of setting up a web server, handling request/response lifecycles, and implementing Server-Sent Events (SSE) for real-time streaming. By wrapping an agent in this runtime, developers can expose their LLM-powered logic via standardized RESTful endpoints.

## Architecture
The subsystem is designed around a factory pattern, primarily utilizing the `createServer` function to initialize a Node.js-compatible HTTP server. Internally, it manages:

- **Routing**: Mapping incoming HTTP requests to agent execution or system metadata.
- **Streaming Logic**: Converting agent output deltas into SSE-compliant data packets.
- **Middleware**: Handling cross-cutting concerns such as CORS, rate limiting, and request body size constraints.
- **Lifecycle Management**: Providing hooks for startup and graceful shutdown procedures.

### Core Components
- **Agent Wrapper**: The runtime typically operates on a streamable version of an agent, often prepared using the `toStreamableAgent` utility.
- **Endpoint Handlers**: Dedicated logic for processing standard paths like `/chat`, `/chat/stream`, `/health`, and `/info`.

## Key APIs
The Server Runtime is accessed via the `yaaf/server` module.

### createServer
The primary entry point for the subsystem. It accepts an agent instance and a configuration object to start the HTTP service.

### toStreamableAgent
A utility function used to wrap a standard `Agent` instance, enabling it to emit the granular events required for the `/chat/stream` endpoint.

## Endpoints
The runtime automatically exposes the following endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | `POST` | Standard JSON request/response for synchronous interaction. |
| `/chat/stream` | `POST` | Server-Sent Events (SSE) endpoint for streaming token deltas and tool calls. |
| `/health` | `GET` | Returns system status, uptime, and request metrics. |
| `/info` | `GET` | Returns agent metadata, including name, version, and available endpoints. |

### Streaming Format
The `/chat/stream` endpoint emits data in the following JSON formats via SSE:
- `text_delta`: Incremental text updates.
- `tool_call_start` / `tool_call_end`: Notifications regarding tool execution and duration.
- `done`: Final event containing the full accumulated response.

## Configuration
The server is configured via a configuration object passed to `createServer`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | The port the server listens on. |
| `host` | `string` | `'0.0.0.0'` | The bind address for the server. |
| `cors` | `boolean` | `true` | Whether to enable Cross-Origin Resource Sharing. |
| `corsOrigin` | `string` | `'*'` | Allowed origins for CORS. |
| `name` | `string` | `'yaaf-agent'` | Agent name reported in the `/info` endpoint. |
| `version` | `string` | `'0.1.0'` | Agent version reported in the `/info` endpoint. |
| `maxBodySize` | `number` | `1MB` | Maximum allowed size for request bodies in bytes. |
| `rateLimit` | `number` | `60` | Maximum requests per minute per IP address. |
| `timeout` | `number` | `120000` | Request timeout in milliseconds. |

## Extension Points
Developers can extend the Server Runtime through hooks and custom routing:

- **beforeRun**: A hook that executes before the agent processes an input. It can be used to modify the input or inject context (e.g., user IDs from headers).
- **afterRun**: A hook that executes after the agent has finished processing, useful for logging, analytics, or post-processing.
- **routes**: A configuration map that allows developers to define custom HTTP handlers alongside the standard agent endpoints.

```typescript
const server = createServer(agent, {
  routes: {
    '/api/custom': (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'custom-route' }));
    },
  },
});
```

## Sources
- `docs/server-runtime.md`
- `src/server.ts`