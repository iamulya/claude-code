---
summary: Provides a WebSocket-based server for hosting remote, persistent YAAF agent sessions.
export_name: RemoteSessionServer
source_file: src/remote/sessions.ts
category: class
title: RemoteSessionServer
entity_type: api
search_terms:
 - websocket server
 - persistent agent sessions
 - real-time agent communication
 - how to host an agent
 - remote agent access
 - yaaf server
 - session management
 - client protocol for agents
 - streaming agent responses
 - session resume
 - keep-alive
 - heartbeat
stub: false
compiled_at: 2026-04-25T00:12:12.918Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote/sessions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `RemoteSessionServer` class provides a server for hosting interactive, persistent [Agent](./agent.md) sessions over WebSockets. It extends the standard YAAF HTTP server with a bidirectional WebSocket transport for real-time, stateful agent interactions [Source 2].

This server is designed for scenarios requiring long-lived conversations where context must be maintained across multiple messages. It is an opt-in feature and is not included in the main `yaaf` package export. It must be imported explicitly from `yaaf/remote` [Source 1].

Key features include [Source 2]:
- **Persistent Sessions**: Maintains conversation state for each connected client.
- **WebSocket Transport**: Enables full-duplex, low-latency communication.
- **Multi-Client Support**: Manages multiple concurrent and isolated sessions.
- **Event Streaming**: Pushes real-time events to clients, such as tool call status and streaming text deltas.
- **Session Resumption**: Allows clients to reconnect to an existing session using a session ID.
- **Heartbeat Mechanism**: Automatically sends keep-alive messages to detect and handle dropped connections.

The server uses Node.js's built-in WebSocket support (available in Node.js ≥ 21) and can fall back to the `ws` package if it is installed. If neither is available, the server will fail to start with an informative error message [Source 2].

## Constructor

The `RemoteSessionServer` is instantiated with an [Agent](./agent.md) instance and an optional configuration object [Source 2].

```typescript
import { Agent } from 'yaaf';
import { RemoteSessionServer, RemoteSessionConfig } from 'yaaf/remote';

const agent: Agent = /* ... */;
const config: RemoteSessionConfig = { /* ... */ };

const server = new RemoteSessionServer(agent, config);
```

### `RemoteSessionConfig`

The configuration object accepts the following properties [Source 2]:

| Property              | Type                                                              | Description                                                                                                                            | Default                  |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `port`                | `number`                                                          | The port for the server to listen on.                                                                                                  | `8080`                   |
| `host`                | `string`                                                          | The hostname to bind the server to.                                                                                                    | `'0.0.0.0'`              |
| `maxSessions`         | `number`                                                          | The maximum number of concurrent WebSocket sessions allowed.                                                                           | `100`                    |
| `sessionTimeoutMs`    | `number`                                                          | The duration of inactivity in milliseconds before a session is considered idle and destroyed.                                          | `1800000` (30 minutes)   |
| `heartbeatIntervalMs` | `number`                                                          | The interval in milliseconds for sending WebSocket heartbeat (ping) messages to keep connections alive.                                | `30000` (30 seconds)     |
| `cors`                | `boolean`                                                         | Whether to enable Cross-Origin Resource Sharing (CORS) for the HTTP endpoints.                                                         | `true`                   |
| `corsOrigin`          | `string`                                                          | The value for the `Access-Control-Allow-Origin` CORS header.                                                                           | `'*'`                    |
| `name`                | `string`                                                          | A display name for the agent, exposed via the `/info` HTTP endpoint.                                                                   | `undefined`              |
| `onSessionCreated`    | `(sessionId: string) => void`                                     | A callback function invoked when a new session is created.                                                                             | `undefined`              |
| `onSessionDestroyed`  | `(sessionId: string, reason: string) => void`                     | A callback function invoked when a session is destroyed, providing the reason (e.g., 'timeout', 'disconnected').                     | `undefined`              |
| `onStart`             | `(info: { url: string; wsUrl: string; port: number }) => void`     | A callback invoked when the server starts listening. If omitted, a startup message is printed to `stdout`.                             | `undefined`              |
| `devUi`               | `boolean`                                                         | If `true`, serves the YAAF Developer UI at the root path (`/`). This UI connects to the `/ws` endpoint for interactive agent sessions. | `false`                  |
| `model`               | `string`                                                          | The model identifier to display in the Dev UI inspector (e.g., 'gemini-2.0-flash').                                                    | `undefined`              |
| `systemPrompt`        | `string`                                                          | The agent's [System Prompt](../concepts/system-prompt.md) to optionally expose in the Dev UI's settings panel.                                                     | `undefined`              |
| `maxBodyBytes`        | `number`                                                          | The maximum allowed size in bytes for an HTTP request body. Requests exceeding this limit will be rejected with a 413 status code.    | `1048576` (1 MB)         |

## Methods & Properties

### `start()`

Starts the server, which begins listening for HTTP and WebSocket connections on the configured port and host [Source 2].

```typescript
await server.start();
```

## Client Protocol

Communication between the client and the `RemoteSessionServer` over WebSocket follows a JSON-based message protocol [Source 2].

### Client to Server Messages

| `type`      | Description                                                              | Payload                                                               |
| ----------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `message`   | Sends a new message to the agent within a session.                       | `{ "type": "message", "sessionId"?: string, "text": string }`         |
| `resume`    | Reconnects to an existing, active session.                               | `{ "type": "resume", "sessionId": string }`                           |
| `ping`      | A keep-alive message; the server will respond with a `pong`.             | `{ "type": "ping" }`                                                  |
| `cancel`    | Requests to cancel the current in-progress agent run for the session.    | `{ "type": "cancel", "sessionId": string }`                           |

### Server to Client Messages

| `type`       | Description                                                              | Payload                                                               |
| ------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `session`    | Confirms that a session has been started or resumed successfully.        | `{ "type": "session", "sessionId": string, "status": "active" }`      |
| `text_delta` | A streaming chunk of the agent's text response.                          | `{ "type": "text_delta", "sessionId": string, "text": string }`       |
| `response`   | The final, complete text response from the agent for a given turn.       | `{ "type": "response", "sessionId": string, "text": string }`         |
| `tool_start` | Indicates that the agent has started executing a tool.                   | `{ "type": "tool_start", "sessionId": string, "tool": string, "args": object }` |
| `tool_end`   | Provides the result of a completed tool execution.                       | `{ "type": "tool_end", "sessionId": string, "tool": string, "result": any }` |
| `error`      | Reports an error that occurred during session processing.                | `{ "type": "error", "sessionId": string, "message": string }`         |
| `pong`       | The response to a client's `ping` message.                               | `{ "type": "pong" }`                                                  |

## Examples

The following example demonstrates how to create and start a `RemoteSessionServer` for a basic [Agent](./agent.md) [Source 2].

```typescript
import { Agent } from 'yaaf';
import { RemoteSessionServer } from 'yaaf/remote';

// 1. Create an agent instance
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

// 2. Configure and instantiate the server
const server = new RemoteSessionServer(agent, {
  port: 8080,
  maxSessions: 100,
  sessionTimeoutMs: 30 * 60_000, // 30 minute idle timeout
  devUi: true, // Enable the web-based developer UI
});

// 3. Start the server
async function main() {
  await server.start();
  // Server is now running.
  // Clients can connect via WebSocket at: ws://localhost:8080/ws
  // Or send single-shot messages via HTTP: POST http://localhost:8080/chat
}

main();
```

## See Also

- [startRemoteServer](./start-remote-server.md): A convenience function for creating and starting a `RemoteSessionServer`.
- [Agent](./agent.md): The core class for creating YAAF agents, required by the server.

## Sources

[Source 1]: src/remote.ts
[Source 2]: src/remote/sessions.ts