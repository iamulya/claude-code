---
title: serveA2A
entity_type: api
summary: A helper function to quickly expose a YAAF agent instance as an A2A-compliant server.
export_name: serveA2A
source_file: src/integrations/a2a.ts
category: function
stub: false
compiled_at: 2026-04-16T14:20:47.021Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/a2a.ts
confidence: 1
---

## Overview
`serveA2A` is a convenience function used to expose a YAAF agent as an endpoint compliant with the Agent-to-Agent (A2A) protocol. The A2A protocol is an open standard that enables interoperability between different agent frameworks (such as ADK, LangGraph, or BeeAI) using JSON-RPC 2.0 over HTTP.

When an agent is served via this function, it becomes discoverable via an Agent Card at `/.well-known/agent.json` and can handle task-based interactions, including real-time updates via Server-Sent Events (SSE).

## Signature
```typescript
export async function serveA2A(
  agent: A2AAgent,
  config: A2AServerConfig,
): Promise<{
  close: () => Promise<void>;
  port: number;
  host: string;
}>
```

### Parameters
*   `agent`: The YAAF agent instance to be exposed.
*   `config`: An `A2AServerConfig` object defining the server behavior and metadata.

### A2AServerConfig
The configuration object supports the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | **Required.** The display name of the agent. |
| `description` | `string` | A brief description of the agent's purpose. |
| `version` | `string` | The version string for the agent. |
| `skills` | `AgentSkill[]` | A list of capabilities or skills the agent supports. |
| `port` | `number` | The port to listen on. Defaults to `4000`. |
| `host` | `string` | The hostname to bind to. Defaults to `'0.0.0.0'`. |
| `streaming` | `boolean` | Whether to support SSE streaming for real-time updates. Defaults to `true`. |
| `acceptedTokens` | `string[]` | A list of Bearer tokens accepted for authentication. If empty, no authentication is required. |
| `onTask` | `function` | An optional callback triggered when a new task is received, useful for logging. |

## Examples

### Basic Server Setup
This example demonstrates how to expose an existing agent on port 4000.

```typescript
import { serveA2A } from 'yaaf/integrations/a2a';

const handle = await serveA2A(myAgent, {
  name: 'My YAAF Agent',
  description: 'A helpful assistant',
  skills: [{ id: 'general', name: 'General Q&A' }],
  port: 4000,
});

// Later, to stop the server:
// await handle.close();
```

### Server with Authentication and Logging
This example configures the server with a specific bearer token and a task callback.

```typescript
const handle = await serveA2A(myAgent, {
  name: 'Secure Agent',
  port: 8080,
  acceptedTokens: ['secret-api-key-123'],
  onTask: ({ id, message }) => {
    console.log(`Received task ${id}: ${message}`);
  }
});
```

## See Also
*   `A2AServer` — The underlying class used by this helper function.
*   `A2AClient` — The client-side implementation for calling remote A2A agents.
*   `a2aTool` — A helper to wrap a remote A2A agent as a YAAF tool.