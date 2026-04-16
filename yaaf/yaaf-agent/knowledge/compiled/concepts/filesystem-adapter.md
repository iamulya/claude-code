---
title: FileSystem Adapter
entity_type: concept
summary: A framework-level abstraction for interacting with virtual or physical filesystems within an agent's environment.
related_subsystems:
  - PluginHost
  - ToolProvider
  - ContextProvider
stub: false
compiled_at: 2026-04-16T14:21:08.907Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/agentfs.ts
confidence: 0.9
---

## What It Is
The FileSystem Adapter is a core abstraction in YAAF that provides a standardized interface for agents to interact with storage environments. It enables agents to manage files, directories, and tool registries through a virtual or physical filesystem. This concept is central to providing agents with a persistent workspace, a mechanism for shared state between multiple agents, and a structured way to discover and execute tools.

## How It Works in YAAF
In YAAF, the FileSystem Adapter is primarily implemented through the `AgentFSPlugin`. This plugin serves a multi-functional role by implementing several framework interfaces:

- **FileSystemAdapter**: Provides programmatic methods for generic filesystem operations such as reading, writing, and listing files.
- **ToolProvider**: Exposes filesystem operations as tools (e.g., `fs_read`, `fs_write`, `fs_list`, `fs_tree`) that an LLM can invoke.
- **ContextProvider**: Injects the filesystem structure (the "tree") into the LLM's context window, allowing the agent to perceive its available environment.

### Node Types and Metadata
The adapter manages various node types defined by the `FSNodeType` type:
- `file`: Standard data storage.
- `directory`: Structural containers.
- `tool`: Executable agent tools mounted within the filesystem.
- `symlink`: References to other paths.

Each entry in the filesystem (`FSEntry`) contains metadata including the file size, creation and update timestamps, and optional custom metadata.

### Change Tracking
The adapter supports change tracking through the `FSChange` type. This mechanism records operations (`create`, `update`, `delete`), the path affected, a timestamp, and the specific `agentId` responsible for the change. This allows for auditing and synchronization across agent workflows.

## Configuration
The behavior of the FileSystem Adapter is governed by the `AgentFSConfig` object. Developers can define constraints on storage and enable or disable specific features.

```typescript
export type AgentFSConfig = {
  /** Maximum file size in bytes (default: 1MB) */
  maxFileSize?: number
  /** Maximum total storage in bytes (default: 50MB) */
  maxTotalSize?: number
  /** Enable change tracking (default: true) */
  trackChanges?: boolean
}
```

When registering the `AgentFSPlugin` with a `PluginHost`, these configurations ensure the agent operates within defined resource boundaries.

```typescript
const host = new PluginHost();
await host.register(new AgentFSPlugin({
  maxFileSize: 1024 * 1024, // 1MB
  trackChanges: true
}));

const fs = host.getAdapter<FileSystemAdapter>('filesystem')!;
await fs.write('/workspace/notes.md', '# Findings');
```

## See Also
- `AgentFSPlugin`
- `PluginHost`
- `ToolProvider`
- `ContextProvider`