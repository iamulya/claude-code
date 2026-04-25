---
summary: Initializes and starts a `RemoteSessionServer` to host YAAF agent sessions over WebSockets.
export_name: startRemoteServer
source_file: src/remote/sessions.ts
category: function
title: startRemoteServer
entity_type: api
search_terms:
 - host agent over network
 - websocket agent server
 - remote agent session
 - create websocket server
 - expose agent via API
 - yaaf server setup
 - persistent agent state
 - how to start remote server
 - RemoteSessionConfig
 - yaaf dev ui
 - agent network interface
 - startremoteserver
stub: false
compiled_at: 2026-04-25T00:14:27.358Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote/sessions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `startRemoteServer` function is a factory that initializes and starts a [RemoteSessionServer](./remote-session-server.md), which hosts YAAF agent sessions over WebSockets [Source 2]. It provides a convenient, single-step method for exposing an agent to remote clients, enabling persistent, real-time, and multi-client interactions [Source 2].

This function is part of the opt-in Remote Sessions subsystem and must be imported explicitly from `yaaf/remote` [Source 1].

```typescript
import { startRemoteServer } from 'yaaf/remote';
```

The server supports both WebSocket connections for full-duplex communication and standard HTTP endpoints for simple chat interactions [Source 2].

## Signature

```typescript
export async function startRemoteServer(
  agent: RemoteAgent,
  config?: RemoteSessionConfig,
): Promise<RemoteSessionHandle>
```

**Parameters:**

*   `agent: RemoteAgent`: The YAAF [Agent](./agent.md) instance to be hosted by the server [Source 2].
*   `config?: RemoteSessionConfig`: An optional configuration object to customize the server's behavior [Source 2].

**Returns:**

*   `Promise<RemoteSessionHandle>`: A promise that resolves to a `RemoteSessionHandle` object once the server has successfully started. This handle contains a `close()` method to gracefully shut down the server [Source 2].

### Configuration (`RemoteSessionConfig`)

The optional `config` object can have the following properties [Source 2]:

| Property              | Type                                                              | Description                                                                                                                            | Default                  |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `port`                | `number`                                                          | The port for the server to listen on.                                                                                                  | `8080`                   |
| `host`                | `string`                                                          | The hostname to bind the server to.                                                                                                    | `'0.0.0.0'`              |
| `maxSessions`         | `number`                                                          | The maximum number of concurrent WebSocket sessions allowed.                                                                           | `100`                    |
| `sessionTimeoutMs`    | `number`                                                          | The idle timeout in milliseconds for each session.                                                                                     | `1800000` (30 minutes)   |
| `heartbeatIntervalMs` | `number`                                                          | The interval in milliseconds for sending WebSocket heartbeat (ping) messages to keep connections alive.                                | `30000` (30 seconds)     |
| `cors`                | `boolean`                                                         | Whether to enable Cross-Origin Resource Sharing (CORS) for HTTP endpoints.                                                             | `true`                   |
| `corsOrigin`          | `string`                                                          | The value for the `Access-Control-Allow-Origin` CORS header.                                                                           | `'*'`                    |
| `name`                | `string`                                                          | A display name for the agent, which is exposed via the `/info` endpoint.                                                               | `undefined`              |
| `onSessionCreated`    | `(sessionId: string) => void`                                     | A callback function invoked when a new session is created.                                                                             | `undefined`              |
| `onSessionDestroyed`  | `(sessionId: string, reason: string) => void`                     | A callback function invoked when a session is destroyed.                                                                               | `undefined`              |
| `onStart`             | `(info: { url: string; wsUrl: string; port: number }) => void`     | A callback invoked when the server starts listening. If omitted, a startup message is printed to stdout. Pass a no-op to suppress it. | `undefined`              |
| `devUi`               | `boolean`                                                         | If `true`, serves the YAAF Dev UI at the root URL (`/`). This should be disabled in production.                                        | `false`                  |
| `model`               | `string`                                                          | The model identifier to be displayed in the Dev UI inspector (e.g., `'gemini-2.0-flash'`).                                             | `undefined`              |
| `systemPrompt`        | `string`                                                          | If provided, exposes the agent's system prompt in the Dev UI's settings drawer.                                                        | `undefined`              |
| `maxBodyBytes`        | `number`                                                          | The maximum allowed size in bytes for an HTTP request body. Requests exceeding this will be rejected with a 413 status code.         | `1048576` (1 MB)         |

## Examples

### Basic Server Initialization

This example starts a remote server for a basic agent on the default port (8080).

```typescript
import { Agent } from 'yaaf';
import { startRemoteServer } from 'yaaf/remote';

// 1. Create an agent instance
const myAgent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

// 2. Start the remote server
async function main() {
  const handle = await startRemoteServer(myAgent, {
    port: 8080,
    name: 'My Helpful Agent',
  });

  console.log('Server is running. Press Ctrl+C to stop.');

  // The server will run until the process is terminated.
  // To stop it programmatically, you can call handle.close().
  // For example, after a timeout:
  // setTimeout(() => handle.close(), 60000);
}

main();
```

### Enabling the Dev UI

To use the interactive development UI, set the `devUi` option to `true`.

```typescript
import { Agent } from 'yaaf';
import { startRemoteServer } from 'yaaf/remote';

const myAgent = new Agent({
  systemPrompt: 'You are a helpful assistant for writing code.',
});

await startRemoteServer(myAgent, {
  port: 3000,
  devUi: true,
  model: 'gemini-2.0-pro',
  systemPrompt: myAgent.soul.systemPrompt, // Expose prompt to UI
  onStart: ({ url, wsUrl }) => {
    console.log(`Server started!`);
    console.log(`  - Dev UI available at: ${url}`);
    console.log(`  - WebSocket endpoint: ${wsUrl}`);
  }
});
```

After running this code, you can navigate to `http://localhost:3000` in a web browser to interact with the agent.

## See Also

*   [RemoteSessionServer](./remote-session-server.md): The underlying class that `startRemoteServer` instantiates and manages.
*   [Remote Sessions Subsystem](../subsystems/remote-sessions-subsystem.md): For a conceptual overview of remote agent hosting.

## Sources

*   [Source 1]: `src/remote.ts`
*   [Source 2]: `src/remote/sessions.ts`