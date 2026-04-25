---
title: Session Resume
entity_type: concept
summary: The ability for a client to reconnect to an existing agent session using a session ID, restoring its state.
related_subsystems:
 - remote
see_also:
 - "[Agent Session](./agent-session.md)"
 - "[Session Persistence](./session-persistence.md)"
 - "[Session Resolution](./session-resolution.md)"
search_terms:
 - reconnect to agent
 - restore agent state
 - persistent agent connection
 - how to resume a session
 - websocket reconnect
 - continue conversation with agent
 - session identifier
 - stateful agent interaction
 - long-running agent tasks
 - surviving network disconnects
 - yaaf remote session
 - re-establish connection
stub: false
compiled_at: 2026-04-25T00:24:28.484Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote/sessions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Session Resume is a feature within YAAF's remote server that allows a client to re-establish a connection to an existing, active [Agent Session](./agent-session.md) by providing a unique session ID. This mechanism preserves the conversational state, memory, and ongoing work of an agent, enabling interactions to survive client-side disruptions such as network drops, page reloads, or application restarts [Source 1].

The primary problem Session Resume solves is the lack of persistence in typical request-response cycles. Without it, any interruption would terminate the agent's context, forcing the user to start a new conversation from the beginning. This is particularly critical for long-running tasks or complex, multi-turn dialogues where maintaining state is essential. Session Resume provides the foundation for building robust, stateful, and user-friendly agent applications [Source 1].

## How It Works in YAAF

Session Resume is an integral part of the `RemoteSessionServer`, which manages persistent agent interactions over WebSockets [Source 1]. The process is orchestrated through a specific client-server protocol:

1.  **Session Initiation**: When a client first connects and sends a message without a `sessionId`, the `RemoteSessionServer` creates a new [Agent Session](./agent-session.md). It generates a unique `sessionId` (a UUID) and sends it back to the client in a `session` message [Source 1].
2.  **Client-side Storage**: The client is responsible for storing this `sessionId` for the duration of its interaction.
3.  **Reconnection**: If the WebSocket connection is lost, the client can reconnect to the server.
4.  **Resume Request**: Upon reconnection, the client sends a `resume` message containing the previously stored `sessionId` [Source 1].

    ```json
    { "type": "resume", "sessionId": "existing-id" }
    ```

5.  **Server-side Resolution**: The `RemoteSessionServer` receives the `resume` request, looks up the active session by its ID, and re-associates the new WebSocket connection with the existing session state.
6.  **Confirmation**: The server confirms the successful resumption by sending a `session` message back to the client, allowing the conversation to continue seamlessly from where it left off [Source 1].

    ```json
    { "type": "session", "sessionId": "uuid", "status": "active" }
    ```

This entire mechanism relies on the server maintaining the session state in memory for a configured duration, even if the client is temporarily disconnected [Source 1].

## Configuration

While Session Resume is an intrinsic feature of the `RemoteSessionServer` and does not require explicit enabling, its behavior is influenced by the session's lifetime configuration. The `sessionTimeoutMs` parameter determines how long an idle session (one with no client connection or activity) is kept alive on the server. If a client attempts to resume a session that has exceeded this timeout, the session will have been destroyed, and the resume attempt will fail [Source 1].

A typical configuration for a `RemoteSessionServer` includes setting this timeout:

```typescript
import { Agent } from 'yaaf';
import { RemoteSessionServer } from 'yaaf/remote';

const agent = new Agent({ systemPrompt: 'You are a helpful assistant.' });

const server = new RemoteSessionServer(agent, {
  port: 8080,
  // A session will be destroyed after 30 minutes of inactivity,
  // after which it can no longer be resumed.
  sessionTimeoutMs: 30 * 60_000,
});

await server.start();
```

In this example, a disconnected client has up to 30 minutes to send a `resume` request before its session is garbage-collected by the server [Source 1].

## See Also

*   [Agent Session](./agent-session.md): The core stateful context that is being resumed.
*   [Session Persistence](./session-persistence.md): The broader concept of saving and loading session state, of which in-memory resumption is one form.
*   [Session Resolution](./session-resolution.md): The mechanism by which a session ID is used to look up an active session.

## Sources

*   [Source 1] `src/remote/sessions.ts`