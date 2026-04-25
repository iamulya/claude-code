---
title: AgentFS Plugin
entity_type: plugin
summary: A YAAF plugin that provides a virtual filesystem for agent tool registries and shared state, implementing FileSystemAdapter, ToolProvider, and ContextProvider capabilities.
capabilities:
 - filesystem
 - tool-provider
 - context-provider
search_terms:
 - virtual filesystem for agents
 - agent file storage
 - how to give agents a workspace
 - tool registry as a filesystem
 - shared state for agents
 - FileSystemAdapter implementation
 - ToolProvider for file operations
 - ContextProvider for file tree
 - agentfs
 - agent file system
 - mounting tools in a virtual fs
 - fs_read tool
 - fs_write tool
 - fs_list tool
stub: false
compiled_at: 2026-04-24T18:08:17.584Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The AgentFS Plugin provides a virtual filesystem designed for agent use cases, such as managing tool registries and shared state [Source 1]. It is a single-class integration that implements multiple capabilities to expose filesystem functionality to different parts of the YAAF framework.

It implements the following capabilities [Source 1]:
*   **[FileSystemAdapter](../concepts/file-system-adapter.md)**: For generic filesystem operations.
*   **[ToolProvider](../concepts/tool-provider.md)**: To expose filesystem operations as [Tools](../subsystems/tools.md) that an agent can execute.
*   **[ContextProvider](../concepts/context-provider.md)**: To inject the filesystem's structure into the [LLM](../concepts/llm.md)'s context, giving it awareness of available files and tools.

In addition to these standard capabilities, the plugin also exposes its own specific APIs for direct interaction, such as `mountTool` and `executeTool` [Source 1].

## Installation

The `AgentFSPlugin` is available as part of the core YAAF package. It can be imported directly from the package.

```typescript
import { AgentFSPlugin } from 'yaaf';
import { PluginHost } from 'yaaf';

const host = new PluginHost();
await host.register(new AgentFSPlugin());
```

There are no peer dependencies required for this plugin.

## Configuration

The `AgentFSPlugin` constructor accepts an optional configuration object, `AgentFSConfig`, to customize its behavior [Source 1].

The available configuration options are:

*   `maxFileSize` (number, optional): The maximum size for a single file in bytes. Defaults to 1MB.
*   `maxTotalSize` (number, optional): The maximum total storage size of the virtual filesystem in bytes. Defaults to 50MB.
*   `trackChanges` (boolean, optional): Enables or disables change tracking within the filesystem. Defaults to `true`.

### Example

The following example demonstrates how to instantiate and register the `AgentFSPlugin` with custom configuration.

```typescript
import { AgentFSPlugin } from 'yaaf';
import { PluginHost } from 'yaaf';

// Configure the virtual filesystem
const agentFSConfig = {
  maxFileSize: 2 * 1024 * 1024, // 2MB
  maxTotalSize: 100 * 1024 * 1024, // 100MB
  trackChanges: true,
};

// Create and register the plugin
const host = new PluginHost();
const agentFSPlugin = new AgentFSPlugin(agentFSConfig);
await host.register(agentFSPlugin);

// Access the filesystem via its adapter
const fs = host.getAdapter<FileSystemAdapter>('filesystem')!;
await fs.write('/workspace/notes.md', '# Project Findings');
```

## Capabilities

The AgentFS Plugin implements three distinct capabilities to integrate its virtual filesystem into the agent's environment.

### FileSystemAdapter

As a `FileSystemAdapter`, the plugin provides a generic interface for programmatic file operations. This allows other parts of the system to interact with the virtual filesystem for tasks like reading, writing, and listing files and directories [Source 1].

### ToolProvider

As a `ToolProvider`, the plugin automatically exposes a set of tools that an agent can use to interact with the filesystem. These tools include `fs_read`, `fs_write`, `fs_list`, and `fs_tree`, enabling the agent to perform file operations as part of its task execution [Source 1].

### ContextProvider

As a `ContextProvider`, the plugin injects a representation of the filesystem's directory and tool tree into the LLM's context. This provides the agent with awareness of the available files, directories, and mounted tools, allowing it to make more informed decisions about which file operations to perform [Source 1].

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/agentfs.ts