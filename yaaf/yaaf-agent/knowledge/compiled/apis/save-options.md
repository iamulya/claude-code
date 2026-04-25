---
title: SaveOptions
entity_type: api
summary: Defines optional metadata for a memory entry when saving it to TeamMemory, such as its type, scope, and tags.
export_name: SaveOptions
source_file: src/memory/teamMemory.ts
category: type
search_terms:
 - team memory save options
 - memory entry metadata
 - how to tag memory
 - private vs team scope
 - memory entry type
 - TeamMemory.save parameters
 - memory persistence options
 - classifying memory entries
 - save memory with scope
 - add tags to memory
stub: false
compiled_at: 2026-04-25T00:12:55.436Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/teamMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `SaveOptions` type defines a set of optional parameters that can be provided when saving an entry to a [TeamMemory](./team-memory.md) instance. These options allow for the classification and scoping of memory entries, controlling their visibility and metadata. [Source 1]

You would use `SaveOptions` to:
- Specify whether a memory entry is private to the current agent or shared with the team.
- Categorize the memory entry (e.g., as user feedback, project data, or a reference document).
- Attach freeform tags for easier searching and filtering.

## Signature

`SaveOptions` is a type alias for an object with the following optional properties: [Source 1]

```typescript
export type SaveOptions = {
  type?: "user" | "feedback" | "project" | "reference";
  scope?: MemoryScope;
  tags?: string[];
};
```

### Properties

- **`type`** `?"user" | "feedback" | "project" | "reference"`
  - An optional string that categorizes the memory entry. This corresponds to the `type` property on a [TeamMemoryEntry](./team-memory-entry.md). [Source 1]

- **`scope`** `?`[MemoryScope](./memory-scope.md)
  - An optional value that determines the visibility of the memory entry.
  - `'private'`: The entry is only visible to the agent that saved it.
  - `'team'`: The entry is visible to all agents sharing the same memory space.
  - If not specified, the implementation's default behavior will apply. [Source 1]

- **`tags`** `?string[]`
  - An optional array of strings to associate with the memory entry. Tags can be used for filtering during searches. [Source 1]

## Examples

The following example demonstrates how to use `SaveOptions` when saving entries to a [TeamMemory](./team-memory.md) instance.

```typescript
import { TeamMemory, SaveOptions } from 'yaaf';

// Assume memory is an initialized TeamMemory instance
const memory = new TeamMemory({ sharedDir: '.yaaf/team-memory', agentId: 'worker-1' });

async function saveVariousMemories() {
  // Save a piece of team-wide project data with tags
  await memory.save(
    'project-plan-v1',
    'The initial project plan document...',
    {
      scope: 'team',
      type: 'project',
      tags: ['planning', 'v1', 'critical'],
    }
  );

  // Save a private note for the current agent
  await memory.save(
    'personal-todo',
    'Remember to follow up on the project plan feedback.',
    {
      scope: 'private',
      type: 'user',
    }
  );

  // Save a simple entry with no extra options
  await memory.save(
    'quick-note',
    'This is a note with default scope and type.'
  );
}
```

## See Also

- [TeamMemory](./team-memory.md): The class that uses `SaveOptions` to save memory entries.
- [TeamMemoryEntry](./team-memory-entry.md): The data structure that `SaveOptions` helps to create.
- [MemoryScope](./memory-scope.md): The type defining the visibility of a memory entry.

## Sources

[Source 1]: src/memory/teamMemory.ts