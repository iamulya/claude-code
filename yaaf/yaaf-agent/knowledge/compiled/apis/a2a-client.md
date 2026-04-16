---
title: A2AClient
entity_type: api
summary: A client for interacting with remote A2A-compatible agents, supporting discovery, task management, and streaming.
export_name: A2AClient
source_file: src/integrations/a2a.ts
category: class
stub: false
compiled_at: 2026-04-16T14:20:37.811Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/a2a.ts
confidence: 1
---

## Overview
The `A2AClient` class provides a client-side implementation of the A2A (Agent-to-Agent) open protocol. It enables YAAF agents to communicate with remote agents regardless of the framework they were built with (such as ADK, LangGraph, or BeeAI), provided they adhere to the A2A specification.

The client manages the lifecycle of remote interactions, including:
- **Discovery**: Fetching Agent Cards via `/.well-known/agent.json`.
- **Task Management**: Creating, polling, and managing tasks using JSON-RPC 2.0 over HTTP(S).
- **Streaming**: Supporting real-time updates via Server-Sent Events (SSE).
- **Tool Integration**: Wrapping remote agents as standard YAAF tools for use within local agent workflows.

## Signature / Constructor

```typescript
export class A2AClient {
  constructor(url: string, config?: A2AClientConfig);
}
```

### Parameters
- `url`: The base URL of the remote A2A-compliant agent.
- `config`: (Optional) Configuration options for the client, including authentication and transport settings.

## Methods & Properties

### fetchAgentCard
`fetchAgentCard(): Promise<AgentCard>`
Retrieves the remote agent's metadata, including its name, description, version, and supported skills. This is typically fetched from the `/.well-known/agent.json` endpoint.

### sendTask
`sendTask(params: TaskParams): Promise<TaskResult>`
Sends a task request to the remote agent. This method handles the JSON-RPC 2.0 handshake and returns the initial task status and any immediate artifacts.

### asTool
`asTool(): Tool`
Wraps the `A2AClient` instance into a YAAF `Tool` object. This allows the remote agent to be passed into the `tools` array of a local YAAF agent, enabling cross-agent orchestration.

## Examples

### Basic Interaction
This example demonstrates how to discover a remote agent's capabilities and send a direct task.

```typescript
import { A2AClient } from 'yaaf';

const client = new A2AClient('https://remote-agent.example.com');

// Discover agent capabilities
const card = await client.fetchAgentCard();
console.log(`Connected to: ${card.name}`);
console.log(`Skills: ${card.skills.map(s => s.name).join(', ')}`);

// Execute a task
const result = await client.sendTask({
  message: { 
    role: 'user', 
    parts: [{ text: 'What is the weather in Tokyo?' }] 
  },
});

console.log(`Status: ${result.status}`);
console.log(`Response: ${result.artifacts}`);
```

### Using a Remote Agent as a Tool
This example shows how to integrate a remote agent into a local YAAF agent's toolset.

```typescript
import { A2AClient, Agent } from 'yaaf';

const remoteClient = new A2AClient('https://weather-agent.example.com');
const weatherTool = remoteClient.asTool();

const localAgent = new Agent({
  tools: [weatherTool],
  systemPrompt: "You are a helpful assistant that uses tools to answer questions."
});
```

## See Also
- `A2AServer`: The server-side implementation for exposing YAAF agents via the A2A protocol.
- `a2aTool`: A factory function for quickly creating a tool from a remote A2A URL.