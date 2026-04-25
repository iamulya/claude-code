---
summary: Defines the criteria for routing incoming messages to specific agents within the Agent Routing Subsystem.
export_name: RoutingRule
source_file: src/agents/delegate.ts
category: type
title: RoutingRule
entity_type: api
search_terms:
 - agent routing conditions
 - how to route messages to agents
 - message matching rules
 - delegate agent routing
 - AgentRouter configuration
 - route by channel
 - route by sender
 - route by regex
 - routing priority
 - conditional agent selection
 - AgentEntry routes
 - configure agent routing
stub: false
compiled_at: 2026-04-24T17:34:10.957Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/delegate.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `RoutingRule` type defines a set of conditions used by the `AgentRouter` to determine which registered agent should handle an incoming message. It is a core component of the Delegate Architecture for [Multi-Agent Systems](../concepts/multi-agent-systems.md) in YAAF [Source 1].

Each agent registered with an `AgentRouter` can have an array of `RoutingRule` objects. The router evaluates these rules in order, and the first rule that matches the incoming message's properties (such as its text content, source [Channel](./channel.md), or sender) determines the agent to which the message is routed. This mechanism allows for flexible and powerful conditional routing logic, directing tasks to the most appropriate specialized agent [Source 1].

## Signature

`RoutingRule` is a type alias for an object with the following properties [Source 1]:

```typescript
export type RoutingRule = {
  /** Regex pattern to match against message text */
  match?: RegExp;
  /** Match messages from specific channels */
  channels?: string[];
  /** Match messages from specific senders */
  senders?: string[];
  /**
   * Routing priority (higher = checked first).
   * Default: 0. Use to override [[[[[[[[when]]]]]]]] multiple agents match.
   */
  priority?: number;
};
```

### Properties

*   **`match?: RegExp`**: An optional regular expression that is tested against the text content of the incoming message. If the pattern matches, the rule is considered a match.
*   **`channels?: string[]`**: An optional array of channel identifiers. If the message originates from one of the specified channels, the rule is considered a match.
*   **`senders?: string[]`**: An optional array of sender identifiers. If the message is sent by one of the specified senders, the rule is considered a match.
*   **`priority?: number`**: An optional number that determines the rule's evaluation order. Rules with a higher priority value are checked before rules with a lower priority. The default priority is `0`. This is useful for creating overrides when a message might match rules for multiple agents [Source 1].

## Examples

The following example demonstrates how to define `RoutingRule` objects within an `AgentEntry` for an `AgentRouter`.

```typescript
import type { AgentEntry, RoutingRule } from 'yaaf';

// A placeholder for an actual agent runner
const writerRunner = { run: async (input: string) => `Writer processed: ${input}` };
const editorRunner = { run: async (input:string) => `Editor processed: ${input}` };

// Agent entry for a "writer" agent
const writerAgent: AgentEntry = {
  id: 'writer',
  agent: writerRunner,
  routes: [
    // Rule 1: Matches messages containing keywords like "write" or "essay"
    { match: /write|essay|article/i },
    // Rule 2: Matches any message sent in the 'content-creation' channel
    { channels: ['content-creation'] },
  ],
};

// Agent entry for a high-priority "editor" agent
const editorAgent: AgentEntry = {
  id: 'editor',
  agent: editorRunner,
  routes: [
    // Rule 3: Matches any message from a specific user ID ('user-editor-123')
    // across any channel, with a high priority to ensure it's checked first.
    { senders: ['user-editor-123'], priority: 100 },
  ],
};

// These AgentEntry objects would then be registered with an AgentRouter.
// const router = new AgentRouter();
// router.register(writerAgent);
// router.register(editorAgent);
```
In this example, a message from `user-editor-123` containing the word "write" would be routed to the `editorAgent` because its routing rule has a higher `priority`, even though the message also matches a rule for the `writerAgent` [Source 1].

## Sources

[Source 1]: src/agents/delegate.ts