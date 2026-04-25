---
summary: Defines the possible types for a node in the virtual filesystem (file, directory, tool, symlink).
title: FSNodeType
entity_type: api
export_name: FSNodeType
source_file: src/integrations/agentfs.ts
category: type
search_terms:
 - virtual file system type
 - agentfs node kind
 - file vs directory vs tool
 - symbolic link in agentfs
 - FSEntry type property
 - TreeEntry type property
 - agent file system
 - what can be in agentfs
 - filesystem node enumeration
 - vfs entry type
 - fs node kind
 - file system entry type
stub: false
compiled_at: 2026-04-25T00:07:32.412Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`FSNodeType` is a string literal type that defines the set of possible types for an entry within the AgentFS virtual filesystem. It is used to distinguish between regular files, directories, executable tools, and symbolic links. [Source 1]

This type is a fundamental part of the AgentFS data model and is used as a property in interfaces like [FSEntry](./fs-entry.md) and [TreeEntry](./tree-entry.md) to allow for type-safe handling of different filesystem nodes. [Source 1]

## Signature

`FSNodeType` is a union of four possible string literals. [Source 1]

```typescript
export type FSNodeType = "file" | "directory" | "tool" | "symlink";
```

### Members

- `"file"`: Represents a regular file containing data.
- `"directory"`: Represents a directory that can contain other nodes.
- `"tool"`: Represents a special node that corresponds to an executable agent tool.
- `"symlink"`: Represents a symbolic link that points to another path within the virtual filesystem.

## Examples

The primary use of `FSNodeType` is to identify the kind of a filesystem entry when processing data from AgentFS, for example, when listing the contents of a directory.

```typescript
import type { FSEntry, FSNodeType } from 'yaaf';

const fileNode: FSEntry = {
  name: 'notes.txt',
  path: '/workspace/notes.txt',
  type: 'file', // Using FSNodeType
  size: 1024,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const toolNode: FSEntry = {
  name: 'grep',
  path: '/tools/grep',
  type: 'tool', // Using FSNodeType
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: {
    description: 'Searches for patterns in files.'
  }
};

function processNode(node: FSEntry): void {
  switch (node.type) {
    case 'file':
      console.log(`Processing file: ${node.path} (size: ${node.size})`);
      break;
    case 'directory':
      console.log(`Entering directory: ${node.path}`);
      break;
    case 'tool':
      console.log(`Found tool: ${node.name}`);
      break;
    case 'symlink':
      console.log(`Found symlink: ${node.path}`);
      break;
  }
}

processNode(fileNode);
processNode(toolNode);
```

## See Also

- [FSEntry](./fs-entry.md): An interface representing a single entry in the virtual filesystem, which uses `FSNodeType`.
- [TreeEntry](./tree-entry.md): An interface for representing the filesystem in a hierarchical structure, which also uses `FSNodeType`.

## Sources

[Source 1]: src/integrations/agentfs.ts