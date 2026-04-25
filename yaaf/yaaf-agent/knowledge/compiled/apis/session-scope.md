---
summary: Defines the available scopes for agent session isolation within the Agent Routing Subsystem.
export_name: SessionScope
source_file: src/agents/delegate.ts
category: type
title: SessionScope
entity_type: api
search_terms:
 - agent session isolation
 - conversation context scope
 - shared agent memory
 - per-user session
 - per-channel session
 - multi-user agent state
 - AgentEntry sessionScope
 - delegate architecture session
 - how to isolate agent conversations
 - session management
 - stateful agent scope
 - routing session scope
stub: false
compiled_at: 2026-04-24T17:37:32.771Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/delegate.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`SessionScope` is a type alias that defines the set of possible values for controlling [Session Isolation](../concepts/session-isolation.md) in routed agents. [when](./when.md) an agent is registered with an `AgentRouter` via an `AgentEntry` configuration, the `sessionScope` property determines how its conversational [Memory](../concepts/memory.md) and state are partitioned [Source 1].

This allows for fine-grained control over an agent's context. For example, an agent can be configured to have a single shared memory across all interactions, or to maintain separate, private conversations with each user, in each [Channel](./channel.md), or a combination thereof [Source 1]. The default scope is `'per-channel-sender'` [Source 1].

## Signature

`SessionScope` is a string literal type with the following possible values [Source 1]:

```typescript
export type SessionScope =
  | "shared"
  | "per-sender"
  | "per-channel"
  | "per-channel-sender";
```

### Values

-   **`'shared'`**: The agent uses a single, global session for all messages it processes, regardless of the sender or channel.
-   **`'per-sender'`**: The agent maintains a separate session for each unique sender ID. All interactions with a specific user will share the same context, across any channel.
-   **`'per-channel'`**: The agent maintains a separate session for each unique channel. All users interacting with the agent in that channel will share the same context.
-   **`'per-channel-sender'`**: The agent maintains a separate session for each unique combination of channel and sender. This is the default behavior and provides the most granular isolation, ensuring private conversations between a user and an agent within a specific channel.

## Examples

The `sessionScope` is specified when registering an agent.

```typescript
import { AgentRouter, AgentEntry, SessionScope } from 'yaaf';

// A mock agent runner for demonstration
const myAgentRunner = {
  run: async (input: string) => `Processed: ${input}`,
};

const router = new AgentRouter();

// Example 1: A global knowledge bot with a shared session for all users.
const globalBot: AgentEntry = {
  id: 'global-knowledge-bot',
  agent: myAgentRunner,
  sessionScope: 'shared', // All users share one conversation history.
  routes: [{ match: /ask-global/ }],
};

// Example 2: A personal assistant that remembers context per user.
const personalAssistant: AgentEntry = {
  id: 'personal-assistant',
  agent: myAgentRunner,
  sessionScope: 'per-sender', // Each user gets a private session.
  routes: [{ match: /@assistant/ }],
};

// Example 3: A project-specific bot that shares context within a team channel.
const projectBot: AgentEntry = {
  id: 'project-alpha-bot',
  agent: myAgentRunner,
  sessionScope: 'per-channel', // The session is shared by everyone in the channel.
  routes: [{ channels: ['project-alpha-channel'] }],
};

// Example 4: The default behavior, private conversations in each channel.
const defaultBot: AgentEntry = {
  id: 'default-bot',
  agent: myAgentRunner,
  // sessionScope is 'per-channel-sender' by default if not specified.
  routes: [{ match: /@default/ }],
};

router.register(globalBot);
router.register(personalAssistant);
router.register(projectBot);
router.register(defaultBot);
```

## Sources

[Source 1]: src/agents/delegate.ts