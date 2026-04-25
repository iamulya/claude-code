---
summary: Defines the interface for interacting with a virtual filesystem within YAAF.
title: FileSystemAdapter
entity_type: concept
related_subsystems:
 - plugins
see_also:
 - "[AgentFS Plugin](../plugins/agent-fs-plugin.md)"
 - "[ToolProvider](./tool-provider.md)"
 - "[ContextProvider](./context-provider.md)"
search_terms:
 - virtual filesystem
 - agent file access
 - how to read and write files
 - agent workspace
 - VFS for agents
 - filesystem abstraction
 - AgentFSPlugin interface
 - file system operations
 - adapter for files
 - plugin file storage
 - generic fs operations
 - swappable storage backend
stub: false
compiled_at: 2026-04-25T00:19:23.529Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
compiled_from_quality: unknown
confidence: 0.98
---

## What It Is

The FileSystemAdapter is an interface that defines a standard contract for interacting with a virtual filesystem within the YAAF framework. It serves as an abstraction layer, decoupling agents and tools from the specific implementation of file storage. This allows different plugins to provide filesystem capabilities in a consistent and interchangeable manner.

The primary problem solved by this adapter is providing a stable API for file operations (e.g., reading, writing, listing files) regardless of the underlying storage mechanism, which could be in-memory, on-disk, or a remote service. The most common implementation of this interface is provided by the [AgentFS Plugin](../plugins/agent-fs-plugin.md) [Source 1].

## How It Works in YAAF

The FileSystemAdapter follows the adapter pattern common in YAAF's plugin architecture. A plugin, such as [AgentFS Plugin](../plugins/agent-fs-plugin.md), implements the `FileSystemAdapter` interface to offer generic filesystem operations [Source 1]. Other parts of the system, like agents or tools, can then request an instance of this adapter from the `PluginHost` without needing to know which specific plugin is providing the service.

The adapter is retrieved by its designated name, typically `'filesystem'`. Once obtained, its methods can be used for file manipulation [Source 1].

```typescript
const host = new PluginHost();
// The AgentFSPlugin implements the FileSystemAdapter interface.
await host.register(new AgentFSPlugin());

// Retrieve the adapter from the host.
const fs = host.getAdapter<FileSystemAdapter>('filesystem')!;

// Use the adapter's methods to interact with the virtual filesystem.
await fs.write('/workspace/notes.md', '# Findings');
```

The [AgentFS Plugin](../plugins/agent-fs-plugin.md) also exposes filesystem capabilities as tools (e.g., `fs_read`, `fs_write`, `fs_list`) and as a [ContextProvider](./context-provider.md), which can inject a representation of the filesystem tree into an [LLM](./llm.md)'s context [Source 1]. These higher-level features are built upon the fundamental operations defined by the FileSystemAdapter interface.

## Configuration

While the `FileSystemAdapter` itself is an interface with no configuration, its concrete implementations can be configured. For example, the [AgentFS Plugin](../plugins/agent-fs-plugin.md) accepts a configuration object to set limits and control behavior [Source 1].

```typescript
export type AgentFSConfig = {
  /** Maximum file size in bytes (default: 1MB) */
  maxFileSize?: number;
  /** Maximum total storage in bytes (default: 50MB) */
  maxTotalSize?: number;
  /** Enable change tracking (default: true) */
  trackChanges?: boolean;
};
```

This allows developers to tune the virtual filesystem's constraints, such as total storage capacity and maximum individual file size, for the specific needs of their agent application.

## See Also

- [AgentFS Plugin](../plugins/agent-fs-plugin.md): The primary implementation of the FileSystemAdapter.
- [ToolProvider](./tool-provider.md): An interface often implemented alongside FileSystemAdapter to expose filesystem operations as tools.
- [ContextProvider](./context-provider.md): An interface used to inject filesystem state into the agent's context.

## Sources

[Source 1]: src/integrations/agentfs.ts