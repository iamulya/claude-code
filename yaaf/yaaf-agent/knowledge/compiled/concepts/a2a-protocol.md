---
title: A2A Protocol
entity_type: concept
summary: An open protocol for agent-to-agent interoperability enabling YAAF agents to communicate with agents from any framework.
related_subsystems:
  - integrations
  - tools
stub: false
compiled_at: 2026-04-16T14:20:28.394Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/a2a.ts
confidence: 1
---

## What It Is
The A2A (Agent-to-Agent) Protocol is an open standard designed to facilitate interoperability between different AI agent frameworks. It allows agents built with YAAF to communicate seamlessly with agents built on other platforms, such as ADK, LangGraph, or BeeAI, provided they adhere to the A2A specification.

The protocol addresses the challenge of framework silos by providing a common language for discovery, task delegation, and real-time communication. It is built on established web standards, including JSON-RPC 2.0 and Server-Sent Events (SSE).

## How It Works in YAAF
YAAF implements the A2A Protocol through two primary components located in the `integrations/a2a` module: the `A2AClient` and the `A2AServer`.

### Protocol Specifications
The implementation follows these core protocol pillars:
- **Transport**: Uses JSON-RPC 2.0 over HTTP or HTTPS.
- **Discovery**: Agents expose their capabilities via "Agent Cards," which are JSON documents located at the `/.well-known/agent.json` endpoint.
- **Interaction Model**: Communication is structured around "Tasks" that transition through states: created, in-progress, and finally completed or failed.
- **Streaming**: Real-time updates and partial responses are handled via Server-Sent Events (SSE).
- **Authentication**: Supports extensible authentication schemes, including Bearer tokens and API keys, as defined in the Agent Card.

### Client-Side Integration
The `A2AClient` allows a YAAF application to call remote A2A-compliant agents. It manages the lifecycle of fetching Agent Cards, creating tasks, and polling for results or subscribing to SSE streams. 

YAAF provides a helper function, `a2aTool`, which wraps a remote A2A agent into a standard YAAF `Tool`. This allows a local YAAF agent to use a remote agent as if it were a local function or capability.

### Server-Side Integration
The `A2AServer` enables developers to expose a YAAF agent as an A2A-compliant endpoint. It automatically handles:
- The `GET /.well-known/agent.json` discovery endpoint.
- JSON-RPC 2.0 handlers for `tasks/send`, `tasks/get`, and `tasks/cancel`.
- SSE streaming via `tasks/sendSubscribe`.

## Configuration
Developers configure the A2A integration by defining server settings or instantiating clients with specific remote URLs.

### Server Configuration
The `A2AServerConfig` object allows for detailed specification of the exposed agent's identity and network behavior:

```typescript
export type A2AServerConfig = {
  name: string;           // Agent display name
  description?: string;    // Agent description
  version?: string;        // Agent version
  skills?: AgentSkill[];   // Skills this agent supports
  port?: number;           // Port to listen on (Default: 4000)
  host?: string;           // Hostname to bind to (Default: '0.0.0.0')
  streaming?: boolean;     // Whether to support SSE streaming (Default: true)
  acceptedTokens?: string[]; // Bearer tokens for authentication
  onTask?: (task: { id: string; message: string }) => void; // Logging callback
}
```

### Implementation Examples

**Exposing a YAAF Agent via A2A:**
```typescript
import { serveA2A } from 'yaaf/integrations/a2a';

const handle = await serveA2A(myAgent, { 
  name: 'My YAAF Agent', 
  port: 4000,
  skills: [{ id: 'general', name: 'General Q&A' }]
});
```

**Consuming a Remote Agent as a Tool:**
```typescript
import { a2aTool } from 'yaaf/integrations/a2a';
import { Agent } from 'yaaf';

// Connect to a remote agent
const weatherTool = a2aTool('https://remote-weather-agent.example.com');

// Provide the remote agent to a local YAAF agent
const agent = new Agent({ 
  tools: [weatherTool] 
});
```

## Sources
- `src/integrations/a2a.ts`