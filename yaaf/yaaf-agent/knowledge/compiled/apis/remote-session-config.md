---
title: RemoteSessionConfig
entity_type: api
summary: Configuration options for the Remote Session Server, controlling network, session management, and UI behavior.
export_name: RemoteSessionConfig
source_file: src/remote/sessions.ts
category: type
search_terms:
 - remote server configuration
 - websocket agent server settings
 - startRemoteServer options
 - configure agent port
 - session timeout settings
 - enable dev ui
 - CORS settings for agent
 - max concurrent sessions
 - heartbeat interval
 - remote session lifecycle hooks
 - onSessionCreated callback
 - onSessionDestroyed callback
 - YAAF server setup
 - max request body size
stub: false
compiled_at: 2026-04-25T00:11:54.339Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote/sessions.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`RemoteSessionConfig` is a TypeScript type that defines the configuration options for a YAAF remote session server. This object is passed to the [startRemoteServer](./start-remote-server.md) function or the [RemoteSessionServer](./remote-session-server.md) constructor to customize the server's behavior, including network settings, session management, security policies, and the optional [YAAF Dev UI](../subsystems/yaaf-dev-ui.md).

## Signature

`RemoteSessionConfig` is a type alias for an object with the following properties:

```typescript
export type RemoteSessionConfig = {
  /** Port to listen on. Default: 8080. */
  port?: number;

  /** Hostname to bind to. Default: '0.0.0.0'. */
  host?: string;

  /** Maximum concurrent sessions. Default: 100. */
  maxSessions?: number;

  /** Idle timeout per session in ms. Default: 1800000 (30 min). */
  sessionTimeoutMs?: number;

  /** WebSocket heartbeat interval in ms. Default: 30000 (30s). */
  heartbeatIntervalMs?: number;

  /** Enable CORS for HTTP endpoints. Default: true. */
  cors?: boolean;

  /** CORS allowed origin. Default: '*'. */
  corsOrigin?: string;

  /** Agent display name (for /info). */
  name?: string;

  /** Called when a session is created. */
  onSessionCreated?: (sessionId: string) => void;

  /** Called when a session is destroyed. */
  onSessionDestroyed?: (sessionId: string, reason: string) => void;

  /**
   * Called when the server starts listening.
   * When omitted, the server prints a startup message to stdout.
   * Pass a no-op function to suppress the message.
   */
  onStart?: (info: { url: string; wsUrl: string; port: number }) => void;

  /**
   * Serve the YAAF Dev UI at GET /.
   * The UI connects over WebSocket (/ws) for full-duplex streaming.
   * Disable in production.
   * Default: false.
   */
  devUi?: boolean;

  /**
   * Model identifier shown in the UI inspector.
   * Example: 'gemini-2.0-flash'.
   */
  model?: string;

  /**
   * Optionally expose the agent's system prompt in the UI Settings drawer.
   * Default: undefined (not exposed).
   */
  systemPrompt?: string;

  /**
   * Maximum allowed HTTP request body size in bytes.
   * Requests exceeding this limit receive HTTP 413. Default: 1 MB.
   */
  maxBodyBytes?: number;
};
```

## Examples

### Basic Server Configuration

This example starts a remote server for an agent on a custom port, enables the [YAAF Dev UI](../subsystems/yaaf-dev-ui.md), and sets a session timeout.

```typescript
import { Agent } from 'yaaf';
import { startRemoteServer, RemoteSessionConfig } from 'yaaf/remote';

const agent = new Agent({ systemPrompt: 'You are a helpful assistant.' });

const config: RemoteSessionConfig = {
  port: 9000,
  host: '127.0.0.1',
  sessionTimeoutMs: 15 * 60 * 1000, // 15 minutes
  devUi: true,
  name: 'My Custom Agent',
  model: 'custom-llm-v1',
};

async function main() {
  const serverHandle = await startRemoteServer(agent, config);
  // Server is now running at http://127.0.0.1:9000
  // and ws://127.0.0.1:9000/ws

  // To stop the server later:
  // await serverHandle.close();
}

main();
```

### Using Lifecycle Hooks

This example demonstrates how to use the `onStart`, `onSessionCreated`, and `onSessionDestroyed` callbacks to log server and session lifecycle events.

```typescript
import { Agent } from 'yaaf';
import { startRemoteServer, RemoteSessionConfig } from 'yaaf/remote';

const agent = new Agent({ systemPrompt: 'You are a helpful assistant.' });

const config: RemoteSessionConfig = {
  port: 8080,
  onStart: (info) => {
    console.log(`Server started successfully!`);
    console.log(`- HTTP URL: ${info.url}`);
    console.log(`- WebSocket URL: ${info.wsUrl}`);
  },
  onSessionCreated: (sessionId) => {
    console.log(`[SESSION] New session started: ${sessionId}`);
  },
  onSessionDestroyed: (sessionId, reason) => {
    console.log(`[SESSION] Session ended: ${sessionId}. Reason: ${reason}`);
  },
};

startRemoteServer(agent, config);
```

## See Also

- [startRemoteServer](./start-remote-server.md): The function that consumes this configuration to launch a server.
- [RemoteSessionServer](./remote-session-server.md): The class that is configured by this object.
- [YAAF Dev UI](../subsystems/yaaf-dev-ui.md): The development user interface enabled by the `devUi` property.