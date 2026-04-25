---
title: WebSocket Transport
entity_type: concept
summary: The use of the WebSocket protocol for full-duplex, low-latency communication between a client and an agent.
related_subsystems:
 - remote
see_also:
 - "[Agent Session](./agent-session.md)"
 - "[Streaming](./streaming.md)"
 - "[Heartbeat Mechanism](./heartbeat-mechanism.md)"
search_terms:
 - real-time agent communication
 - persistent agent connection
 - full-duplex agent interaction
 - low-latency agent API
 - how to stream agent responses
 - yaaf remote sessions
 - bidirectional agent communication
 - ws:// protocol for agents
 - agent keep-alive
 - streaming tool calls
 - text delta streaming
 - YAAF Dev UI connection
 - RemoteSessionServer
stub: false
compiled_at: 2026-04-25T00:26:23.871Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote/sessions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The WebSocket Transport is a communication mechanism in YAAF that uses the WebSocket protocol to establish a persistent, full-duplex (bidirectional) connection between a client and an agent instance [Source 1]. It extends the framework's standard HTTP-based server capabilities to support real-time, interactive use cases.

This transport layer solves the problem of needing low-latency, server-initiated communication. Unlike traditional HTTP request-response cycles, a WebSocket connection remains open, allowing the agent to push events—such as partial text responses ([Streaming](./streaming.md)), tool execution status, or errors—to the client as they happen, without the client needing to poll for updates [Source 1]. This is essential for creating responsive, chat-like user interfaces and for monitoring agent activity in real time.

## How It Works in YAAF

The WebSocket Transport is implemented within the `RemoteSessionServer` in the `remote/sessions` module [Source 1]. When a `RemoteSessionServer` is started, it listens for both standard HTTP requests and WebSocket upgrade requests, typically on a `/ws` endpoint.

Key features of its implementation include:

*   **Persistent Sessions**: It maintains the state of a conversation, allowing for multi-turn interactions within a single, long-lived [Agent Session](./agent-session.md) [Source 1].
*   **Event Streaming**: The server pushes various event messages to the client over the WebSocket connection. This includes `text_delta` for streaming LLM responses, `tool_start` and `tool_end` for visibility into [Tool Use](./tool-use.md), and `error` messages [Source 1].
*   **Connection Management**: It includes a built-in [Heartbeat Mechanism](./heartbeat-mechanism.md) to send keep-alive messages, which helps detect and clean up dropped or stale connections [Source 1].
*   **Session Resumption**: Clients can disconnect and later reconnect to an existing session by providing a session ID, which the transport layer uses to resume the conversation [Source 1].
*   **Runtime Dependency**: The implementation uses Node.js's native WebSocket support (in versions 21 and later) and can fall back to the `ws` package if it is installed as a dependency. If neither is available, the server will fail to start with an informative error [Source 1].

The transport defines a clear JSON-based protocol for client-server communication.

**Client to Server Messages:**
*   `message`: Sends user input to the agent.
*   `resume`: Reconnects to a previously established session.
*   `ping`: A keep-alive message to which the server responds with `pong`.
*   `cancel`: Requests to stop the agent's current task [Source 1].

**Server to Client Messages:**
*   `session`: Confirms that a session has been successfully started or resumed.
*   `text_delta`: A chunk of a streamed text response.
*   `response`: The final, complete text response from the agent.
*   `tool_start` / `tool_end`: Notifications about the lifecycle of tool calls.
*   `error`: Informs the client of a server-side error.
*   `pong`: The response to a client's `ping` [Source 1].

The YAAF Dev UI is a primary consumer of this transport, using the WebSocket connection to provide its full-duplex, streaming interface [Source 1].

## Configuration

The WebSocket Transport is configured through the `RemoteSessionConfig` object passed to the `RemoteSessionServer` constructor or the `startRemoteServer` function. Key settings that affect the transport layer include the port, session timeout, and heartbeat interval.

```typescript
import { Agent } from 'yaaf';
import { RemoteSessionServer } from 'yaaf/remote';

const agent = new Agent({ systemPrompt: 'You are a helpful assistant.' });

// Configure the server, including WebSocket-related parameters
const server = new RemoteSessionServer(agent, {
  port: 8080,
  maxSessions: 100,
  sessionTimeoutMs: 30 * 60_000, // 30 min idle timeout
  heartbeatIntervalMs: 30_000,   // 30s keep-alive interval
  devUi: true, // Enable the Dev UI which uses the WebSocket transport
});

await server.start();
// Clients can now connect via ws://localhost:8080/ws
```
[Source 1]

## Sources

[Source 1] Source: `src/remote/sessions.ts`