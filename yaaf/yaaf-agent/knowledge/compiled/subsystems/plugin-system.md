---
title: Plugin System
entity_type: subsystem
summary: The central architectural component of YAAF that manages swappable backends and composable capabilities through a unified adapter interface.
primary_files:
  - src/plugin/types.ts
  - src/plugin/base.ts
exports:
  - PluginHost
  - PluginBase
  - Plugin
  - MemoryAdapter
  - BrowserAdapter
  - FileSystemAdapter
  - ToolProvider
  - ContextProvider
stub: false
compiled_at: 2026-04-16T14:10:12.709Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/plugin/base.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/plugin/types.ts
confidence: 1
---

## Purpose
The Plugin System is the architectural foundation that enables YAAF to remain provider-agnostic and production-grade. It solves the problem of hardcoded integrations by providing a unified adapter interface for all external capabilities, such as memory storage, web browsing, and filesystem access.

The system is designed around four core principles:
1.  **Swappable Backends**: Developers can switch implementations (e.g., from local file-based memory to a cloud-hosted service like Honcho) by registering a different plugin without modifying agent logic.
2.  **Composable Capabilities**: Multiple plugins can be combined to provide a rich set of features to a single agent.
3.  **Testability**: Any external capability can be mocked by implementing its corresponding adapter interface.
4.  **Discoverability**: Plugins declare their capabilities upfront, allowing the framework to route requests to the appropriate adapter automatically.

## Architecture
The subsystem follows a hub-and-spoke model where a central `PluginHost` manages a collection of plugins. Each plugin implements the base `Plugin` interface and one or more specialized adapter interfaces.

### Internal Structure
```
                    PluginHost
              ┌──────────────────────────┐
              │  register(plugin)         │
              │  getAdapter<T>(capability)│
              │  getAllTools()            │
              │  gatherContext(query)     │
              │  destroyAll()            │
              └──────┬───────────────────┘
                     │ holds
        ┌────────────┼─────────────┐
        ▼            ▼             ▼
   HonchoPlugin  AgentFSPlugin  CamoufoxPlugin
   (memory)      (fs + tools)   (browser + tools)
        │            │             │
        ▼            ▼             ▼
  MemoryAdapter  FileSystemAdapter + ToolProvider
                                BrowserAdapter + ToolProvider
```

### Key Components
*   **PluginHost**: The central registry and capability index. It maintains an O(1) lookup table of registered plugins keyed by their declared capabilities.
*   **PluginBase**: An abstract base class that provides boilerplate implementations for versioning, capability declaration, and health checks.
*   **Adapter Interfaces**: Strongly-typed contracts that define how the framework interacts with specific capabilities (e.g., `MemoryAdapter`, `BrowserAdapter`).

## Integration Points
The Plugin System integrates with other YAAF subsystems through the `PluginHost`:
*   **Tool System**: The `PluginHost` aggregates tools from all plugins implementing the `ToolProvider` interface via `getAllTools()`.
*   **Context Manager**: Plugins implementing `ContextProvider` can inject dynamic context sections into the system prompt during the prompt assembly phase.
*   **Agent Runner**: Agents are typically initialized with a set of plugins which are then managed by an internal `PluginHost` instance.

## Key APIs

### PluginHost
The primary interface for managing the plugin lifecycle and accessing capabilities.
*   `register(plugin: Plugin)`: Initializes and stores a plugin.
*   `getAdapter<T>(capability: PluginCapability)`: Retrieves the first registered plugin that provides the specified capability.
*   `getAllTools()`: Collects all tools from every registered `ToolProvider`.
*   `gatherContext(query: string)`: Asynchronously gathers context strings from all `ContextProvider` plugins.
*   `destroyAll()`: Performs a graceful shutdown of all registered plugins.

### Core Adapter Interfaces
| Interface | Capability | Purpose |
|---|---|---|
| `MemoryAdapter` | `memory` | Persistent storage, retrieval, and search of agent memories. |
| `BrowserAdapter` | `browser` | Web automation including navigation, interaction, and scraping. |
| `FileSystemAdapter` | `filesystem` | Virtual filesystem operations for agent state and workspace management. |
| `ToolProvider` | `tool_provider` | Dynamic contribution of tools to the agent's toolset. |
| `ContextProvider` | `context_provider` | Injection of context sections into the system prompt. |
| `LLMAdapter` | `llm` | Full LLM backend management including completion and streaming. |

## Configuration
Plugins are configured during instantiation and then registered with the `PluginHost`.

```typescript
import { PluginHost, HonchoPlugin, AgentFSPlugin } from 'yaaf';

const host = new PluginHost();

await host.register(new HonchoPlugin({
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-app',
}));

await host.register(new AgentFSPlugin({
  rootDir: './workspace'
}));
```

## Extension Points
Developers can extend YAAF by implementing the `Plugin` interface and any relevant adapter interfaces.

### Custom Plugin Example
A developer can create a custom storage backend by implementing the `MemoryAdapter`:

```typescript
import type { Plugin, MemoryAdapter, MemoryEntry, PluginCapability } from 'yaaf';

class RedisMemoryPlugin implements Plugin, MemoryAdapter {
  readonly name = 'redis-memory';
  readonly version = '1.0.0';
  readonly capabilities: readonly PluginCapability[] = ['memory'];

  async initialize() {
    // Setup Redis connection
  }

  async save(entry: MemoryEntry) {
    // Implementation for Redis SET
  }

  async search(query: string) {
    // Implementation for Redis search
  }

  buildPrompt() {
    return "## Memory\n...";
  }
}
```

### Capability Checklist
To implement a specific capability, a plugin must provide the following methods:
*   **memory**: `save`, `get`, `list`, `search`, `buildPrompt`.
*   **browser**: `navigate`, `click`, `type`, `extract`, `screenshot`.
*   **filesystem**: `read`, `write`, `list`, `tree`.
*   **tool_provider**: `getTools()`.
*   **context_provider**: `gatherContext(query)`.