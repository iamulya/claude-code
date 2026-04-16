---
summary: Defines criteria for matching inbound messages to specific agents based on text, channel, or sender.
export_name: RoutingRule
source_file: src/agents/delegate.ts
category: type
title: RoutingRule
entity_type: api
stub: false
compiled_at: 2026-04-16T14:13:35.422Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/delegate.ts
confidence: 1
---

## Overview
`RoutingRule` is a configuration type used within the delegate architecture of YAAF to direct incoming messages to the appropriate agent. It allows developers to define declarative logic for agent selection based on message content, origin channel, or the identity of the sender. 

In a multi-agent system, these rules are typically evaluated by a router to determine which agent runner should process a specific interaction. Rules are checked in order of priority, and the first rule to match successfully determines the target agent.

## Signature / Constructor

```typescript
export type RoutingRule = {
  /** Regex pattern to match against message text */
  match?: RegExp
  /** Match messages from specific channels */
  channels?: string[]
  /** Match messages from specific senders */
  senders?: string[]
  /**
   * Routing priority (higher = checked first).
   * Default: 0. Use to override when multiple agents match.
   */
  priority?: number
}
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `match` | `RegExp` | (Optional) A regular expression pattern tested against the inbound message text. |
| `channels` | `string[]` | (Optional) An array of channel identifiers. The rule matches if the message originates from one of these channels. |
| `senders` | `string[]` | (Optional) An array of sender identifiers. The rule matches if the message was sent by one of these users/entities. |
| `priority` | `number` | (Optional) Determines the evaluation order. Rules with higher priority values are checked before those with lower values. Defaults to `0`. |

## Examples

### Basic Text Matching
This example defines a rule that matches messages containing keywords related to writing.

```typescript
const writingRule: RoutingRule = {
  match: /write|essay|article/i,
  priority: 1
};
```

### Channel and Sender Filtering
This example restricts an agent to only respond to specific users within a designated "admin" channel.

```typescript
const adminOnlyRule: RoutingRule = {
  channels: ['admin-ops'],
  senders: ['user_01', 'user_02'],
  priority: 100
};
```

### Integration with Agent Registration
Routing rules are typically provided as part of an agent's registration within a router.

```typescript
const agentEntry = {
  id: 'coder',
  agent: coderRunner,
  routes: [
    { match: /code|bug|function/i, priority: 5 }
  ]
};
```

## See Also
* `AgentEntry` (The container for routing rules and agent instances)