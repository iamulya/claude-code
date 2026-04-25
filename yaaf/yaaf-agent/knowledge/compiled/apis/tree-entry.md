---
summary: Represents a node in the virtual filesystem tree, including its children and metadata.
title: TreeEntry
entity_type: api
export_name: TreeEntry
source_file: src/integrations/agentfs.ts
category: type
search_terms:
 - filesystem tree node
 - virtual file system entry
 - AgentFS directory structure
 - list files recursively
 - fs_tree output
 - file system hierarchy
 - recursive directory listing
 - file and folder representation
 - tool mounting point
 - directory contents type
stub: false
compiled_at: 2026-04-25T00:16:16.162Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `TreeEntry` type represents a single node in the hierarchical view of the AgentFS virtual filesystem [Source 1]. It is the primary data structure used by tools and internal components that need to represent the recursive structure of directories, files, and mounted tools.

Each `TreeEntry` contains information about the node itself, such as its name, path, and type. If the node is a directory, it can also contain an optional `children` array, which is a list of `TreeEntry` objects for the items within that directory. This recursive structure allows for the representation of an entire filesystem tree in a single object [Source 1].

This type is commonly returned by filesystem operations that provide a tree-like view, such as an `fs_tree` tool. It differs from the related `FSEntry` type, which represents a single, non-hierarchical filesystem entry with more detailed metadata like size and timestamps.

## Signature

The `TreeEntry` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type TreeEntry = {
  name: string;
  path: string;
  type: FSNodeType;
  children?: TreeEntry[];
  description?: string;
};
```

### Properties

- **`name`**: `string`
  The name of the file, directory, or tool (e.g., `"notes.md"`, `"workspace"`).

- **`path`**: `string`
  The absolute path to the entry within the AgentFS virtual filesystem (e.g., `"/workspace/notes.md"`).

- **`type`**: `[[FSNodeType]]`
  The type of the filesystem node. See [FSNodeType](./fs-node-type.md) for possible values (`"file"`, `"directory"`, `"tool"`, `"symlink"`).

- **`children`**: `TreeEntry[]` (optional)
  An array of `TreeEntry` objects representing the contents of this entry. This property is only present if the `type` is `"directory"`.

- **`description`**: `string` (optional)
  An optional description for the entry. This is most commonly used for entries of type `"tool"` to provide a brief explanation of the tool's function.

## Examples

The following is an example of a JSON structure representing a filesystem tree using `TreeEntry` objects. This might be the output of a tool that lists the contents of the root directory recursively.

```json
[
  {
    "name": "workspace",
    "path": "/workspace",
    "type": "directory",
    "children": [
      {
        "name": "notes.md",
        "path": "/workspace/notes.md",
        "type": "file"
      },
      {
        "name": "project",
        "path": "/workspace/project",
        "type": "directory",
        "children": []
      }
    ]
  },
  {
    "name": "tools",
    "path": "/tools",
    "type": "directory",
    "children": [
      {
        "name": "grep",
        "path": "/tools/grep",
        "type": "tool",
        "description": "Searches for patterns in files."
      }
    ]
  }
]
```

## See Also

- [FSNodeType](./fs-node-type.md): The enum-like type that defines the possible kinds of filesystem entries.
- `AgentFSPlugin`: The plugin that provides the virtual filesystem where `TreeEntry` objects reside.

## Sources

[Source 1]: src/integrations/agentfs.ts