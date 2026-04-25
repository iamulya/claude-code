---
title: Agent Delegation Subsystem
summary: Manages routing of messages to multiple named agents, each with their own personality, skills, and session scope, based on explicit mentions, workspace context, or routing rules.
primary_files:
 - src/agents/delegate.ts
entity_type: subsystem
exports:
 - AgentEntry
 - SessionScope
 - RoutingRule
search_terms:
 - multi-agent routing
 - named agent management
 - how to route messages to agents
 - session isolation for agents
 - agent routing rules
 - delegate architecture
 - OpenClaw agent routing
 - per-sender session scope
 - per-channel session scope
 - agent skills matching
 - routing priority
 - select agent based on message
stub: false
compiled_at: 2026-04-25T00:27:36.221Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/delegate.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Agent Delegation Subsystem provides a mechanism for managing and routing incoming messages to a pool of distinct, named agents. Each agent can have its own unique personality, set of skills, and conversational memory scope. This subsystem solves the problem of selecting the most appropriate agent to handle a given task based on the content of a message, its origin (sender or channel), or other contextual cues [Source 1].

This architecture, inspired by OpenClaw's multi-agent routing and delegate model, enables the creation of sophisticated, multi-agent systems where specialized agents can be invoked on demand, a core concept in [Agent Delegation](../concepts/agent-delegation.md) [Source 1].

## Architecture

The subsystem is architecturally centered around a router object that maintains a registry of available agents. Each agent is defined by an [AgentEntry](../apis/agent-entry.md) configuration object, which encapsulates all the necessary information for routing and execution [Source 1].

An [AgentEntry](../apis/agent-entry.md) includes:
- A unique `id` for the agent.
- The `agent` runner instance responsible for executing the agent's logic.
- A list of `skills` the agent possesses.
- An array of [RoutingRule](../apis/routing-rule.md) objects that define the conditions for activating the agent.
- A [SessionScope](../apis/session-scope.md) setting that controls [Session Isolation](../concepts/session-isolation.md) for the agent's conversational memory.
- Optional metadata such as `displayName`, an `active` status flag, and a `meta` object for UI or debugging purposes [Source 1].

When a message is received, the router evaluates it against the [RoutingRule](../apis/routing-rule.md)s of each registered agent. Rules are checked in order, with the first match determining the selected agent. A `priority` field within a [RoutingRule](../apis/routing-rule.md) can be used to influence this evaluation order when multiple agents could potentially match a message [Source 1].

## Integration Points

- **[Agent Orchestration System](./agent-orchestration-system.md)**: This subsystem is a key component of the broader orchestration layer. The orchestrator receives incoming messages and uses the Agent Delegation Subsystem to determine which specific agent should process the request.
- **[Gateway & Channels Subsystem](./gateway-channels-subsystem.md)**: The delegation subsystem relies on metadata provided by the gateway, such as sender and channel IDs, to evaluate routing rules that are scoped to specific users or conversation spaces [Source 1].
- **[Agent Core](./agent-core.md)**: The `agent` property within an [AgentEntry](../apis/agent-entry.md) is a direct link to an agent runner instance, which is the primary interface to the core logic of an individual agent.

## Key APIs

The public interface of this subsystem is primarily defined by its data structures used for configuration.

- [AgentEntry](../apis/agent-entry.md): A configuration object that defines a single, named agent, its capabilities, routing logic, and session management strategy [Source 1].
- [RoutingRule](../apis/routing-rule.md): An object that specifies criteria for routing a message to an agent, such as regex matching on message text, or filtering by channel or sender IDs [Source 1].
- [SessionScope](../apis/session-scope.md): A type defining the strategy for isolating an agent's conversational memory, with options like `'shared'`, `'per-sender'`, and `'per-channel'` [Source 1].

## Configuration

Developers configure the Agent Delegation Subsystem by instantiating a router and programmatically registering one or more agents. Each agent is defined using an [AgentEntry](../apis/agent-entry.md) object.

The following example demonstrates how to register two specialized agents, a `writer` and a `coder`, each with distinct skills and routing rules based on message content [Source 1].

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

// Later, to route a message:
const agent = router.route(inboundMessage);
const response = await agent.run(inboundMessage.text);
```

## Sources

[Source 1]: src/agents/delegate.ts