---
title: a2aTool
entity_type: api
summary: A factory function that connects to a remote A2A agent and wraps it as a standard YAAF Tool.
export_name: a2aTool
source_file: src/integrations/a2a.ts
category: function
stub: false
compiled_at: 2026-04-16T14:20:41.256Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/a2a.ts
confidence: 1
---

## Overview
`a2aTool` is a factory function used to facilitate Agent-to-Agent (A2A) interoperability. It allows a YAAF agent to communicate with and utilize remote agents as if they were local tools, provided the remote agent implements the A2A open protocol. 

The function abstracts the complexities of the A2A protocol—including JSON-RPC 2.0 transport over HTTP, Agent Card discovery, and task lifecycle management—into a standard YAAF `Tool` interface. This enables YAAF agents to delegate tasks to agents built on other frameworks such as LangGraph, BeeAI, or ADK.

## Signature / Constructor
```typescript
export function a2aTool(
  url: string, 
  config?: Omit<A2AClientConfig, 'url'>
): Tool
```

### Parameters
*   **url**: The base URL of the remote A2A-compliant agent (e.g., `https://remote-agent.example.com`).
*   **config**: Optional configuration object for the underlying A2A client. This typically includes authentication settings (such as bearer tokens) and connection preferences, excluding the URL which is provided as the first argument.

## Methods & Properties
As a factory function, `a2aTool` returns a `Tool` object. The returned tool encapsulates the following A2A protocol behaviors:
*   **Task Creation**: When the tool is invoked, it sends a task request to the remote agent.
*   **Polling/Streaming**: It manages the retrieval of results, supporting both polling and Server-Sent Events (SSE) for real-time updates if supported by the remote agent.
*   **Artifact Handling**: It maps remote task artifacts back into the YAAF tool execution result.

## Examples
The following example demonstrates how to wrap a remote weather agent as a tool and provide it to a YAAF agent.

```typescript
import { Agent } from 'yaaf';
import { a2aTool } from 'yaaf/integrations';

// Connect to a remote A2A agent and return a YAAF tool for it
const weatherTool = a2aTool('https://weather-agent.example.com');

// Use the remote agent as a standard tool within a YAAF Agent
const agent = new Agent({ 
  tools: [weatherTool] 
});
```

## See Also
*   A2AClient
*   A2AServer
*   serveA2A
*   Tool