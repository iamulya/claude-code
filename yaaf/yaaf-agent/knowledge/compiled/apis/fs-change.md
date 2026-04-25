---
summary: Describes a change event within the virtual filesystem, including its type, path, and timestamp.
title: FSChange
entity_type: api
export_name: FSChange
source_file: src/integrations/agentfs.ts
category: type
search_terms:
 - filesystem events
 - file change tracking
 - AgentFS audit log
 - virtual file system changes
 - create update delete events
 - file system notifications
 - agentfs change log
 - vfs history
 - file modification record
 - agent file operations
stub: false
compiled_at: 2026-04-25T00:07:15.445Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `FSChange` type represents a single, atomic change event within the virtual filesystem managed by the [AgentFS Plugin](../plugins/agent-fs-plugin.md). It is used to create a log of all modifications, serving as an audit trail of agent activity.

Each `FSChange` object captures the nature of the operation (`create`, `update`, or `delete`), the path of the affected file or directory, the time of the event, and optionally the ID of the agent that performed the action. This is particularly useful when change tracking is enabled in the [AgentFS Plugin](../plugins/agent-fs-plugin.md) configuration.

## Signature

The `FSChange` type is defined as an object with the following structure:

```typescript
export type FSChange = {
  type: "create" | "update" | "delete";
  path: string;
  timestamp: number;
  agentId?: string;
};
```

## Properties

- **`type`**: `"create" | "update" | "delete"`
  - The type of filesystem operation that occurred.

- **`path`**: `string`
  - The absolute path within the virtual filesystem of the file or directory that was changed.

- **`timestamp`**: `number`
  - A Unix timestamp (milliseconds since epoch) indicating when the change occurred.

- **`agentId`**: `string` (optional)
  - The unique identifier of the agent that initiated the change. This field may be omitted if the change was not directly attributable to a specific agent.

## Examples

Here is an example of what a change log, an array of `FSChange` objects, might look like after an agent creates and then modifies a file.

```typescript
import type { FSChange } from 'yaaf';

// A log of changes maintained by the AgentFSPlugin
const changeLog: FSChange[] = [
  {
    type: 'create',
    path: '/workspace/research_notes.md',
    timestamp: 1700000000000,
    agentId: 'research-agent-001',
  },
  {
    type: 'update',
    path: '/workspace/research_notes.md',
    timestamp: 1700000050000,
    agentId: 'research-agent-001',
  },
  {
    type: 'delete',
    path: '/workspace/old_draft.txt',
    timestamp: 1700000100000,
    agentId: 'cleanup-agent-alpha',
  }
];
```

## See Also

- [AgentFS Plugin](../plugins/agent-fs-plugin.md): The plugin that manages the virtual filesystem and generates `FSChange` events.

## Sources

[Source 1]: src/integrations/agentfs.ts