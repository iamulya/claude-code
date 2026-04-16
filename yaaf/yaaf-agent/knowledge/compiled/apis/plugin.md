---
title: Plugin
entity_type: api
summary: The base interface that all YAAF plugins must implement to provide metadata and lifecycle management.
export_name: Plugin
source_file: src/plugin/types.ts
category: interface
stub: false
compiled_at: 2026-04-16T14:10:48.918Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/plugin/types.ts
confidence: 1
---

## Overview
The `Plugin` interface is the foundational contract for all extensions within the YAAF framework. It defines the metadata and lifecycle methods required for a component to be managed by the `PluginHost`. 

YAAF employs a provider-agnostic architecture where external capabilities—such as memory storage, web automation, and filesystem access—are implemented as plugins. This design ensures that backends are swappable, capabilities are composable, and integrations remain testable through mocking. A single plugin may implement multiple adapter interfaces (e.g., acting as both a `MemoryAdapter` and a `ToolProvider`) by declaring them in its `capabilities` array.

## Signature / Constructor

```typescript
export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly capabilities: readonly PluginCapability[];
  initialize?(): Promise<void>;
  destroy?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
}
```

### Related Types
**PluginCapability**
A union type of string literals representing the functional interfaces a plugin can implement. Core capabilities include:
* `memory`: Implements `MemoryAdapter` for persistent storage.
* `browser`: Implements `BrowserAdapter` for web automation.
* `filesystem`: Implements `FileSystemAdapter` for virtual file operations.
* `tool_provider`: Implements `ToolProvider` to contribute tools to agents.
* `context_provider`: Implements `ContextProvider` to inject prompt sections.
* `llm`: Implements `LLMAdapter` for model interactions.
* `mcp`: Implements `McpAdapter` for Model Context Protocol bridging.

## Methods & Properties

### Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | A unique identifier for the plugin (e.g., 'honcho', 'agentfs'). |
| `version` | `string` | A semver-compliant version string. |
| `capabilities` | `readonly PluginCapability[]` | An array of capability keys that the plugin supports. The `PluginHost` uses this to route adapter requests. |

### Methods
| Method | Signature | Description |
| :--- | :--- | :--- |
| `initialize` | `() => Promise<void>` | Optional. Called once during registration with the `PluginHost`. Used for async setup like API connections or process spawning. |
| `destroy` | `() => Promise<void>` | Optional. Called during `PluginHost` shutdown. Used for graceful cleanup, such as closing connections or flushing buffers. |
| `healthCheck` | `() => Promise<boolean>` | Optional. Returns the operational status of the plugin. Called periodically by the host for monitoring. |

## Examples

### Implementing a Custom Plugin
This example demonstrates a plugin that implements both the base `Plugin` interface and a `MemoryAdapter`.

```typescript
import type { Plugin, MemoryAdapter, MemoryEntry, PluginCapability } from 'yaaf';

class MyStoragePlugin implements Plugin, MemoryAdapter {
  readonly name = 'custom-storage';
  readonly version = '1.0.0';
  readonly capabilities: readonly PluginCapability[] = ['memory'];

  async initialize() {
    // Perform setup, e.g., connecting to a database
    console.log('Storage initialized');
  }

  async save(entry: MemoryEntry) {
    // Implementation of MemoryAdapter.save
    return 'entry-id';
  }

  // ... other MemoryAdapter methods (get, list, search, buildPrompt)
  
  async destroy() {
    // Cleanup logic
    console.log('Storage shut down');
  }
}
```

### Registering with PluginHost
Plugins are typically registered with a host which manages their lifecycle.

```typescript
import { PluginHost } from 'yaaf';

const host = new PluginHost();
const myPlugin = new MyStoragePlugin();

// Registration triggers the initialize() method
await host.register(myPlugin);

// Graceful shutdown triggers the destroy() method on all plugins
await host.destroyAll();
```

## See Also
* PluginHost
* MemoryAdapter
* BrowserAdapter
* FileSystemAdapter
* ToolProvider