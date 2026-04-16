---
title: Plugin Capability
entity_type: concept
summary: A declaration of specific functionality provided by a YAAF plugin, allowing the PluginHost to route requests to the appropriate adapter.
related_subsystems:
  - PluginHost
stub: false
compiled_at: 2026-04-16T14:10:17.479Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/plugin/base.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/plugin/types.ts
confidence: 1
---

## What It Is

A **Plugin Capability** is a formal declaration of a functional interface implemented by a YAAF plugin. It serves as a contract between the plugin and the `PluginHost`, ensuring that external integrations—such as memory stores, browsers, or filesystems—remain decoupled from the core agent logic.

By using capabilities, YAAF achieves several architectural goals:
- **Swappable Backends**: Developers can switch from local file-based memory to a cloud provider like Honcho by changing the registered plugin without modifying agent code.
- **Composability**: Multiple plugins can be registered simultaneously to provide a combined suite of features.
- **Discoverability**: The `PluginHost` can automatically route requests to the correct adapter based on the capabilities declared by registered plugins.
- **Testability**: Specific capabilities can be mocked during testing by registering a mock plugin that implements the required interface.

## How It Works in YAAF

In YAAF, a capability is represented by a string identifier defined in the `PluginCapability` type. Every plugin must expose a `capabilities` property—a read-only array of these identifiers.

### The PluginHost Registry
The `PluginHost` maintains an internal index of all registered plugins, keyed by their capabilities. This allows for $O(1)$ lookups when an agent or developer requests a specific adapter. When a plugin is registered via `host.register(plugin)`, the host inspects the `capabilities` array and maps the plugin to each declared functional area.

### Capability Mapping
Each capability string corresponds to a specific TypeScript interface (Adapter). Common mappings include:

| Capability | Interface | Purpose |
|---|---|---|
| `memory` | `MemoryAdapter` | Persistent storage, querying, and search. |
| `browser` | `BrowserAdapter` | Web automation (navigation, interaction, scraping). |
| `filesystem` | `FileSystemAdapter` | Virtual filesystem operations for agent state. |
| `tool_provider` | `ToolProvider` | Dynamic contribution of tools to the agent. |
| `context_provider` | `ContextProvider` | Injection of context sections into system prompts. |
| `llm` | `LLMAdapter` | Full LLM backend management. |
| `mcp` | `McpAdapter` | Model Context Protocol server bridging. |

Note: There is a minor discrepancy in source documentation regarding the tool capability; while some architectural diagrams refer to it as `tools`, the core type definition identifies it as `tool_provider`.

### Multi-Capability Plugins
A single plugin can implement multiple capabilities. For example, the `AgentFSPlugin` provides both `filesystem` (for file operations) and `tool_provider` (to expose those operations as tools the agent can call).

## Configuration

Developers define capabilities when creating custom plugins by implementing the `Plugin` interface or extending the `PluginBase` class.

### Defining a Custom Plugin
When defining a plugin, the `capabilities` array must be populated with the supported identifiers.

```typescript
import type {
  Plugin,
  MemoryAdapter,
  MemoryEntry,
  PluginCapability,
} from 'yaaf';

class RedisMemoryPlugin implements Plugin, MemoryAdapter {
  readonly name         = 'redis-memory';
  readonly version      = '1.0.0';
  // Declare the capability here
  readonly capabilities: readonly PluginCapability[] = ['memory'];

  async initialize() {
    // Setup logic (e.g., connecting to Redis)
  }

  async save(entry: MemoryEntry) { /* ... */ }
  async get(id: string) { /* ... */ }
  async search(query: string) { /* ... */ }
  // ... other MemoryAdapter methods
}
```

### Retrieving Adapters by Capability
Once registered, the `PluginHost` provides the `getAdapter<T>(capability)` method to retrieve the implementation.

```typescript
import { PluginHost } from 'yaaf';

const host = new PluginHost();
await host.register(new RedisMemoryPlugin());

// Retrieve the plugin via its capability string
const memory = host.getAdapter<MemoryAdapter>('memory');

if (memory) {
  await memory.save({
    key: 'session_start',
    content: 'User initiated session',
    type: 'event'
  });
}
```

### Built-in Capabilities
YAAF includes several predefined capability categories:
- **Core**: `memory`, `browser`, `filesystem`, `tool_provider`, `context_provider`, `llm`, `mcp`.
- **Safety & Observability**: `security`, `observability`, `notification`, `ingester`.
- **Extension Points**: `compaction` (custom context strategies), `skill_provider` (dynamic skill injection), `session` (persistence), and `linter_rule` (KB validation).