---
summary: The primary class for managing multiple agents and routing inbound messages to the appropriate handler.
export_name: AgentRouter
source_file: src/agents/delegate.ts
category: class
title: AgentRouter
entity_type: api
stub: false
compiled_at: 2026-04-16T14:13:28.087Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/delegate.ts
confidence: 0.9
---

## Overview
`AgentRouter` implements a Delegate Architecture designed to manage multiple named agents within a single system. It provides session isolation and routes incoming messages to specific agents based on explicit mentions, workspace context, or predefined routing rules. 

Each agent managed by the router is assigned a specific personality, set of skills, and session scope. The router ensures that messages are handled by the most appropriate agent by evaluating `RoutingRule` criteria such as regex patterns, channel IDs, or sender IDs.

## Signature / Constructor

```typescript
export class AgentRouter {
  constructor();

  /** Registers a new agent with the router */
  register(entry: AgentEntry): void;

  /** Routes an inbound message to the appropriate agent runner */
  route(message: any): { run(input: string, signal?: AbortSignal): Promise<string> };
}

export type AgentEntry = {
  /** Unique agent identifier */
  id: string;
  /** The agent runner instance */
  agent: { run(input: string, signal?: AbortSignal): Promise<string> };
  /** Human-readable display name */
  displayName?: string;
  /** Allowed skill names (empty = all, undefined = inherit defaults) */
  skills?: string[];
  /** Routing rules — checked in order, first match wins */
  routes?: RoutingRule[];
  /**
   * Session isolation scope.
   * - 'shared': all messages share one session
   * - 'per-sender': isolated by sender ID
   * - 'per-channel': isolated by channel
   * - 'per-channel-sender': isolated by channel + sender (default)
   */
  sessionScope?: SessionScope;
  /** Whether this agent is currently available */
  active?: boolean;
  /** Agent metadata (for UI/debugging) */
  meta?: Record<string, unknown>;
}

export type SessionScope = 'shared' | 'per-sender' | 'per-channel' | 'per-channel-sender';

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
}
```

## Methods & Properties

### register(entry)
Adds an agent to the router's registry. The `AgentEntry` defines the agent's identity, its execution logic (`agent`), and the rules governing when it should be invoked.

### route(message)
Evaluates the provided message against the registered agents' `RoutingRule` sets. It returns the agent runner instance that matches the criteria. Rules are evaluated based on their `priority`, with higher values checked first.

## Examples

### Basic Multi-Agent Routing
This example demonstrates registering two specialized agents and routing messages based on text patterns.

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

// Route a message containing "code"
const agent = router.route({ text: "Fix this code bug", channelId: "dev-chat" });
const response = await agent.run("Fix this code bug");
```

## See Also
* `AgentEntry`
* `RoutingRule`
* `SessionScope`