---
title: TeamMemory
entity_type: api
summary: A class providing shared memory namespaces for multi-agent swarms, allowing agents to maintain private data while sharing information across a team.
export_name: TeamMemory
source_file: src/memory/teamMemory.ts
category: class
stub: false
compiled_at: 2026-04-16T14:09:32.779Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/multi-agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/teamMemory.ts
confidence: 1
---

## Overview
`TeamMemory` provides a shared memory infrastructure for multi-agent swarms. It implements a two-directory storage model that allows agents to maintain private data while contributing to a shared team knowledge base. 

The class manages write routing based on the specified scope:
*   **Private scope**: Data is written to a directory specific to the `agentId`, isolated from other agents.
*   **Team scope**: Data is written to a shared directory accessible by all agents in the swarm.

This mechanism allows agents to perform independent research or internal reasoning in private while publishing relevant findings to the team namespace for collective use.

## Signature / Constructor

### Constructor
```typescript
constructor(config: TeamMemoryConfig)
```

### Configuration and Types

```typescript
export type TeamMemoryConfig = {
  /** Directory for shared team memory (readable by all agents). */
  sharedDir: string
  /** This agent's unique identifier. Used for private memory isolation. */
  agentId: string
  /** Directory for this agent's private memory. Default: <sharedDir>/.private/<agentId> */
  privateDir?: string
}

export type MemoryScope = 'private' | 'team'

export type TeamMemoryEntry = {
  id: string
  key: string
  content: string
  type: 'user' | 'feedback' | 'project' | 'reference'
  scope: MemoryScope
  agentId: string
  createdAt: string
  updatedAt: string
  tags?: string[]
}

export type SaveOptions = {
  type?: TeamMemoryEntry['type']
  scope?: MemoryScope
  tags?: string[]
}

export type SearchOptions = {
  /** Which memory spaces to search. Default: both. */
  scope?: MemoryScope | 'all'
  type?: TeamMemoryEntry['type']
  limit?: number
}
```

## Methods & Properties

### save()
Saves a memory entry to either the private or team namespace.
*   **Signature**: `save(options: { key: string, content: string } & SaveOptions): Promise<void>`
*   **Note**: While the source code defines the property as `scope`, some documentation examples refer to this property as `namespace`.

### search()
Searches across accessible memory namespaces (private, team, or both) for relevant entries.
*   **Signature**: `search(query: string, options?: SearchOptions): Promise<TeamMemoryEntry[]>`

### buildContext()
Formats a list of memory entries into a string suitable for inclusion in an LLM prompt.
*   **Signature**: `buildContext(entries: TeamMemoryEntry[]): string`

## Examples

### Basic Team Usage
This example demonstrates how two different agents interact with the same shared memory space.

```typescript
import { TeamMemory } from 'yaaf';

const sharedDir = './.team-memory';

// Agent 1: Researcher
const researcherMem = new TeamMemory({
  sharedDir,
  agentId: 'researcher-1',
});

// Save to team namespace (visible to all)
await researcherMem.save({
  key: 'project-context',
  content: '# Project Overview\nQuantum computing research...',
  scope: 'team',
});

// Save to private namespace (visible only to researcher-1)
await researcherMem.save({
  key: 'my-notes',
  content: 'Internal research notes...',
  scope: 'private',
});

// Agent 2: Writer
const writerMem = new TeamMemory({
  sharedDir,
  agentId: 'writer-1',
});

// Search across all accessible memories
const results = await writerMem.search('project-context');
const context = writerMem.buildContext(results);
```

## Sources
*   `yaaf/knowledge/raw/docs/multi-agent.md`
*   `src/memory/teamMemory.ts`