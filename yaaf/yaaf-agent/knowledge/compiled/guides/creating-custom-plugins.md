---
title: Creating Custom Plugins
entity_type: guide
summary: A step-by-step guide on implementing the Plugin and capability interfaces to extend YAAF with custom functionality.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:10:45.946Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
confidence: 0.95
---

## Overview
YAAF (Yet Another Agent Framework) utilizes a provider-agnostic architecture where external capabilities—such as memory, browser automation, and filesystem access—are implemented as plugins. No integrations are hardcoded into the core framework. This guide demonstrates how to create a custom plugin by implementing the `Plugin` interface and one or more capability adapters, allowing you to swap or extend agent functionality without modifying core agent logic.

## Prerequisites
- A TypeScript development environment.
- Familiarity with the YAAF `PluginHost` and basic agent architecture.
- Access to the `yaaf` package types.

## Step-by-Step

### 1. Define the Plugin Structure
Every plugin must implement the `Plugin` interface, which requires a `name`, `version`, and a list of `capabilities`. Capabilities are string identifiers that tell the `PluginHost` what functionality the plugin provides.

```typescript
import type { Plugin, PluginCapability } from 'yaaf';

class MyCustomPlugin implements Plugin {
  readonly name = 'my-custom-plugin';
  readonly version = '1.0.0';
  readonly capabilities: readonly PluginCapability[] = ['memory'];

  async initialize() {
    // Setup logic (e.g., connecting to a database)
  }

  async destroy() {
    // Cleanup logic (e.g., closing connections)
  }
}
```

### 2. Implement Capability Adapters
To provide specific functionality, your plugin must implement the corresponding adapter interface. For example, to create a custom memory store using Redis, implement the `MemoryAdapter`.

```typescript
import type { Plugin, MemoryAdapter, MemoryEntry, PluginCapability } from 'yaaf';

class RedisMemoryPlugin implements Plugin, MemoryAdapter {
  readonly name = 'redis-memory';
  readonly version = '1.0.0';
  readonly capabilities: readonly PluginCapability[] = ['memory'];

  private redis: any; // Replace with actual Redis client type

  async initialize() {
    // Initialize your external service
    this.redis = await createRedisClient().connect();
  }

  async destroy() {
    await this.redis.quit();
  }

  // MemoryAdapter Implementation
  async save(entry: MemoryEntry) {
    await this.redis.set(`mem:${entry.key}`, JSON.stringify(entry));
  }

  async get(id: string) {
    const raw = await this.redis.get(`mem:${id}`);
    return raw ? JSON.parse(raw) : null;
  }

  async list() {
    const keys = await this.redis.keys('mem:*');
    return keys.map(k => k.replace('mem:', ''));
  }

  async search(query: string) {
    const keys = await this.redis.keys('mem:*');
    const entries = await Promise.all(keys.map(k => this.redis.get(k)));
    return entries
      .filter(Boolean)
      .map(e => JSON.parse(e!))
      .filter((e: MemoryEntry) => 
        e.content.toLowerCase().includes(query.toLowerCase())
      );
  }

  buildPrompt(entries: MemoryEntry[]) {
    if (entries.length === 0) return '';
    return `## Memory\n${entries.map(e => `- ${e.key}: ${e.content}`).join('\n')}`;
  }
}
```

### 3. Register the Plugin
Once defined, register the plugin with the `PluginHost`. The host manages the lifecycle of the plugin and provides access to its adapters.

```typescript
import { PluginHost } from 'yaaf';

const host = new PluginHost();
const redisPlugin = new RedisMemoryPlugin();

await host.register(redisPlugin);

// Access the capability via the host
const memory = host.getAdapter<MemoryAdapter>('memory');
```

### 4. Providing Tools or Context
Plugins can also expose native tools to agents or inject context into prompt assembly by implementing `ToolProvider` or `ContextProvider`.

- **ToolProvider**: Implement `getTools()` to return an array of tools.
- **ContextProvider**: Implement `gatherContext(query: string)` to return relevant strings for prompt construction.

## Configuration Reference

### Capability Checklist
When implementing a specific capability, the following methods are required:

| Capability | Required Methods |
|---|---|
| `memory` | `save`, `get`, `list`, `search`, `buildPrompt` |
| `browser` | `navigate`, `click`, `type`, `extract`, `screenshot` |
| `filesystem` | `read`, `write`, `list`, `tree` |
| `tools` | `getTools()` |
| `context` | `gatherContext(query)` |

## Common Mistakes
1. **Forgetting Initialization**: Plugins often require asynchronous setup (like database connections). Ensure `await host.register(plugin)` or `await plugin.initialize()` is called before use.
2. **Incorrect Capability Strings**: The `capabilities` array must contain the exact string identifiers (e.g., `'memory'`, `'browser'`) for `host.getAdapter<T>()` to function correctly.
3. **Missing Cleanup**: Failing to implement the `destroy()` method can lead to hanging network connections or memory leaks during agent shutdown.
4. **Type Mismatches**: When retrieving an adapter from the `PluginHost`, ensure the generic type matches the capability string (e.g., `getAdapter<MemoryAdapter>('memory')`).

## Next Steps
- Explore built-in plugins like `HonchoPlugin` for cloud memory or `AgentFSPlugin` for virtual filesystems.
- Learn how to connect external tools using the `McpPlugin` (Model Context Protocol).
- Integrate your custom plugin into an `Agent` instance.

## Sources
- Source 1: Plugin & Adapter Architecture (Internal Documentation)