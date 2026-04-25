---
summary: Configuration options for the AgentFS plugin, controlling storage limits and features.
title: AgentFSConfig
entity_type: api
export_name: AgentFSConfig
source_file: src/integrations/agentfs.ts
category: type
search_terms:
 - agent file system settings
 - virtual filesystem configuration
 - max file size limit
 - total storage quota
 - agentfs storage limits
 - enable file change tracking
 - configure AgentFSPlugin
 - filesystem plugin options
 - agent workspace size
 - yaaf fs config
 - set agent storage capacity
 - limit agent file uploads
stub: false
compiled_at: 2026-04-25T00:03:56.698Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`AgentFSConfig` is a TypeScript type that defines the configuration options for the [AgentFS Plugin](../plugins/agent-fs-plugin.md). It allows developers to customize the behavior and resource limits of the virtual filesystem provided to an agent [Source 1].

This configuration object is typically passed to the constructor of the [AgentFS Plugin](../plugins/agent-fs-plugin.md) upon registration. Key settings include defining the maximum size for individual files, setting a quota for the total storage space available to the agent, and enabling or disabling the tracking of file changes within the virtual filesystem [Source 1].

## Signature

The `AgentFSConfig` type is an object with the following optional properties [Source 1]:

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

### Properties

- **`maxFileSize`** `?number`
  - The maximum permitted size for a single file in bytes.
  - **Default**: `1048576` (1MB) [Source 1].

- **`maxTotalSize`** `?number`
  - The total storage capacity of the virtual filesystem in bytes.
  - **Default**: `52428800` (50MB) [Source 1].

- **`trackChanges`** `?boolean`
  - If `true`, the filesystem will record creation, update, and deletion events.
  - **Default**: `true` [Source 1].

## Examples

### Customizing Filesystem Limits

This example demonstrates how to configure the [AgentFS Plugin](../plugins/agent-fs-plugin.md) with custom storage limits and disable change tracking.

```typescript
import { PluginHost } from 'yaaf';
import { AgentFSPlugin, type AgentFSConfig } from 'yaaf/plugins';

// Define custom configuration for the agent's virtual filesystem
const customFsConfig: AgentFSConfig = {
  // Set max file size to 2MB
  maxFileSize: 2 * 1024 * 1024,
  // Set total storage quota to 100MB
  maxTotalSize: 100 * 1024 * 1024,
  // Disable change tracking for performance if not needed
  trackChanges: false,
};

const host = new PluginHost();

// Register the AgentFSPlugin with the custom configuration
await host.register(new AgentFSPlugin(customFsConfig));

// The filesystem adapter provided by the host will now enforce these new limits.
const fs = host.getAdapter('filesystem');
```

## See Also

- [AgentFS Plugin](../plugins/agent-fs-plugin.md): The plugin that utilizes this configuration object.

## Sources

[Source 1]: src/integrations/agentfs.ts