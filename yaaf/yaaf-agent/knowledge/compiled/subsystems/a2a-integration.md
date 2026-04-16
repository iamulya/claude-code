---
title: A2A Integration
entity_type: subsystem
summary: The YAAF subsystem providing client and server implementations for the A2A interoperability protocol.
primary_files:
  - src/integrations/a2a.ts
exports:
  - A2AClient
  - A2AServer
  - a2aTool
  - serveA2A
stub: false
compiled_at: 2026-04-16T14:20:30.550Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/a2a.ts
confidence: 1
---

## Purpose
The A2A Integration subsystem implements the A2A open protocol, enabling interoperability between YAAF agents and agents built on other frameworks such as ADK, LangGraph, or BeeAI. It facilitates cross-framework communication by providing a standardized way for agents to discover each other's capabilities and exchange tasks.

The subsystem solves two primary problems:
1.  **Outbound Communication**: Allowing YAAF agents to call remote agents as if they were local tools or services.
2.  **Inbound Exposure**: Allowing YAAF agents to be discovered and invoked by external systems using a standardized interface.

## Architecture
The subsystem is divided into two primary components that handle the different sides of the A2A protocol:

### A2AClient
The `A2AClient` is responsible for interacting with remote A2A-compliant agents. It manages:
*   **Discovery**: Fetching and parsing "Agent Cards" (JSON metadata) from the `/.well-known/agent.json` endpoint.
*   **Task Management**: Creating tasks, polling for status updates, and handling task cancellation.
*   **Streaming**: Supporting real-time updates via Server-Sent Events (SSE).
*   **Tool Wrapping**: Converting a remote agent's capabilities into a standard YAAF tool.

### A2AServer
The `A2AServer` exposes a YAAF agent to the network. It implements the server-side requirements of the A2A protocol:
*   **Discovery Endpoint**: Serves the Agent Card at `GET /.well-known/agent.json`.
*   **JSON-RPC Handler**: Processes incoming requests at the root path (`/`) for methods such as `tasks/send`, `tasks/get`, and `tasks/cancel`.
*   **Streaming Support**: Provides SSE endpoints for `tasks/sendSubscribe`.

### Protocol Specifications
The integration adheres to the following protocol standards:
*   **Transport**: JSON-RPC 2.0 over HTTP(S).
*   **Discovery**: Agent Cards containing metadata like name, version, and skills.
*   **Interaction Model**: Asynchronous task-based flow (create → in-progress → completed/failed).
*   **Authentication**: Extensible support for Bearer tokens and API keys.

## Key APIs

### A2AClient
The primary class for consuming remote A2A services.
*   `fetchAgentCard()`: Retrieves the remote agent's metadata.
*   `sendTask(payload)`: Initiates a task with the remote agent.
*   `asTool()`: Wraps the client in a YAAF `Tool` interface for use within an agent's toolset.

### A2AServer
The primary class for hosting a YAAF agent as an A2A service.
*   `start()`: Begins listening for HTTP requests on the configured port and host.
*   `stop()`: Shuts down the server.

### Helper Functions
*   `a2aTool(url, config)`: A convenience function to quickly connect to a remote agent and return a YAAF tool.
*   `serveA2A(agent, config)`: A convenience function to instantiate and start an `A2AServer` for a specific agent.

## Configuration
The `A2AServer` is configured via the `A2AServerConfig` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The display name of the agent. |
| `description` | `string` | (Optional) A brief description of the agent's purpose. |
| `version` | `string` | (Optional) The version of the agent. |
| `skills` | `AgentSkill[]` | (Optional) A list of capabilities the agent supports. |
| `port` | `number` | The port to listen on (default: 4000). |
| `host` | `string` | The hostname to bind to (default: '0.0.0.0'). |
| `streaming` | `boolean` | Whether to enable SSE support (default: true). |
| `acceptedTokens` | `string[]` | (Optional) A list of valid Bearer tokens for authentication. |

## Extension Points
*   **Authentication**: Developers can provide `acceptedTokens` in the server configuration to secure endpoints. The protocol supports extensible authentication schemes via the Agent Card.
*   **Skills**: The `skills` array in the configuration allows developers to define specific functional areas the agent excels in, which remote clients can use for discovery and routing.
*   **Custom Logging**: The `onTask` callback allows for custom instrumentation when the server receives new tasks.

### Example Usage
```typescript
// CLIENT — wrap a remote agent as a YAAF tool
const weatherTool = a2aTool('https://remote-weather-agent.com');
const agent = new Agent({ tools: [weatherTool] });

// SERVER — expose a YAAF agent as A2A
const server = await serveA2A(myAgent, {
  name: 'My YAAF Agent',
  port: 4000,
  acceptedTokens: ['secret-token']
});
```