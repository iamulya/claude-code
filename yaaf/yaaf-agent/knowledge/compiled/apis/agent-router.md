---
export_name: AgentRouter
source_file: src/agents/delegate.ts
category: class
summary: A class for managing and routing messages to multiple named agents based on defined rules and context within the Agent Delegation Subsystem.
title: AgentRouter
entity_type: api
search_terms:
 - multi-agent routing
 - delegate architecture
 - route messages to agents
 - named agents
 - session isolation for agents
 - how to use multiple agents
 - agent delegation
 - routing rules
 - OpenClaw architecture
 - agent selection
 - message routing logic
 - per-sender session
 - per-channel session
 - agent coordinator
 - switch between agents
stub: false
compiled_at: 2026-04-25T00:04:15.774Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/delegate.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `AgentRouter` class is a central component of the [Agent Delegation](../concepts/agent-delegation.md) architecture. It manages a collection of distinct, named agents and routes incoming messages to the most appropriate one. Each registered agent can have its own unique skills, configuration, and [Session Isolation](../concepts/session-isolation.md) scope [Source 1].

Routing decisions are made by evaluating a set of [RoutingRules](./routing-rule.md) for each agent in priority order. The first agent whose rules match the incoming message (based on content, sender, or channel) is selected to handle the request. This allows for the creation of sophisticated, multi-agent systems where different specialized agents handle different types of tasks [Source 1].

The design is inspired by OpenClaw's multi-agent routing, presence, and delegate architecture [Source 1].

## Signature / Constructor

The `AgentRouter` is instantiated without any parameters. Agents are added post-construction using the `register` method [Source 1].

```typescript
class AgentRouter {
  constructor();
  // ... methods
}
```

## Methods & Properties

The public API for `AgentRouter` is inferred from usage examples in the source documentation [Source 1].

### register()

Registers a new agent with the router.

```typescript
register(entry: AgentEntry): void;
```

- **`entry`**: An [AgentEntry](./agent-entry.md) object that defines the agent's ID, its runner instance, skills, routing rules, and session scope [Source 1].

### route()

Evaluates an incoming message against the registered agents' routing rules and returns the appropriate agent runner to handle it.

```typescript
route(inboundMessage: InboundMessage): { run(input: string, signal?: AbortSignal): Promise<string> };
```

- **`inboundMessage`**: An object representing the incoming message. It should contain properties like `text`, `senderId`, and `channelId` that can be evaluated by the [RoutingRules](./routing-rule.md).
- **Returns**: The `agent` runner instance from the matched [AgentEntry](./agent-entry.md) [Source 1].

## Examples

The following example demonstrates how to create an `AgentRouter`, register two specialized agents (`writer` and `coder`), and then use the router to select the correct agent for a given message [Source 1].

```typescript
const router = new AgentRouter();

// Register a writer agent
router.register({
  id: 'writer',
  agent: writerRunner, // An object with a .run() method
  skills: ['grammar', 'style'],
  routes: [{ match: /write|essay|article/i }],
});

// Register a coder agent
router.register({
  id: 'coder',
  agent: coderRunner, // An object with a .run() method
  skills: ['code', 'test'],
  routes: [{ match: /code|bug|function/i }],
});

// An example inbound message
const inboundMessage = {
  text: 'Can you write a function to sort this array?',
  senderId: 'user-123',
  channelId: 'dev-channel'
};

// Route the message to the appropriate agent
const agent = router.route(inboundMessage); // This will select the 'coder' agent

// Run the selected agent
const response = await agent.run(inboundMessage.text);
```

## See Also

- [Agent Delegation](../concepts/agent-delegation.md): The core architectural concept that `AgentRouter` implements.
- [AgentEntry](./agent-entry.md): The configuration object used to register an agent with the router.
- [RoutingRule](./routing-rule.md): The type defining the rules for matching messages to agents.
- [Session Isolation](../concepts/session-isolation.md): A concept managed by the router to keep agent conversations separate.
- [AgentRunner](./agent-runner.md): The executable instance of an agent that the router manages and returns.

## Sources

[Source 1]: src/agents/delegate.ts