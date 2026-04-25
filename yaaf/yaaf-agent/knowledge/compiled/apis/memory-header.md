---
summary: A type defining the header information for a memory entry, typically including name and description from frontmatter.
export_name: MemoryHeader
source_file: src/memory/memoryStore.js
category: type
title: MemoryHeader
entity_type: api
search_terms:
 - memory metadata
 - memory file header
 - frontmatter for memories
 - memory name and description
 - what is in a memory header
 - memory store entry type
 - agent memory structure
 - knowledge base metadata
 - memory index information
 - YAAF memory system
 - memory relevance
stub: false
compiled_at: 2026-04-25T00:09:45.368Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`MemoryHeader` is a TypeScript type that defines the metadata for a single entry in the agent's [Memory](../concepts/memory.md). This metadata is typically extracted from the [Frontmatter](../concepts/frontmatter.md) of a memory file (e.g., a Markdown file).

The primary purpose of `MemoryHeader` is to allow components like the [MemoryRelevanceEngine](./memory-relevance-engine.md) to efficiently scan and evaluate a large number of memories without loading the full content of each one. By operating on a collection of lightweight `MemoryHeader` objects, the system can quickly identify which memories are most relevant to a given query.

## Signature

The `MemoryHeader` type contains key metadata about a memory file. While its definitive source is `src/memory/memoryStore.js`, its structure is inferred from its usage in components like [MemoryRelevanceEngine](./memory-relevance-engine.md).

```typescript
import type { Frontmatter } from '../frontmatter.js';

/**
 * Header information for a memory entry, derived from its frontmatter
 * and file system metadata.
 */
export type MemoryHeader = Frontmatter & {
  /** The fully-qualified path to the memory file. */
  path: string;
  /** The last modification time of the file in milliseconds since epoch. */
  mtimeMs: number;
  /** The base filename of the memory file (e.g., 'build-system.md'). */
  filename: string;
  /** The name of the memory, typically from frontmatter. */
  name: string;
  /** A brief description of the memory's content, from frontmatter. */
  description: string;
};
```

## Examples

The following example shows an array of `MemoryHeader` objects that might be collected by a [MemoryStore](./memory-store.md) and passed to a [MemoryRelevanceEngine](./memory-relevance-engine.md).

```typescript
import type { MemoryHeader } from 'yaaf';

// An array of MemoryHeader objects representing the available memories.
const allMemoryHeaders: MemoryHeader[] = [
  {
    name: 'Build System Configuration',
    description: 'How to configure the project build system, including scripts and environment variables.',
    path: '/path/to/agent/memory/build-system.md',
    mtimeMs: 1678886400000,
    filename: 'build-system.md'
  },
  {
    name: 'API Authentication',
    description: 'Details on authenticating with the external API, including token handling and OAuth flows.',
    path: '/path/to/agent/memory/api-auth.md',
    mtimeMs: 1678972800000,
    filename: 'api-auth.md'
  },
  {
    name: 'Deployment Checklist',
    description: 'Step-by-step checklist for deploying the application to production.',
    path: '/path/to/agent/memory/deployment.md',
    mtimeMs: 1679059200000,
    filename: 'deployment.md'
  }
];

// A component like MemoryRelevanceEngine would use this array to find
// relevant memories for a query like "how do I deploy the app?".
// It would select the 'Deployment Checklist' memory based on its name
// and description without reading the file's full content.
```

## See Also

- [MemoryRelevanceEngine](./memory-relevance-engine.md): A class that uses `MemoryHeader` objects to find relevant memories.
- [MemoryStore](./memory-store.md): The subsystem responsible for loading and managing memories, including their headers.
- [Memory](../concepts/memory.md): The high-level concept of an agent's long-term knowledge base.
- [Frontmatter](../concepts/frontmatter.md): The concept of using YAML frontmatter in documents to store metadata, which is the source for `MemoryHeader` data.

## Sources

[Source 1]: src/memory/relevance.ts