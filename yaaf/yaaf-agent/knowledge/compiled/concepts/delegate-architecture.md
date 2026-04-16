---
summary: A multi-agent pattern for routing messages to specialized agents with isolated session scopes.
title: Delegate Architecture
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:13:18.503Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/delegate.ts
confidence: 1
---

---
title: Delegate Architecture
entity_type: concept
summary: A multi-agent pattern for routing messages to specialized agents with isolated session scopes.
related_subsystems:
  - agents

## What It Is
Delegate Architecture is a multi-agent design pattern in YAAF used to manage and route messages to specialized agents. It allows a system to host multiple agents, each possessing distinct personalities, skill sets, and session boundaries. 

This architecture solves the problem of monolithic agent design by delegating specific tasks—such as writing or coding—to specialized "runners" based on the content of an inbound message or the context of the communication channel. It is inspired by the multi-agent routing and presence models found in OpenClaw.

## How It Works in YAAF
The architecture centers around an agent router (typically implemented via an `AgentRouter` class) that maintains a registry of agents defined by the `AgentEntry` type. When a message is received, the router evaluates it against defined `RoutingRule` sets to determine which agent should handle the request.

### Agent Registration
Each agent in the architecture is defined as an `AgentEntry`, which includes:
- **Identity**: A unique `id` and an optional `displayName`.
- **Runner**: An object implementing a `run` method to process input.
- **Capabilities**: A list of `skills` that define what the agent can perform.
- **Routing Rules**: Criteria used to match inbound messages to the agent.
- **Session Scope**: Configuration for how the agent maintains state and memory.

### Routing Logic
Routing is determined by `RoutingRule` objects. The router checks these rules in order of `priority` (higher values are checked first). Rules can match based on:
- **Regex Patterns**: Matching specific text within the message (e.g., keywords like "code" or "essay").
- **Channel Filtering**: Restricting agents to specific communication channels.
- **Sender Filtering**: Restricting agents to specific users or senders.

### Session Isolation
A core feature of the Delegate Architecture is `SessionScope`. This defines how the framework partitions conversation history and state for each agent:
- `shared`: All messages across the system share a single session context.
- `per-sender`: Context is isolated to the specific user sending the message.
- `per-channel`: Context is isolated to the specific channel or room.
- `per-channel-sender`: Context is isolated to a specific user within a specific channel (the default behavior).

## Configuration
Developers configure the Delegate Architecture by registering agents with specific routing criteria and session behaviors.

```typescript
const router = new AgentRouter();

router.register({
  id: 'writer',
  agent: writerRunner,
  skills: ['grammar', 'style'],
  routes: [{ match: /write|essay|article/i }],
  sessionScope: 'per-sender'
});

router.register({
  id: 'coder',
  agent: coderRunner,
  skills: ['code', 'test'],
  routes: [{ match: /code|bug|function/i }],
  sessionScope: 'per-channel'
});

// Routing a message to the appropriate agent
const agent = router.route(inboundMessage);
if (agent) {
  const response = await agent.run(inboundMessage.text);
}
```

## Sources
- `src/agents/delegate.ts`