---
title: MemoryAdapter
entity_type: concept
summary: A plugin capability interface that allows plugins to provide memory storage and retrieval functionality to YAAF.
related_subsystems:
 - plugin_system
see_also:
 - "[Memory](./memory.md)"
 - "[ContextProvider](./context-provider.md)"
 - "[Honcho Plugin](../plugins/honcho-plugin.md)"
search_terms:
 - agent memory storage
 - how to save agent state
 - long-term memory plugin
 - short-term memory plugin
 - memory interface
 - pluggable memory
 - getAdapter('memory')
 - memory capability
 - framework memory interface
 - state persistence for agents
 - cloud memory integration
stub: false
compiled_at: 2026-04-25T00:21:17.446Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

The `MemoryAdapter` is a standardized capability interface in YAAF that defines a contract for [Memory](./memory.md) management. It allows YAAF plugins to provide concrete implementations for storing and retrieving an agent's memories. This pattern decouples the core agent logic from any specific memory backend, making the memory system pluggable. Developers can switch between different memory solutions—such as in-memory stores, local file systems, or cloud-based services—by simply registering a different plugin that implements the `MemoryAdapter` interface.

## How It Works in YAAF

A plugin, such as the [Honcho Plugin](../plugins/honcho-plugin.md), can declare that it implements the `MemoryAdapter` interface [Source 1]. When this plugin is registered with the framework's `PluginHost`, YAAF recognizes that it provides the "memory" capability.

Other parts of the system can then request access to this capability from the `PluginHost` by calling `host.getAdapter<MemoryAdapter>('memory')`. This method returns an instance that conforms to the `MemoryAdapter` interface, allowing the caller to interact with the memory system through a standard set of methods, like `save`, without needing to know the details of the underlying implementation [Source 1].

## Configuration

The following example demonstrates how a plugin that provides a `MemoryAdapter` is registered and how the adapter is subsequently retrieved and used. In this case, the [Honcho Plugin](../plugins/honcho-plugin.md) provides the implementation [Source 1].

```typescript
import { PluginHost } from 'yaaf-agent';
import { HonchoPlugin, MemoryAdapter } from 'yaaf-honcho-plugin';

// 1. Initialize the PluginHost
const host = new PluginHost();

// 2. Register a plugin that implements MemoryAdapter
await host.register(new HonchoPlugin({
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-app',
  defaultPeerId: 'alice',
}));

// 3. Retrieve the MemoryAdapter from the host
const memory = host.getAdapter<MemoryAdapter>('memory');

// 4. Use the adapter's methods to interact with memory
if (memory) {
  await memory.save({ 
    name: 'User prefers dark mode',
    content: 'The user explicitly stated a preference for dark UI themes.',
    importance: 0.8 
  });
}
```

## See Also

- [Memory](./memory.md): The core concept of an agent's stored information.
- [ContextProvider](./context-provider.md): Another common plugin capability for injecting contextual information.
- [Honcho Plugin](../plugins/honcho-plugin.md): A concrete example of a plugin that implements the `MemoryAdapter` interface.

## Sources

[Source 1]: src/integrations/honcho.ts