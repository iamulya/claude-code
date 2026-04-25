---
summary: Represents a single entry (file or directory) in the virtual filesystem with basic metadata.
title: FSEntry
entity_type: api
export_name: FSEntry
source_file: src/integrations/agentfs.ts
category: type
search_terms:
 - virtual file system entry
 - file metadata
 - directory info
 - AgentFS node
 - filesystem object
 - file properties
 - what is an FSEntry
 - AgentFS data structure
 - file system type
 - vfs entry
 - file timestamps
stub: false
compiled_at: 2026-04-25T00:07:27.529Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `FSEntry` type defines the structure for a single entry within the AgentFS virtual filesystem. It serves as the fundamental data structure for representing files, directories, mounted tools, and symbolic links managed by the `AgentFSPlugin` [Source 1].

Each `FSEntry` contains essential metadata, including its name, full path, type, size, and creation/modification timestamps. This information is used by filesystem-related tools and context providers to interact with and represent the agent's virtual environment [Source 1].

## Signature

`FSEntry` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type FSEntry = {
  /** The name of the entry (e.g., 'notes.md'). */
  name: string;

  /** The absolute path of the entry within the virtual filesystem (e.g., '/workspace/notes.md'). */
  path: string;

  /** The type of the filesystem node. */
  type: FSNodeType;

  /** The size of the entry in bytes. Typically only present for files. */
  size?: number;

  /** The creation timestamp as a Unix epoch in milliseconds. */
  createdAt: number;

  /** The last modification timestamp as a Unix epoch in milliseconds. */
  updatedAt: number;

  /** An optional record for storing arbitrary metadata. */
  metadata?: Record<string, unknown>;
};
```

## Examples

Here are examples of `FSEntry` objects representing a file and a directory.

### File Entry

```typescript
import type { FSEntry } from 'yaaf';

const fileEntry: FSEntry = {
  name: 'notes.txt',
  path: '/workspace/notes.txt',
  type: 'file',
  size: 128,
  createdAt: 1678886400000,
  updatedAt: 1678886400000,
  metadata: {
    owner: 'agent-123'
  }
};
```

### Directory Entry

```typescript
import type { FSEntry } from 'yaaf';

const directoryEntry: FSEntry = {
  name: 'workspace',
  path: '/workspace',
  type: 'directory',
  createdAt: 1678886300000,
  updatedAt: 1678886300000,
};
```

## See Also

- [FSNodeType](./fs-node-type.md): The type definition for the `type` property of an `FSEntry`.
- [AgentFS Plugin](../plugins/agent-fs-plugin.md): The plugin that manages the virtual filesystem and uses `FSEntry` objects.

## Sources

[Source 1]: src/integrations/agentfs.ts