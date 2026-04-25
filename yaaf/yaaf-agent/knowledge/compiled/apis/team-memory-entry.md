---
title: TeamMemoryEntry
entity_type: api
summary: Represents a single entry in TeamMemory, including content, scope, agent ID, and metadata.
export_name: TeamMemoryEntry
source_file: src/memory/teamMemory.ts
category: type
search_terms:
 - shared agent memory
 - multi-agent memory record
 - team memory structure
 - memory entry scope
 - private vs team memory
 - agent memory metadata
 - how to structure memory entries
 - TeamMemory record type
 - memory persistence format
 - agent collaboration data
 - memory tags
 - memory type property
stub: false
compiled_at: 2026-04-25T00:15:18.993Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/teamMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `TeamMemoryEntry` type defines the structure for a single record stored within a [TeamMemory](./team-memory.md) instance. Each entry encapsulates a piece of information along with metadata that governs its visibility, origin, and categorization. This structure is fundamental to how agents in a multi-agent system share information and maintain private context.

Key properties include the `scope`, which determines if the entry is private to the creating agent or shared with the entire team, and the `type`, which categorizes the memory's purpose (e.g., user input, project data). These objects are typically returned by [TeamMemory](./team-memory.md) methods like `search()` or `get()` rather than being constructed manually by the user.

## Signature

`TeamMemoryEntry` is a TypeScript type alias with the following structure:

```typescript
export type TeamMemoryEntry = {
  /** A unique identifier for the memory entry. */
  id: string;

  /** The primary key used for retrieving the entry. */
  key: string;

  /** The string content of the memory entry. */
  content: string;

  /** The category of the memory entry. */
  type: "user" | "feedback" | "project" | "reference";

  /** The visibility scope of the entry. */
  scope: MemoryScope; // "private" | "team"

  /** The unique identifier of the agent that created this entry. */
  agentId: string;

  /** An ISO 8601 timestamp of when the entry was created. */
  createdAt: string;

  /** An ISO 8601 timestamp of when the entry was last updated. */
  updatedAt: string;

  /** Optional array of tags for filtering and searching. */
  tags?: string[];
};
```

## Examples

The following example shows a typical `TeamMemoryEntry` object that might be retrieved from a [TeamMemory](./team-memory.md) store.

```typescript
import { TeamMemoryEntry } from 'yaaf';

// An example of a TeamMemoryEntry object representing a shared
// piece of project-related analysis.
const teamAnalysisEntry: TeamMemoryEntry = {
  id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  key: 'quarterly_sales_analysis',
  content: 'Sales are up 15% year-over-year, driven by the new product line.',
  type: 'project',
  scope: 'team',
  agentId: 'analyst-agent-01',
  createdAt: '2023-10-27T10:00:00Z',
  updatedAt: '2023-10-27T10:00:00Z',
  tags: ['sales', 'q3-2023', 'analysis'],
};

// An example of a private memory entry.
const privateNoteEntry: TeamMemoryEntry = {
  id: 'f0e9d8c7-b6a5-4321-fedc-ba9876543210',
  key: 'todo_next_step',
  content: 'Next, I need to verify the source data for the Q3 report.',
  type: 'user',
  scope: 'private',
  agentId: 'analyst-agent-01',
  createdAt: '2023-10-27T11:30:00Z',
  updatedAt: '2023-10-27T11:30:00Z',
};
```

## See Also

- [TeamMemory](./team-memory.md): The class that manages collections of `TeamMemoryEntry` objects.
- [MemoryScope](./memory-scope.md): The type that defines the visibility of a memory entry (`private` or `team`).

## Sources

- [Source 1]: `src/memory/teamMemory.ts`