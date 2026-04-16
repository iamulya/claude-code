---
title: Memory Scoping
entity_type: concept
summary: The mechanism of isolating agent data into private or shared (team) visibility levels.
stub: false
compiled_at: 2026-04-16T14:30:30.182Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/teamMemory.ts
confidence: 0.95
---

---
title: Memory Scoping
entity_type: concept
summary: The mechanism of isolating agent data into private or shared (team) visibility levels.
related_subsystems:
  - Memory

## What It Is
Memory Scoping is the architectural pattern in YAAF used to manage data visibility and isolation within multi-agent swarms. It addresses the need for agents to maintain individual state and private observations while simultaneously contributing to a collective knowledge base accessible by other agents in the same environment.

By categorizing memory into distinct scopes, YAAF ensures that sensitive or agent-specific logic remains isolated, while collaborative results are synchronized across the team.

## How It Works in YAAF
Memory Scoping is implemented via the `TeamMemory` class, which utilizes a two-directory storage model. This model routes data to different physical or logical locations based on the defined `MemoryScope`.

### Visibility Levels
YAAF defines two primary scopes:
*   **`private`**: Data is restricted to a specific agent. It is stored in a directory unique to the `agentId`, preventing other agents from reading or overwriting the information.
*   **`team`**: Data is stored in a shared directory. Any agent configured with the same `sharedDir` can search, read, and write to this namespace, facilitating concurrent collaboration.

### Write and Search Routing
When an agent interacts with the memory subsystem, the scope determines the operation's target:
*   **Writing**: The `save` method accepts a `scope` parameter. If set to `private`, the entry is routed to the agent's isolated storage. If set to `team`, it is written to the shared storage.
*   **Searching**: The `search` method allows agents to query their memory. Developers can specify a `scope` of `private`, `team`, or `all`. Searching `all` aggregates results from both the agent's private namespace and the shared team namespace.

## Configuration
Memory Scoping is configured through the `TeamMemoryConfig` object. Developers must provide a `sharedDir` for collective data and an `agentId` to facilitate private isolation.

```typescript
import { TeamMemory } from './memory/teamMemory';

const config = {
  sharedDir: '.yaaf/team-memory',
  agentId: 'researcher-agent-01',
  // Optional: override the default private directory path
  privateDir: '.yaaf/custom-private-store/researcher-01'
};

const memory = new TeamMemory(config);

// Saving to the shared team scope
await memory.save({
  key: 'market_trends_2024',
  content: '...',
  scope: 'team'
});

// Saving to the private scope
await memory.save({
  key: 'internal_scratchpad',
  content: '...',
  scope: 'private'
});
```

### Data Structure
Every scoped entry is stored as a `TeamMemoryEntry`, which includes metadata such as the `agentId` of the creator, the `scope` assigned at creation, and timestamps for lifecycle management.

## Sources
* `src/memory/teamMemory.ts`