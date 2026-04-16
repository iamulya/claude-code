---
title: AgentFSPlugin
entity_type: api
summary: The primary class implementation for the AgentFS integration, providing virtual filesystem and tool management capabilities.
export_name: AgentFSPlugin
source_file: src/integrations/agentfs.ts
category: class
stub: false
compiled_at: 2026-04-16T14:20:57.592Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/agentfs.ts
confidence: 0.98
---

## Overview
The `AgentFSPlugin` is a comprehensive integration for YAAF that provides a virtual filesystem (VFS) layer. It serves three primary roles: acting as a storage adapter for file operations, a tool provider that exposes filesystem capabilities (such as reading, writing, and listing files) to LLMs, and a context provider that can inject the filesystem structure into agent prompts. 

It is primarily used for managing agent tool registries and maintaining shared state across agent executions within a sandboxed or virtualized environment.

## Signature / Constructor

```typescript
export class AgentFSPlugin extends PluginBase implements FileSystemAdapter, ToolProvider, ContextProvider {
  constructor(config?: AgentFSConfig);
}
```

### Configuration Types

#### AgentFSConfig
The plugin accepts an optional configuration object to define resource limits and behavior:

| Property | Type | Description |
| :--- | :--- | :--- |
| `maxFileSize` | `number` | Maximum size of a single file in bytes (default: 1MB). |
| `maxTotalSize` | `number` | Maximum total storage capacity in bytes (default: 50MB). |
| `trackChanges` | `boolean` | Whether to enable change tracking for filesystem operations (default: true). |

## Methods & Properties

### Public Methods
The following methods are specific to the `AgentFSPlugin` implementation beyond the standard interface requirements:

*   **mountTools(tools: Tool[])**: Registers an array of tools into the virtual filesystem, typically making them available under a `/tools` directory.
*   **executeTool(path: string, args: Record<string, any>, ctx: ToolContext)**: Executes a tool located at a specific path within the virtual filesystem.

### Interface Implementations
As a multi-purpose plugin, it implements the following interfaces:
*   **FileSystemAdapter**: Provides standard file operations such as `read`, `write`, `delete`, and `list`.
*   **ToolProvider**: Exposes filesystem operations (e.g., `fs_read`, `fs_write`, `fs_list`, `fs_tree`) as tools that can be called by an LLM.
*   **ContextProvider**: Allows the plugin to inject the current filesystem tree or specific file contents into the LLM's context window.

## Supporting Types

### FSNodeType
Defines the types of entries allowed in the filesystem:
`'file' | 'directory' | 'tool' | 'symlink'`

### FSEntry
Represents metadata for a single filesystem entry:
* `name`: string
* `path`: string
* `type`: FSNodeType
* `size?`: number
* `createdAt`: number
* `updatedAt`: number
* `metadata?`: Record<string, unknown>

### TreeEntry
A recursive structure representing the filesystem hierarchy:
* `name`: string
* `path`: string
* `type`: FSNodeType
* `children?`: TreeEntry[]
* `description?`: string

## Examples

### Basic Setup and File Operations
```typescript
const host = new PluginHost();
await host.register(new AgentFSPlugin());

const fs = host.getAdapter<FileSystemAdapter>('filesystem')!;
await fs.write('/workspace/notes.md', '# Findings');
```

### Tool Management
```typescript
const afs = host.getPlugin<AgentFSPlugin>('agentfs')!;

// Mount tools into the virtual filesystem
afs.mountTools([grepTool, bashTool]);

// Execute a tool via its filesystem path
const result = await afs.executeTool('/tools/grep', { pattern: 'TODO' }, ctx);
```