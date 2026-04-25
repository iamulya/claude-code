---
title: SearchOptions
entity_type: api
summary: Options for searching TeamMemory, allowing filtering by scope, type, and limiting results.
export_name: SearchOptions
source_file: src/memory/teamMemory.ts
category: type
search_terms:
 - filter team memory
 - query shared memory
 - limit memory search results
 - search by memory scope
 - private vs team memory search
 - TeamMemory search parameters
 - find memory entries
 - memory search options
 - how to search memory
 - filter by memory type
stub: false
compiled_at: 2026-04-25T00:13:06.763Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/teamMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview
`SearchOptions` is a type that defines the parameters for searching entries within a [TeamMemory](./team-memory.md) instance. It allows callers of `TeamMemory.search()` to filter results based on their scope, their content type, and to limit the number of entries returned [Source 1].

This is useful for controlling the breadth and focus of memory retrieval. For example, an agent might search only its private memory for user feedback, or search the entire team's memory for project-related reference material, limiting the results to the most recent five entries.

## Signature
`SearchOptions` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type SearchOptions = {
  /** 
   * Which memory spaces to search. 
   * Default: 'all' (searches both private and team scopes). 
   */
  scope?: MemoryScope | "all";

  /** 
   * The type of memory entry to search for. 
   */
  type?: TeamMemoryEntry["type"];

  /** 
   * The maximum number of results to return. 
   */
  limit?: number;
};
```

### Properties

- **`scope`** `(optional)`: Specifies which memory spaces to include in the search.
  - `"private"`: Searches only the memory exclusive to the current agent.
  - `"team"`: Searches only the shared memory accessible by all agents in the team.
  - `"all"`: Searches both private and team memory spaces. This is the default behavior if `scope` is not provided.
  - See [MemoryScope](./memory-scope.md) for more details.

- **`type`** `(optional)`: Filters results to only include entries of a specific type. Valid types are:
  - `"user"`
  - `"feedback"`
  - `"project"`
  - `"reference"`
  - See [TeamMemoryEntry](./team-memory-entry.md) for more details on entry types.

- **`limit`** `(optional)`: A number that restricts the maximum quantity of matching entries to be returned.

## Examples
The following examples demonstrate how to use `SearchOptions` with the `TeamMemory.search()` method.

### Example 1: Search all scopes with a limit
This example searches for the term "database schema" across both private and team memory, but limits the result to the 10 most relevant entries.

```typescript
import { TeamMemory, SearchOptions } from 'yaaf';

const memory = new TeamMemory({ sharedDir: '.yaaf/team-memory', agentId: 'db-architect' });

const options: SearchOptions = {
  limit: 10,
};

const results = await memory.search('database schema', options);
console.log(`Found ${results.length} results.`);
```

### Example 2: Search only team memory for a specific type
This example searches for reference documents related to "API authentication" exclusively within the shared team memory.

```typescript
import { TeamMemory, SearchOptions } from 'yaaf';

const memory = new TeamMemory({ sharedDir: '.yaaf/team-memory', agentId: 'security-analyst' });

const options: SearchOptions = {
  scope: 'team',
  type: 'reference',
};

const referenceDocs = await memory.search('API authentication', options);
console.log('Found team reference documents:', referenceDocs);
```

## See Also
- [TeamMemory](./team-memory.md): The class that uses `SearchOptions` for its search functionality.
- [TeamMemoryEntry](./team-memory-entry.md): The type definition for entries stored in `TeamMemory`, which `SearchOptions` can filter by.
- [MemoryScope](./memory-scope.md): The type defining the possible memory scopes (`private` or `team`).

## Sources
[Source 1]: src/memory/teamMemory.ts