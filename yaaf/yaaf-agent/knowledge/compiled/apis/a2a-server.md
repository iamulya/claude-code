---
title: A2AServer
entity_type: api
summary: A server implementation that exposes YAAF agents as A2A-compliant endpoints for external discovery and interaction.
export_name: A2AServer
source_file: src/integrations/a2a.ts
category: class
stub: false
compiled_at: 2026-04-16T14:21:03.891Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/a2a.ts
confidence: 1
---

## Overview
`A2AServer` is a class used to expose YAAF agents as endpoints compliant with the A2A (Agent-to-Agent) open protocol. This enables interoperability between YAAF agents and agents built on other frameworks (such as ADK, LangGraph, or BeeAI) that support the A2A standard.

The server implements the following protocol features:
*   **Discovery**: Serves an Agent Card (JSON) at `/.well-known/agent.json` to describe agent capabilities and skills.
*   **Interaction**: Provides a JSON-RPC 2.0 handler for managing tasks (creation, retrieval, and cancellation).
*   **Streaming**: Supports real-time updates via Server-Sent Events (SSE).
*   **Authentication**: Supports extensible authentication schemes, including Bearer tokens and API keys.

## Signature / Constructor

```typescript
export class A2AServer {
  constructor(agent: A2AAgent, config: A2AServerConfig);
}
```

### A2AServerConfig
The configuration object for the A2A server:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name