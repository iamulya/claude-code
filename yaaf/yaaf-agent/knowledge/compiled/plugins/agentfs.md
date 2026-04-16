---
title: AgentFS Plugin
entity_type: plugin
summary: A virtual filesystem integration for YAAF that provides tool registries, shared state, and filesystem-based context for agents.
capabilities:
  - filesystem
  - tool-provider
  - context-provider
built_in: true
stub: false
compiled_at: 2026-04-16T14:21:15.096Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/agentfs.ts
confidence: 0.95
---

## Overview
The AgentFS Plugin provides a virtual filesystem (VFS) designed for agentic workflows. It serves as a centralized registry for tools and a shared state mechanism for agents. By implementing multiple adapter interfaces, it allows agents to interact with a structured file hierarchy, execute tools mounted within that hierarchy, and automatically include the filesystem state in their reasoning context.

The plugin manages various node types, including standard files and directories, as well as specialized nodes for tools and symbolic links.

## Installation
The AgentFS Plugin is included as a standard integration within the YAAF framework. It can be imported from the integrations module.

```typescript
import { PluginHost } from 'yaaf';
import { AgentFSPlugin } from 'yaaf/integrations';
```

## Configuration
The plugin is configured via the `AgentFSConfig` object passed to the constructor.

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `maxFileSize` | `number` | `1048576` (1MB) | Maximum size of an individual file in bytes. |
| `maxTotalSize` | `number` | `5242