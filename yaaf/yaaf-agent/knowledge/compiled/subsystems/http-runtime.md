---
summary: The logical subsystem responsible for exposing YAAF agents as production-ready HTTP services.
primary_files:
  - src/runtime/server.ts
  - src/runtime/devUi.ts
title: HTTP Runtime
entity_type: subsystem
exports:
  - createServer
  - ServerConfig
  - ServerStreamEvent
  - ServerHandle
stub: false
compiled_at: 2026-04-16T14:32:59.671Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/server.ts
confidence: 1
---

## Purpose
The HTTP Runtime subsystem provides the infrastructure necessary to expose YAAF agents as web services. It serves as a production-ready wrapper that translates standard HTTP requests into agent invocations and formats agent outputs into standard web responses. 

The subsystem is designed to be lightweight and portable, utilizing Node.js's built-in `http` module to ensure zero external dependencies. It handles common production concerns such as Cross-Origin Resource Sharing (CORS), request validation, rate limiting, and graceful shutdown.

## Architecture
The subsystem is centered around the `createServer` factory function, which accepts a YAAF agent instance and a configuration object. Internally, it manages a Node.js `http.Server` instance and implements a routing layer to handle specific API endpoints.

### Request Handling
The runtime supports two primary modes of interaction:
1.  **Request/Response (Unary):** Standard JSON-based POST requests where the server waits for the agent to complete its execution before returning the full result.
2.  **Streaming:** Server-Sent Events (SSE) based interaction, allowing the agent to stream partial results (text deltas and tool call updates) to the client in real-time.

### Dev UI
For local development, the subsystem includes a `devUi` component. When enabled, the server serves a built-in HTML chat interface at the root (`/`) path, allowing developers to test agent behavior, inspect tool calls, and view token usage without building a custom frontend.

## Key APIs

### createServer
The primary entry point for the subsystem. It initializes the HTTP server and returns a `ServerHandle`.

```typescript
import { Agent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are an API assistant.',
});

const server = createServer(agent, {
  port: 3000,
  cors: true,
});
```

### Endpoints
The runtime automatically exposes the following routes:
*   `POST /chat`: Accepts a JSON body containing a `message` and optional `history`. Returns a JSON response.
*   `POST /chat/stream`: Accepts the same body as `/chat` but returns an SSE stream of `ServerStreamEvent` objects.
*   `GET /health`: Returns a simple health check status.
*   `GET /info`: Returns metadata about the agent, including its name, version, and optionally its system prompt and model identifier.
*   `GET /`: Serves the Dev UI (if enabled in configuration).

### ServerStreamEvent
When using the streaming endpoint, the server emits events with the following structure:
*   `text_delta`: Contains incremental text content.
*   `tool_call_start`: Indicates the agent has initiated a tool invocation.
*   `tool_call_result`: Contains the output or error status of a tool invocation.
*   `done`: Signals the completion of the request and includes final token usage statistics.

## Configuration
The runtime is configured via the `ServerConfig` object. Key configuration parameters include:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `port` | `number` | The port to listen on (default: 3000). |
| `host` | `string` | The hostname to bind to (default: '0.0.0.0'). |
| `cors` | `boolean` | Whether to enable CORS headers (default: true). |
| `rateLimit` | `number` | Max requests per minute per IP (default: 60). |
| `multiTurn` | `boolean` | If true, the server processes a `history` array for conversation context. |
| `devUi` | `boolean` | Whether to serve the built-in chat interface at `/`. |
| `maxBodySize`| `number` | Maximum allowed request body size in bytes (default: 1MB). |

## Extension Points
The HTTP Runtime provides several hooks for customizing request processing and extending server functionality:

*   **Lifecycle Hooks:**
    *   `beforeRun`: Allows modification of the input string or inspection of the `IncomingMessage` before the agent processes the request.
    *   `afterRun`: Executed after the agent has responded, useful for logging or analytics.
    *   `onStart`: Triggered when the server successfully begins listening on the configured port.
*   **Custom Routes:** Developers can provide a `routes` map in the `ServerConfig` to define additional HTTP endpoints. These handlers receive the raw `IncomingMessage`, `ServerResponse`, and the parsed request body.