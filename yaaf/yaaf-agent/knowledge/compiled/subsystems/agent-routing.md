---
summary: Manages the registration and dispatching of messages to multiple named agents based on defined routing rules.
primary_files:
  - src/agents/delegate.ts
title: Agent Routing Subsystem
entity_type: subsystem
exports:
  - AgentEntry
  - RoutingRule
  - SessionScope
stub: false
compiled_at: 2026-04-16T14:13:26.840Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/delegate.ts
confidence: 0.95
---

## Purpose
The Agent Routing Subsystem provides a mechanism for managing multiple specialized agents within a single application. It facilitates the dispatching of incoming messages to specific agents based on explicit mentions, workspace context, or predefined routing rules. This architecture allows developers to build complex systems where different agents handle specific tasks (e.g., a "writer" agent for content and a "coder" agent for technical tasks) while maintaining strict session isolation.

## Architecture
The subsystem is modeled after a delegate architecture, where a central router coordinates multiple named agents. Each agent is registered with specific metadata and rules that determine when it should be invoked.

### Core Components
- **AgentEntry**: The primary configuration object for a routable agent. It encapsulates the agent's runner instance, its identity, and its operational constraints.
- **Routing Rules**: A set of criteria used to match inbound messages to the appropriate agent. Rules are evaluated in order of priority.
- **Session Management**: The subsystem handles session isolation to ensure that context is preserved correctly across different communication channels and senders.

### Session Isolation Scopes
The subsystem supports several levels of isolation via the `SessionScope` type:
- `shared`: All messages share a single session context.
- `per-sender`: Context is isolated by the sender's unique identifier.
- `per-channel`: Context is isolated by the communication channel.
- `per-channel-sender`: Context is isolated by both the channel and the sender (this is the default behavior).

## Key APIs
The subsystem defines several key interfaces and types for managing agent dispatching:

### AgentEntry
Defines the properties of a registered agent.
- `id`: A unique identifier for the agent.
- `agent`: An object containing a `run` method that processes input strings.
- `skills`: An optional list of strings defining the agent's capabilities.
- `routes`: An array of `RoutingRule` objects.
- `sessionScope`: Defines how the agent maintains state.
- `active`: A boolean flag indicating if the agent is available for routing.

### RoutingRule
Defines the logic for matching a message to an agent.
- `match`: A Regular Expression to test against the message text.
- `channels`: An array of allowed channel IDs.
- `senders`: An array of allowed sender IDs.
- `priority`: A numeric value (defaulting to 0) used to resolve matches when multiple agents satisfy the criteria; higher values are checked first.

## Configuration
Agents are typically configured and registered within an `AgentRouter`. The registration process involves defining the agent's runner and its associated routing logic.

```typescript
const router = new AgentRouter();

router.register({
  id: 'writer',
  agent: writerRunner,
  skills: ['grammar', 'style'],
  routes: [{ match: /write|essay|article/i }],
});

router.register({
  id: 'coder',
  agent: coderRunner,
  skills: ['code', 'test'],
  routes: [{ match: /code|bug|function/i }],
});

// Routing a message to the appropriate agent
const agent = router.route(inboundMessage);
const response = await agent.run(inboundMessage.text);
```

## Extension Points
The subsystem allows for flexible agent behavior through the `AgentEntry` configuration:
- **Skill Filtering**: Agents can be restricted to specific skills, allowing the router to filter agents based on the required capabilities for a task.
- **Custom Metadata**: The `meta` field in `AgentEntry` allows developers to attach arbitrary data to agents for use in UI components or debugging tools.
- **Priority Overrides**: By adjusting the `priority` in `RoutingRule`, developers can ensure that specific "catch-all" agents do not intercept messages intended for more specialized agents.