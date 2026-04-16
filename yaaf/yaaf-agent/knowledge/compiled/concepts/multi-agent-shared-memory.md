---
title: Multi-agent Shared Memory
entity_type: concept
summary: A pattern where multiple agents in a swarm share a common storage namespace to synchronize state and findings.
stub: false
compiled_at: 2026-04-16T14:30:21.650Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/teamMemory.ts
confidence: 0.95
---

---
title: Multi-agent Shared Memory
entity_type: concept
summary: A pattern where multiple agents in a swarm share a common storage namespace to synchronize state and findings.
related_subsystems:
  - Memory

## What It Is
Multi-agent Shared Memory is a synchronization pattern in YAAF that allows multiple agents within a swarm to collaborate by reading from and writing to a common storage namespace. This mechanism solves the problem of state isolation in multi-agent systems, enabling agents to share analysis results, project context, and findings while maintaining their own private scratchpads.

## How It Works in YAAF
The framework implements this concept through the `TeamMemory` class, which utilizes a two-directory memory model. This model partitions data into two distinct scopes:

*   **Private Scope**: Data is written to an agent-specific directory (e.g., `<sharedDir>/.private/<agentId>`). This information is isolated and not visible to other agents in the swarm.
*   **Team Scope**: Data is written to a shared directory accessible by all agents configured with the same `sharedDir`. This allows for concurrent access and collective knowledge building.

### Data Structure
Information is stored as `TeamMemoryEntry` objects. Each entry contains:
*   **Metadata**: Unique ID, timestamps (`createdAt`, `updatedAt`), and tags.
*   **Identity**: The `agentId` of the creator and the `scope` (private or team).
*   **Content**: The actual data payload and a `key` for retrieval.
*   **Type**: Categorization as `user`, `feedback`, `project`, or `reference`.

### Write Routing and Search
When an agent saves information, the `scope` parameter determines the physical storage location. When searching, agents can specify a `SearchOptions` object to query only their private memory, only the team memory, or `all` available namespaces.

## Configuration
Developers configure shared memory by providing a `TeamMemoryConfig` object to the `TeamMemory` class. This requires a shared directory path and a unique identifier for the agent.

```typescript
import { TeamMemory } from './memory/teamMemory';

const config = {
  sharedDir: '.yaaf/team-memory',
  agentId: 'researcher-agent-1',
  // Optional: privateDir can be overridden, 
  // otherwise defaults to .yaaf/team-memory/.private/researcher-agent-1
};

const memory = new TeamMemory(config);

// Saving to shared team memory
await memory.save({ 
  key: 'market_trends', 
  content: 'Found increasing demand for TypeScript frameworks.', 
  scope: 'team' 
});

// Searching across both private and team memory
const results = await memory.search('demand', { scope: 'all' });
```

## Sources
* `src/memory/teamMemory.ts`