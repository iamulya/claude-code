---
summary: Manages multiple named agents, their session isolation, and routes incoming messages based on rules.
primary_files:
 - src/agents/delegate.ts
title: Agent Routing Subsystem
entity_type: subsystem
exports:
 - AgentEntry
 - SessionScope
 - RoutingRule
search_terms:
 - multi-agent routing
 - route messages to agents
 - named agents
 - session isolation
 - agent delegation
 - how to register multiple agents
 - routing rules for agents
 - per-sender session scope
 - per-channel session scope
 - agent priority
 - OpenClaw delegate architecture
 - agent selection logic
 - message routing
 - agent router
stub: false
compiled_at: 2026-04-24T18:09:37.888Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/delegate.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Agent Routing Subsystem, also known as the Delegate Architecture, provides the capability to manage a collection of distinct, named agents within a single YAAF application [Source 1]. Its primary responsibility is to route incoming messages to the appropriate agent based on a configurable set of rules. This allows a single application to host multiple specialized agents, each with its own [Skills](../concepts/skills.md) and conversational context, and to select the correct one to handle a given request [Source 1].

This subsystem also manages [Session Isolation](../concepts/session-isolation.md), ensuring that conversational history for one agent does not leak into another, and can be scoped to specific users or [Channel](../apis/channel.md)s to maintain contextually relevant conversations [Source 1]. The design is inspired by the multi-agent routing, presence, and delegate architecture found in OpenClaw [Source 1].

## Architecture

The subsystem is centered around a router, such as the `AgentRouter` shown in the source example, which maintains a registry of agents [Source 1]. Each agent in the registry is defined by an `AgentEntry` object. This object contains the agent's unique `id`, the runnable agent instance itself, and a set of metadata and rules that govern its behavior and selection [Source 1].

Routing logic is driven by the `routes` property within each `AgentEntry`. This property is an array of `RoutingRule` objects. [when](../apis/when.md) a message is received, the router evaluates the rules for each registered agent. The first rule that matches the incoming message determines which agent is selected [Source 1]. A `RoutingRule` can match based on:
*   A regular expression (`match`) applied to the message text.
*   The message's source Channel (`channels`).
*   The message's sender (`senders`).

A `priority` number can be assigned to a rule to resolve ambiguity when multiple agents could potentially match a message; rules with a higher priority are evaluated first [Source 1].

A key architectural feature is session isolation, controlled by the `sessionScope` property on the `AgentEntry`. This determines how conversational [Memory](../concepts/memory.md) is partitioned. The available scopes are:
*   `shared`: All interactions with the agent share a single session.
*   `per-sender`: Each sender gets a unique session with the agent.
*   `per-channel`: All interactions within a specific channel share a session.
*   `per-channel-sender`: A unique session is created for each sender within each channel (the default) [Source 1].

## Key APIs

The primary public interface for this subsystem consists of the data structures used for configuration.

*   **`AgentEntry`**: A type that defines a single registered agent. It includes properties for a unique `id`, the `agent` runner instance, optional `skills`, an array of `routes`, the `sessionScope`, and other metadata [Source 1].
*   **`RoutingRule`**: A type that specifies the conditions for selecting an agent. It contains optional properties like `match` (RegExp), `channels` (string array), `senders` (string array), and `priority` (number) [Source 1].
*   **`SessionScope`**: A string literal type defining the available session isolation strategies: `"shared"`, `"per-sender"`, `"per-channel"`, and `"per-channel-sender"` [Source 1].

## Configuration

Developers configure the routing subsystem by creating instances of a router class (e.g., `AgentRouter`) and registering agents with it. Each agent is registered as an `AgentEntry` object, which specifies its identity, routing rules, and session scope [Source 1].

The following example demonstrates how to register two distinct agents, a 'writer' and a 'coder', each with its own set of routing rules based on keywords in the message text.

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

// Route a message
const agent = router.route(inboundMessage);
const response = await agent.run(inboundMessage.text);
```
[Source 1]

## Sources

*   [Source 1]: `src/agents/delegate.ts`