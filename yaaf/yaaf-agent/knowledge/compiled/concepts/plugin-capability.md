---
summary: A standardized interface or contract that defines a specific extension point or functionality a plugin can provide within YAAF.
title: Plugin Capability
entity_type: concept
related_subsystems:
 - "[Plugin System](../subsystems/plugin-system.md)"
see_also:
 - "[Plugin System](../subsystems/plugin-system.md)"
 - "[IPCAdapter](../apis/ipc-adapter.md)"
 - "[VectorStoreAdapter](../apis/vector-store-adapter.md)"
search_terms:
 - plugin interface
 - plugin contract
 - how to extend YAAF
 - YAAF extension points
 - plugin adapter
 - standardized plugin API
 - what is a capability
 - IPCAdapter capability
 - VectorStoreAdapter capability
 - pluggable architecture
 - swappable components
 - YAAF plugin types
stub: false
compiled_at: 2026-04-25T00:23:00.066Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A Plugin Capability is a formal, standardized TypeScript interface that defines a specific contract for a piece of functionality within the YAAF framework. It acts as a well-defined extension point, allowing different plugins to provide interchangeable implementations for a core service, such as inter-agent communication or vector storage [Source 1, Source 2].

The primary problem solved by this concept is modularity and extensibility. By having the core framework code interact with the capability interface rather than a concrete plugin implementation, developers can easily swap out default components for more advanced or specialized ones without altering the agent's core logic. For example, a simple in-memory vector store can be replaced with a production-grade, distributed vector database plugin as long as both implement the same `VectorStoreAdapter` capability [Source 2].

## How It Works in YAAF

In YAAF, a Plugin Capability is defined as a TypeScript `interface`. A key feature of this interface is a `readonly capability` property, which is a string literal that uniquely identifies the functionality. This allows the [Plugin System](../subsystems/plugin-system.md) to discover and manage plugins based on the services they provide [Source 1, Source 2].

For example:
- The `IPCAdapter` interface defines the contract for [Inter-Agent Communication (IPC)](./inter-agent-communication-ipc.md) and is identified by `readonly capability: "ipc"` [Source 1].
- The `VectorStoreAdapter` interface defines the contract for a semantic vector store and is identified by `readonly capability: "vectorstore"` [Source 2].

A plugin class then implements one or more of these capability interfaces. The [Plugin System](../subsystems/plugin-system.md) can then query for and provide the active implementation for a given capability to other parts of the framework.

**Example 1: `IPCAdapter`**
The `IPCAdapter` capability defines methods for sending, receiving, and subscribing to messages between agents. The built-in [InProcessIPCPlugin](../plugins/in-process-ipc-plugin.md) is one such implementation that uses an in-memory EventEmitter for same-process communication [Source 1].

```typescript
export interface IPCAdapter {
  readonly capability: "ipc";
  send(/* ... */): Promise<void>;
  readUnread(/* ... */): Promise<IPCMessage[]>;
  subscribe(/* ... */): () => void;
  // ... other methods
}

export class InProcessIPCPlugin extends PluginBase implements IPCAdapter { /* ... */ }
```

**Example 2: `VectorStoreAdapter`**
The `VectorStoreAdapter` capability defines methods for a vector database, such as `upsert`, `search`, and `delete`. The built-in `VectorMemoryPlugin` provides a basic TF-IDF implementation suitable for smaller projects. A developer could replace it with a `ChromaPlugin` or `QdrantPlugin` that implements the same `VectorStoreAdapter` interface for production use cases [Source 2].

```typescript
export interface VectorStoreAdapter {
  readonly capability: "vectorstore";
  upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>;
  search(query: string, topK: number): Promise<VectorSearchResult[]>;
  // ... other methods
}

export class VectorMemoryPlugin extends PluginBase implements VectorStoreAdapter { /* ... */ }
```

This design decouples the core agent logic from the specific implementation of its dependencies, making the system highly configurable and adaptable.

## Configuration

A developer selects a specific implementation for a capability by instantiating the corresponding plugin class and registering it with the `PluginHost`. The framework will then use this registered plugin whenever a component requests the associated capability.

The following example shows how to register the `VectorMemoryPlugin` to satisfy the `vectorstore` capability [Source 2].

```ts
import { PluginHost } from 'yaaf'
import { VectorMemoryPlugin } from 'yaaf/memory'

const host = new PluginHost()
// Registering this plugin makes it the provider for the "vectorstore" capability.
await host.register(new VectorMemoryPlugin())

// From this point on, memory retrieval in the agent will automatically
// use the semantic search functionality provided by VectorMemoryPlugin.
```

## See Also

*   [Plugin System](../subsystems/plugin-system.md): The subsystem responsible for managing plugins and their capabilities.
*   [IPCAdapter](../apis/ipc-adapter.md): The API definition for the inter-agent communication capability.
*   [VectorStoreAdapter](../apis/vector-store-adapter.md): The API definition for the vector store capability.
*   [InProcessIPCPlugin](../plugins/in-process-ipc-plugin.md): An example of a plugin that implements the [IPCAdapter](../apis/ipc-adapter.md) capability.

## Sources

*   [Source 1]: `src/integrations/inProcessIPC.ts`
*   [Source 2]: `src/memory/vectorMemory.ts`