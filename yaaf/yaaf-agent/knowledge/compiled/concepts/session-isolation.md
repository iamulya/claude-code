---
summary: The mechanism by which different agents or interactions maintain separate conversational states or contexts.
title: Session Isolation
entity_type: concept
related_subsystems:
 - Agent Delegation
search_terms:
 - separate conversations
 - context management
 - session scope
 - per-user state
 - per-channel context
 - shared agent state
 - how to isolate agent memory
 - preventing conversation bleed
 - multi-user agent state
 - SessionScope type
 - per-sender isolation
 - per-channel-sender scope
stub: false
compiled_at: 2026-04-24T18:01:46.987Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/delegate.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Session Isolation is the mechanism in YAAF that ensures conversational state and context are kept separate across different interactions. In environments where a single agent instance may serve multiple users, [Channel](../apis/channel.md)s, or conversations simultaneously, isolation prevents information from one session from "bleeding" into another. This ensures that an agent's [Memory](./memory.md) and context are relevant only to the specific conversation it is currently engaged in, leading to more accurate and coherent responses.

This concept is a core component of YAAF's multi-agent delegate architecture, which manages multiple named agents that can be routed to based on incoming messages [Source 1]. Proper session isolation is critical for building robust agents that can operate effectively in multi-user or multi-Channel platforms.

## How It Works in YAAF

Session Isolation is controlled by the `sessionScope` property within an `AgentEntry` configuration [Source 1]. This property dictates the partitioning strategy for an agent's conversational memory. [when](../apis/when.md) a message is routed to an agent, YAAF uses the `sessionScope` to determine which session context to load or create.

The framework defines four distinct isolation scopes, specified by the `SessionScope` type [Source 1]:

*   **`shared`**: All messages and interactions with the agent use a single, global session. There is no isolation; all users and channels share the same conversational context.
*   **`per-sender`**: A separate session is maintained for each unique sender ID. This isolates conversations by user, meaning a user's conversation with the agent will be consistent across different channels, but separate from other users' conversations.
*   **`per-channel`**: A separate session is maintained for each unique channel. All users interacting with the agent within the same channel share the same conversational context.
*   **`per-channel-sender`**: A session is isolated by the unique combination of a channel ID and a sender ID. This is the most granular level of isolation and is the default behavior. It ensures that a user's conversation in one channel is completely separate from their conversation in another channel, as well as from all other users' conversations.

## Configuration

A developer configures an agent's session isolation strategy during its registration with the `AgentRouter`. This is done by setting the `sessionScope` property on the `AgentEntry` object.

The following example demonstrates registering two agents with different isolation scopes [Source 1]:

```typescript
import { AgentRouter, AgentEntry } from 'yaaf'; // Assuming imports

const router = new AgentRouter();

// This agent maintains a separate conversation for each user,
// regardless of the channel they are in.
const personalAssistant: AgentEntry = {
  id: 'assistant',
  agent: assistantRunner,
  sessionScope: 'per-sender', // highlight
  routes: [{ match: /assist|help/i }],
};

// This agent maintains a shared context for everyone in a specific channel.
// This is the default behavior.
const channelScribe: AgentEntry = {
  id: 'scribe',
  agent: scribeRunner,
  sessionScope: 'per-channel-sender', // highlight
  routes: [{ match: /scribe|notes/i }],
};

router.register(personalAssistant);
router.register(channelScribe);
```

## Sources

[Source 1] src/agents/delegate.ts