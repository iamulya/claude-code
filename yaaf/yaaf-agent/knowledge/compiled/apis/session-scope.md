---
summary: Enumeration of strategies for isolating agent sessions across different contexts.
export_name: SessionScope
source_file: src/agents/delegate.ts
category: type
title: SessionScope
entity_type: api
stub: false
compiled_at: 2026-04-16T14:13:34.501Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/delegate.ts
confidence: 1
---

## Overview
`SessionScope` defines the isolation boundaries for agent sessions within the YAAF Delegate Architecture. It determines how the framework partitions conversation state and history when routing messages to specific agents. By configuring the scope, developers can control whether an agent maintains a single global conversation, individual threads for each user, or separate contexts for different communication channels.

This type is primarily used within the `AgentEntry` configuration when registering agents with a router.

## Signature / Constructor

```typescript
export type SessionScope = 
  | 'shared' 
  | 'per-sender' 
  | 'per-channel' 
  | 'per-channel-sender';
```

## Values

| Value | Description |
| :--- | :--- |
| `shared` | All messages routed to the agent share a single, global session context. |
| `per-sender` | Sessions are isolated based on the unique ID of the sender, regardless of the channel. |
| `per-channel` | Sessions are isolated by the communication channel (e.g., a specific chat room or thread). |
| `per-channel-sender` | Sessions are isolated by a combination of both channel and sender ID. This is the default behavior. |

## Examples

### Configuring Session Isolation
In this example, a "researcher" agent is configured to have a shared session so all users in a workspace can contribute to the same research context, while a "personal-assistant" agent is isolated per sender.

```typescript
import { AgentEntry } from './src/agents/delegate';

const researcherEntry: AgentEntry = {
  id: 'researcher',
  agent: researcherRunner,
  sessionScope: 'shared',
  routes: [{ match: /research/i }]
};

const assistantEntry: AgentEntry = {
  id: 'assistant',
  agent: assistantRunner,
  sessionScope: 'per-sender',
  routes: [{ match: /help/i }]
};
```

## See Also
- `AgentEntry`
- `RoutingRule`