---
title: AgentFSPlugin
entity_type: plugin
summary: A plugin providing a virtual filesystem and related tools for agent file operations.
capabilities:
  - filesystem
  - tools
  - context
stub: false
compiled_at: 2026-04-16T14:10:26.634Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
confidence: 0.95
---

---
title: "AgentFSPlugin"
entity_type: "plugin"
summary: "A plugin providing a virtual filesystem and related tools for agent file operations."
capabilities: ["filesystem", "tools", "context"]
built_in: true

## Overview
The `AgentFSPlugin` is a built-in YAAF plugin that provides agents with a virtual filesystem (VFS) environment. It allows agents to perform file operations within a sandboxed directory, exposes these operations as native tools for LLM consumption, and provides file-based context during prompt assembly.

The plugin implements three primary capability interfaces: `FileSystemAdapter`, `ToolProvider`, and `ContextProvider`.

## Installation
The `AgentFSPlugin` is included in the core `yaaf` package. No additional peer dependencies are required beyond the framework itself.

```typescript
import { AgentFSPlugin } from 'yaaf';
```

## Configuration
The plugin is configured via its constructor, which accepts a root directory and an optional URI prefix for virtual paths.

| Parameter | Type | Description |
|---|---|---|
| `rootDir` | `string` | The local directory on the host machine that serves as the root of the virtual filesystem. |
| `vfsPrefix` | `string` | (Optional) The URI prefix used to identify virtual paths (e.g., `vfs://`). Defaults to `vfs://`. |

### Example
```typescript
import { AgentFSPlugin, PluginHost } from 'yaaf';

const agentFS = new AgentFSPlugin({
  rootDir:   './agent-workspace',
  vfsPrefix: 'vfs://',
});

await agentFS.initialize();

const host = new PluginHost();
await host.register(agentFS);
```

## Capabilities

### FileSystemAdapter
As a `FileSystemAdapter`, the plugin provides programmatic access to the virtual filesystem. This allows the application or other plugins to interact with the agent's workspace directly.

*   `read(path: string)`: Reads the content of a file.
*   `write(path: string, content: string)`: Writes content to a file.
*   `list(path: string)`: Lists the entries in a directory.
*   `tree(path: string, options?: { depth: number })`: Returns a recursive tree structure of the directory.

### ToolProvider
The plugin automatically generates and exposes a set of tools that can be used by LLM-powered agents. When the plugin is registered with a `PluginHost`, these tools are included in the `getAllTools()` collection.

The following tools are provided:
*   `agentfs_read_file`: Allows the agent to read file contents.
*   `agentfs_write_file`: Allows the agent to create or update files.
*   `agentfs_list_dir`: Allows the agent to view directory contents.
*   `agentfs_tree`: Allows the agent to visualize the file structure.

### ContextProvider
The `AgentFSPlugin` implements the `ContextProvider` interface, allowing it to inject relevant file information into the prompt assembly process. When the `PluginHost` calls `gatherContext(query)`, the plugin can provide snippets or file structures relevant to the agent's current task.