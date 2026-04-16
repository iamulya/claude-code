---
summary: Configuration interface for registering an agent within the Delegate Architecture.
export_name: AgentEntry
source_file: src/agents/delegate.ts
category: type
title: AgentEntry
entity_type: api
stub: false
compiled_at: 2026-04-16T14:13:28.198Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/delegate.ts
confidence: 1
---

## Overview
`AgentEntry` is the primary configuration object used to register agents within the Delegate Architecture. It defines how an agent is identified, how it processes input, which messages it should respond to (routing), and how its session state is isolated from other interactions.

This type is used by the `AgentRouter` to manage a fleet of specialized agents, each potentially having its own personality, skill set, and availability status.

## Signature / Constructor

```typescript
export type AgentEntry = {
  id: string;
  agent: { run(input: string, signal?: AbortSignal): Promise<string> };
  displayName?: string;
  skills?: string[];
  routes?: RoutingRule[];
  sessionScope?: SessionScope;
  active?: boolean;
  meta?: Record<string, unknown>;
};
```

## Methods & Properties

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | **Required.** A unique identifier for the agent within the registry. |
| `agent` | `object` | **Required.** The agent runner instance. It must provide a `run` method that accepts a string and returns a `Promise<string>`. |
| `displayName` | `string` | *Optional.* A human-readable name for the agent, often used in UI components. |
| `skills` | `string[]` | *Optional.* A list of allowed skill names. An empty array typically implies all skills, while `undefined` may inherit system defaults. |
| `routes` | `RoutingRule[]` | *Optional.* An array of rules used to determine if this agent should handle an incoming message. Rules are checked in order. |
| `sessionScope` | `SessionScope` | *Optional.* Defines the isolation level for the agent's session. Defaults to `per-channel-sender`. |
| `active` | `boolean` | *Optional.* Indicates whether the agent is currently available for routing. |
| `meta` | `Record<string, unknown>` | *Optional.* Arbitrary metadata used for debugging or UI display. |

### Supporting Types

#### SessionScope
Determines how the framework isolates conversation history and state:
- `shared`: All messages across the system share a single session.
- `per-sender`: Isolation is based on the unique ID of the sender.
- `per-channel`: Isolation is based on the communication channel.
- `per-channel-sender`: Isolation is based on the combination of channel and sender (default).

#### RoutingRule
Defines the criteria for matching an inbound message to an agent:
- `match`: A `RegExp` pattern to test against the message text.
- `channels`: An array of specific channel IDs to match.
- `senders`: An array of specific sender IDs to match.
- `priority`: A numeric value (default `0`) used to resolve conflicts when multiple agents match a message. Higher values are checked first.

## Examples

### Basic Registration
This example demonstrates registering two specialized agents with specific routing rules.

```typescript
import { AgentRouter, AgentEntry } from 'yaaf';

const router = new AgentRouter();

const writerEntry: AgentEntry = {
  id: 'writer',
  agent: writerRunner,
  skills: ['grammar', 'style'],
  routes: [{ match: /write|essay|article/i }],
  sessionScope: 'per-sender'
};

const coderEntry: AgentEntry = {
  id: 'coder',
  agent: coderRunner,
  skills: ['code', 'test'],
  routes: [{ match: /code|bug|function/i }],
  sessionScope: 'per-channel'
};

router.register(writerEntry);
router.register(coderEntry);
```

### Routing and Execution
Once registered, the router uses the `AgentEntry` configuration to direct traffic.

```typescript
// The router selects the agent based on the RoutingRules in the AgentEntry
const agent = router.route(inboundMessage);

if (agent) {
  // Executes the 'run' method defined in the AgentEntry
  const response = await agent.run(inboundMessage.text);
}
```