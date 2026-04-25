---
title: TeamMemory
entity_type: api
summary: A class that provides a file-based memory system for multi-agent teams, with distinct private and shared namespaces for data storage and retrieval.
export_name: TeamMemory
source_file: src/memory/teamMemory.ts
category: class
search_terms:
 - shared agent memory
 - multi-agent communication
 - agent swarm storage
 - collaborative agent memory
 - private vs team namespace
 - how to share data between agents
 - agent context sharing
 - persistent memory for agents
 - TeamMemory configuration
 - agent knowledge base
 - inter-agent data exchange
 - yaaf multi-agent
stub: false
compiled_at: 2026-04-24T17:44:04.734Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/teamMemory.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `Team[[Memory]]` class provides a shared [Memory System](../subsystems/memory-system.md) for multi-agent applications. It allows agents in a team or "swarm" to share information through a common storage namespace while also maintaining their own private, isolated [Memory](../concepts/memory.md) [Source 1, Source 2].

This is achieved through a two-directory model. A `sharedDir` is accessible by all agents in the team, while each agent has its own `privateDir` for information that should not be shared. [when](./when.md) saving data, the agent specifies a `scope` of either `'team'` or `'private'`, which determines where the information is stored. Searches can be performed across the private namespace, the team namespace, or both [Source 2].

This component is fundamental for building collaborative agents that need to share context, findings, or project state without exposing their internal notes or intermediate work.

## Signature / Constructor

`TeamMemory` is instantiated with a configuration object that defines the storage directories and the agent's identity.

```typescript
export type TeamMemoryConfig = {
  /** Directory for shared team memory (readable by all agents). */
  sharedDir: string;
  /** This agent's unique identifier. Used for private memory isolation. */
  agentId: string;
  /** Directory for this agent's private memory. Default: `<sharedDir>/.private/<agentId>` */
  privateDir?: string;
};

export class TeamMemory {
  constructor(config: TeamMemoryConfig);
  // ...methods
}
```
[Source 2]

The `agentId` is used to create a unique subdirectory for the agent's private memory, ensuring isolation from other agents [Source 2].

## Methods & Properties

### save

Saves a memory entry to either the private or team namespace.

**Signature**
```typescript
save(
  entry: {
    key: string;
    content: string;
  },
  options?: {
    type?: "user" | "feedback" | "project" | "reference";
    scope?: "private" | "team";
    tags?: string[];
  }
): Promise<void>;
```
[Source 2]

Note: Source 1 uses a `namespace` property in its example, while the type definition in Source 2 uses `scope`. `scope` is the canonical property name from the source code [Source 1, Source 2].

- **`entry.key`**: A unique identifier or title for the memory entry.
- **`entry.content`**: The substance of the memory entry.
- **`options.scope`**: Determines where the entry is saved. `'team'` for the shared directory, `'private'` for the agent's isolated directory.
- **`options.type`**: A category for the memory entry.
- **`options.tags`**: An array of strings for tagging and categorization.

### search

Searches for memory entries based on a query string.

**Signature**
```typescript
search(
  query: string,
  options?: {
    /** Which memory spaces to search. Default: both. */
    scope?: "private" | "team" | "all";
    type?: "user" | "feedback" | "project" | "reference";
    limit?: number;
  }
): Promise<TeamMemoryEntry[]>;
```
[Source 2]

- **`query`**: The text to search for within the memory entries.
- **`options.scope`**: Filters the search to `'private'`, `'team'`, or `'all'` (default) namespaces.
- **`options.type`**: Filters results by the entry type.
- **`options.limit`**: The maximum number of results to return.

### buildContext

Builds a string context from an array of search results, suitable for inclusion in an [LLM](../concepts/llm.md) prompt.

**Signature**
```typescript
buildContext(results: TeamMemoryEntry[]): string;
```
[Source 1]

## Examples

### Basic Usage: Private and Team Scopes

This example demonstrates a single agent saving information to both its private memory and the shared team memory, then performing a search across both.

```typescript
import { TeamMemory } from 'yaaf';

const memory = new TeamMemory({
  sharedDir: './.team-memory',
  privateDir: './.agent-memory', // Can be omitted to use default path
  agentId: 'researcher-1',
});

// Save to team namespace (all agents can see)
await memory.save({
  key: 'project-context',
  content: '# Project Overview\n...',
}, { scope: 'team' });

// Save to private namespace (only this agent)
await memory.save({
  key: 'my-notes',
  content: 'Internal research notes...',
}, { scope: 'private' });

// Search across all accessible memories
const results = await memory.search('research');
const context = memory.buildContext(results);

console.log(context);
```
[Source 1]

### Multi-[Agent Collaboration](../subsystems/agent-collaboration.md)

This example shows two different agents interacting with the same shared memory directory. `worker-1` saves a result to the team scope, which `worker-2` is then able to find.

```typescript
import { TeamMemory } from 'yaaf';

const sharedDir = '.yaaf/team-memory';

// --- Worker 1 ---
const mem1 = new TeamMemory({ sharedDir, agentId: 'worker-1' });
await mem1.save({
  key: 'analysis_result',
  content: 'The analysis shows a positive trend.',
}, { scope: 'team' });


// --- Worker 2 (in a separate process) ---
const mem2 = new TeamMemory({ sharedDir, agentId: 'worker-2' });

// Worker 2 can see the entry from Worker 1
const entries = await mem2.search('analysis');
console.log(entries[0].content);
// Output: "The analysis shows a positive trend."
```
[Source 2]

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/teamMemory.ts