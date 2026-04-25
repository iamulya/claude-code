---
summary: Defines the configuration structure for registering an agent with the Agent Routing Subsystem.
export_name: AgentEntry
source_file: src/agents/delegate.ts
category: type
title: AgentEntry
entity_type: api
search_terms:
 - agent registration
 - configure agent router
 - agent routing rules
 - session scope for agents
 - delegate agent configuration
 - how to add an agent
 - agent skills
 - agent metadata
 - routing priority
 - multi-agent setup
 - AgentRouter register method
 - define agent behavior
stub: false
compiled_at: 2026-04-24T16:47:14.403Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/delegate.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `AgentEntry` type defines the configuration object used to register a named agent within YAAF's delegate architecture [Source 1]. This architecture manages multiple agents, each with its own distinct personality, [Skills](../concepts/skills.md), and session scope. An `AgentEntry` object encapsulates all the necessary information for an `AgentRouter` to identify, route messages to, and manage the lifecycle of an agent.

This configuration includes a unique identifier, the agent's core logic, routing rules, [Session Isolation](../concepts/session-isolation.md) strategy, and other metadata. It is the primary mechanism for adding new capabilities to a multi-agent system [Source 1].

## Signature

`AgentEntry` is a TypeScript type alias for an object. Its structure and the related types it uses are defined as follows [Source 1]:

```typescript
export type AgentEntry = {
  /** Unique agent identifier */
  id: string;
  /** The agent runner instance */
  agent: { run(input: string, signal?: AbortSignal): Promise<string> };
  /** Human-readable display name */
  displayName?: string;
  /** Allowed Skill names (empty = all, undefined = inherit defaults) */
  Skills?: string[];
  /** Routing rules — checked in order, first match wins */
  routes?: RoutingRule[];
  /**
   * Session isolation scope.
   * - 'shared': all messages share one session
   * - 'per-sender': isolated by sender ID
   * - 'per-Channel': isolated by Channel
   * - 'per-[[Channel]]-sender': isolated by [[Channel]] + sender (default)
   */
  sessionScope?: SessionScope;
  /** Whether this agent is currently available */
  active?: boolean;
  /** Agent metadata (for UI/debugging) */
  meta?: Record<string, unknown>;
};

export type SessionScope = "shared" | "per-sender" | "per-[[Channel]]" | "per-[[Channel]]-sender";

export type RoutingRule = {
  /** Regex pattern to match against message text */
  match?: RegExp;
  /** Match messages from specific channels */
  channels?: string[];
  /** Match messages from specific senders */
  senders?: string[];
  /**
   * Routing priority (higher = checked first).
   * Default: 0. Use to override when multiple agents match.
   */
  priority?: number;
};
```

### Properties

*   **`id`**: `string` (required) - A unique identifier for the agent.
*   **`agent`**: `{ run(input: string, signal?: AbortSignal): Promise<string> }` (required) - The agent runner instance, which is an object containing the core `run` method that executes the agent's logic.
*   **`displayName`**: `string` (optional) - A human-readable name for the agent, often used in user interfaces.
*   **`[[Skill]]s`**: `string[]` (optional) - A list of [Skill](./skill.md) names this agent possesses. This can be used for capability-based routing. An empty array implies the agent has all skills, while `undefined` means it inherits default skills.
*   **`routes`**: `RoutingRule[]` (optional) - An array of routing rules. The router checks these in order, and the first rule that matches an incoming message will cause this agent to be selected.
*   **`sessionScope`**: `SessionScope` (optional) - Defines the session isolation strategy. Defaults to `'per-channel-sender'`. The possible values are:
    *   `'shared'`: A single session is shared for all interactions with this agent.
    *   `'per-sender'`: Each unique sender gets their own isolated session.
    *   `'per-channel'`: Each channel has its own isolated session.
    *   `'per-channel-sender'`: A session is unique to a specific sender within a specific channel.
*   **`active`**: `boolean` (optional) - A flag to enable or disable the agent. If `false`, the agent will not be considered for routing.
*   **`meta`**: `Record<string, unknown>` (optional) - An object for storing arbitrary metadata, useful for UI rendering or debugging purposes.

## Examples

The following example demonstrates how to define two `AgentEntry` objects, one for a "writer" agent and one for a "coder" agent, and register them with an `AgentRouter`.

```typescript
import { AgentEntry } from 'yaaf';

// A mock agent runner for demonstration
const writerRunner = {
  async run(input: string): Promise<string> {
    return `Writing about: ${input}`;
  },
};

const coderRunner = {
  async run(input: string): Promise<string> {
    return `// Coding solution for: ${input}`;
  },
};

// Define the writer agent configuration
const writerAgentEntry: AgentEntry = {
  id: 'writer',
  displayName: 'Creative Writer',
  agent: writerRunner,
  skills: ['grammar', 'style'],
  routes: [{ match: /write|essay|article/i }],
  sessionScope: 'per-sender',
  active: true,
};

// Define the coder agent configuration
const coderAgentEntry: AgentEntry = {
  id: 'coder',
  displayName: 'Code Assistant',
  agent: coderRunner,
  skills: ['code', 'test'],
  routes: [{ match: /code|bug|function/i }],
  sessionScope: 'per-channel-sender',
};

/*
// These entries would then be used with an AgentRouter instance:
const router = new AgentRouter();
router.register(writerAgentEntry);
router.register(coderAgentEntry);
*/
```

## See Also

*   **AgentRouter**: The class responsible for managing and routing messages to agents registered using `AgentEntry` configurations.

## Sources

[Source 1] `src/agents/delegate.ts`