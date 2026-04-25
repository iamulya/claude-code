---
title: Persistent Sessions
entity_type: concept
summary: The concept of maintaining conversation state and agent context across multiple messages and client disconnections.
primary_files:
 - src/remote/sessions.ts
related_subsystems:
 - YAAF Dev UI
see_also:
 - "[Agent Session](./agent-session.md)"
 - "[RemoteSessionServer](../apis/remote-session-server.md)"
 - "[startRemoteServer](../apis/start-remote-server.md)"
 - "[Streaming](./streaming.md)"
 - "[Heartbeat Mechanism](./heartbeat-mechanism.md)"
 - "[YAAF Dev UI](../subsystems/yaaf-dev-ui.md)"
search_terms:
 - maintain conversation state
 - WebSocket agent server
 - long-running agent conversations
 - how to resume agent session
 - stateful agent interaction
 - yaaf remote server
 - client disconnect handling
 - session timeout
 - keep-alive agent connection
 - real-time agent communication
 - full-duplex agent
 - yaaf/remote module
 - multi-turn dialogue
 - reconnect to agent
stub: false
compiled_at: 2026-04-25T00:22:41.959Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote/sessions.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Persistent Sessions are a mechanism in YAAF for maintaining an [Agent](../apis/agent.md)'s conversational state and context across multiple interactions and client connections [Source 1]. Unlike stateless HTTP request-response cycles, persistent sessions allow for long-running, stateful dialogues. This is essential for applications where an agent needs to remember previous turns in a conversation to provide coherent and context-aware responses.

The primary problem this concept solves is the stateless nature of web communication. It enables features like:
- **Multi-turn conversations**: The agent retains memory of the dialogue history within a session.
- **Client reconnection**: Users can disconnect (e.g., due to network issues) and later resume their conversation exactly where they left off by referencing a session ID.
- **Real-time updates**: The server can push information to the client, such as [Streaming](./streaming.md) text deltas or notifications about [Tool Calls](./tool-calls.md), without waiting for a new client request [Source 1].

This functionality is provided as an opt-in feature and is not part of the main `yaaf` package export. Developers must explicitly import it from `yaaf/remote` [Source 2].

## How It Works in YAAF

Persistent Sessions in YAAF are implemented using WebSockets, which provide a full-duplex, low-latency communication channel between the client and the server [Source 1]. The core implementation is encapsulated in the [RemoteSessionServer](../apis/remote-session-server.md) class.

Key mechanics include:
- **Session Management**: The server can manage multiple, concurrent, and isolated client sessions. When a client first connects, a unique session ID is generated.
- **Session Resumption**: A client can reconnect to an existing session by providing its session ID in a `resume` message. This allows the conversation to continue seamlessly after a disconnection [Source 1].
- **Transport Layer**: The system uses Node.js's built-in WebSocket support (for Node.js ≥ 21) or falls back to the `ws` package if available [Source 1].
- **[Heartbeat Mechanism](./heartbeat-mechanism.md)**: The server and client exchange periodic messages (ping/pong) to detect and handle dropped connections automatically [Source 1].
- **Event-Driven Protocol**: The server pushes events to the client over the WebSocket connection. This includes `text_delta` for [Streaming](./streaming.md) responses, `tool_start` and `tool_end` for visibility into tool execution, and `error` messages. The client sends messages like `message` to interact with the agent or `cancel` to abort an ongoing operation [Source 1].
- **Idle Timeout**: Each session has a configurable idle timeout. If no activity occurs within the specified period, the session is automatically destroyed to free up resources [Source 1].

## Configuration

Persistent Sessions are configured via the `RemoteSessionConfig` object passed to the [RemoteSessionServer](../apis/remote-session-server.md) constructor or the [startRemoteServer](../apis/start-remote-server.md) function. This allows developers to customize server behavior, timeouts, and resource limits [Source 1].

```typescript
import { Agent } from 'yaaf';
import { startRemoteServer } from 'yaaf/remote';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

// Configure and start a server with persistent sessions
const server = await startRemoteServer(agent, {
  port: 8080,
  host: '0.0.0.0',
  maxSessions: 100,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minute idle timeout
  heartbeatIntervalMs: 30 * 1000, // 30 second heartbeat
  devUi: true, // Serve the YAAF Dev UI at the root URL
  onSessionCreated: (sessionId) => {
    console.log(`New session started: ${sessionId}`);
  },
  onSessionDestroyed: (sessionId, reason) => {
    console.log(`Session destroyed: ${sessionId}, Reason: ${reason}`);
  },
});

console.log('Server started. Clients can connect via ws://localhost:8080/ws');

// To stop the server:
// await server.close();
```

Key configuration options include:
- `maxSessions`: The maximum number of concurrent sessions the server will handle.
- `sessionTimeoutMs`: The duration of inactivity in milliseconds before a session is considered idle and destroyed.
- `heartbeatIntervalMs`: The frequency in milliseconds for sending keep-alive pings to clients.
- `devUi`: A boolean to enable or disable serving the [YAAF Dev UI](../subsystems/yaaf-dev-ui.md), a web-based client for interacting with the agent [Source 1].
- `onSessionCreated` / `onSessionDestroyed`: Callback hooks that are invoked when sessions are created or terminated.

## See Also

- [Agent Session](./agent-session.md)
- [RemoteSessionServer](../apis/remote-session-server.md)
- [startRemoteServer](../apis/start-remote-server.md)
- [Streaming](./streaming.md)
- [Heartbeat Mechanism](./heartbeat-mechanism.md)
- [YAAF Dev UI](../subsystems/yaaf-dev-ui.md)

## Sources
- [Source 1]: `src/remote/sessions.ts`
- [Source 2]: `src/remote.ts`