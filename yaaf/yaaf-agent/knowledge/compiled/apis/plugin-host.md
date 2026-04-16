---
title: PluginHost
entity_type: api
summary: The central registry and manager for YAAF plugins, providing methods to register plugins and retrieve specific capability adapters.
export_name: PluginHost
source_file: src/plugin-host.ts
category: class
stub: false
compiled_at: 2026-04-16T14:10:34.791Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/plugin/types.ts
confidence: 0.95
---

## Overview
The `PluginHost` is the central registry and capability index for the YAAF framework. It manages the lifecycle of external integrations, ensuring that capabilities such as memory, browser automation, and filesystems are swappable and composable without modifying core agent logic.

The host maintains an internal index keyed by capability, allowing for $O(1)$ lookups of specific adapters. It acts as the primary router for:
* **Swappable backends**: Switching between different implementations of the same interface (e.g., moving from local file memory to cloud-hosted memory).
* **Capability composition**: Combining multiple plugins to provide a unified set of tools and context to an agent.
* **Lifecycle management**: Initializing plugins on registration and ensuring graceful shutdown.

## Signature / Constructor
The `PluginHost` is instantiated without parameters.

```typescript
const host = new PluginHost();
```

## Methods & Properties

### register()
Registers a plugin with the host and triggers its initialization.
* **Signature**: `register(plugin: Plugin): Promise<void>`
* **Description**: Adds the plugin to the internal registry, indexes its declared capabilities, and calls the plugin's `initialize()` method if present.