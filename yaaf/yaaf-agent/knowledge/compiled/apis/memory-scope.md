---
title: MemoryScope
entity_type: api
summary: Defines the scope of a memory entry, either 'private' to an agent or 'team' for shared access.
export_name: MemoryScope
source_file: src/memory/teamMemory.ts
category: type
search_terms:
 - shared memory
 - private memory
 - agent memory scope
 - team vs private data
 - how to save shared memory
 - how to save private memory
 - TeamMemory scope
 - memory visibility
 - multi-agent memory
 - agent data isolation
 - memory namespace
stub: false
compiled_at: 2026-04-25T00:09:36.905Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/teamMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`MemoryScope` is a string literal type that specifies the visibility and accessibility of a memory entry within a multi-agent system using [TeamMemory](./team-memory.md). It determines whether a piece of information is exclusive to a single agent or shared across all agents in a team [Source 1].

- `'private'`: The memory entry is stored in a namespace exclusive to the agent that created it. It is not visible to other agents in the team [Source 1].
- `'team'`: The memory entry is stored in a shared namespace, making it accessible to all agents that are part of the same team [Source 1].

This mechanism is fundamental to how [TeamMemory](./team-memory.md) manages data isolation and collaboration in agent swarms [Source 1].

## Signature

The type is a union of two string literals [Source 1]:

```typescript
export type MemoryScope = "private" | "team";
```

## Examples

`MemoryScope` is used in the `save` and `search` methods of the [TeamMemory](./team-memory.md) class to control where data is written and retrieved from.

The following example demonstrates an agent saving a memory entry with a `'team'` scope, which is then retrieved by a different agent in the same team [Source 1].

```typescript
import { TeamMemory } from 'yaaf';

const sharedDir = '.yaaf/team-memory';

// Agent 1 saves a piece of analysis to the shared team memory
const agent1Memory = new TeamMemory({ sharedDir, agentId: 'agent-1' });
await agent1Memory.save({
  key: 'market_analysis_q1',
  content: 'The market shows strong growth potential.',
  scope: 'team' // This makes it visible to other agents
});

// Agent 2 can now search for and find the entry from Agent 1
const agent2Memory = new TeamMemory({ sharedDir, agentId: 'agent-2' });
const sharedEntries = await agent2Memory.search('market analysis', {
  scope: 'team' // Explicitly search the team scope
});

console.log(sharedEntries[0].content);
// Output: 'The market shows strong growth potential.'
```

## See Also

- [TeamMemory](./team-memory.md): The primary class that utilizes `MemoryScope` for managing shared and private agent memory.

## Sources

[Source 1]: src/memory/teamMemory.ts