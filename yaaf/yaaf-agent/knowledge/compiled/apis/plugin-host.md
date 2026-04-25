---
summary: A YAAF API for managing the lifecycle of plugins, including registration, initialization, and destruction, integrating them into the framework.
export_name: PluginHost
source_file: src/plugin/host.ts
category: class
title: PluginHost
entity_type: api
search_terms:
 - plugin management
 - registering plugins
 - how to add a plugin
 - plugin lifecycle
 - YAAF plugin system
 - extending YAAF functionality
 - custom search adapter
 - custom graph adapter
 - plugin initialization
 - plugin destruction
 - service locator pattern
 - dependency injection for plugins
 - get registered plugin
stub: false
compiled_at: 2026-04-24T17:28:53.549Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/wikilinkGraph.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/costTracker.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `PluginHost` class is a central component in YAAF for managing the lifecycle and [Discovery](../concepts/discovery.md) of plugins. It functions as a registry where various pluggable components can be registered, initialized, and discovered by other parts of the framework.

By centralizing plugin management, `PluginHost` ensures that plugins are properly initialized upon registration and gracefully shut down [when](./when.md) the host is destroyed. This enables a modular and extensible architecture, allowing developers to replace default implementations with custom ones. For example, the default `TfIdfSearchPlugin` can be replaced by a custom `KBSearchAdapter` implementation by registering it with the `PluginHost` [Source 3, Source 4].

Other YAAF components can interact with `PluginHost` to discover and utilize registered plugins. The `CostTracker`, for instance, can be provided with a `PluginHost` instance to automatically discover all registered `LLMAdapter` plugins and aggregate their pricing information [Source 5].

## Signature / Constructor

The direct source code for `PluginHost` is not provided, but its usage can be inferred from other components. It is instantiated as a standard class.

```typescript
// Conceptual usage
import { PluginHost } from 'yaaf';

const host = new PluginHost();
```

## Methods & Properties

Based on usage in the source material, `PluginHost` exposes the following methods:

### register()

Registers a plugin instance with the host, managing its initialization. The method is asynchronous, suggesting it likely calls an `initialize()` method on the plugin itself.

**Signature**
```typescript
async register(plugin: PluginBase): Promise<void>;
```

**Parameters**
- `plugin`: An instance of a class that conforms to the `PluginBase` interface or a specific plugin adapter interface (e.g., `KBSearchAdapter`, `SandboxExternalBackend`).

### destroyAll()

Destroys all registered plugins, managing their graceful shutdown and resource cleanup. This method is typically called during application termination. It is expected to call a `destroy()` or `dispose()` method on each registered plugin [Source 1].

**Signature**
```typescript
async destroyAll(): Promise<void>;
```

### Plugin Discovery

While no explicit `getPlugin` method is shown in the provided sources, the behavior of components like `CostTracker` and `KnowledgeBase` implies that `PluginHost` provides a mechanism to query for registered plugins by their type or interface [Source 3, Source 5]. This allows different parts of the system to be decoupled from concrete plugin implementations.

## Examples

### Registering a Sandbox Backend

This example shows how to register a `FirecrackerSandboxBackend` with `PluginHost` to manage its lifecycle. This automatically calls the backend's `initialize()` method.

```typescript
import { PluginHost } from 'yaaf';
import { FirecrackerSandboxBackend } from 'yaaf/[[[[[[[[Integrations]]]]]]]]';
import { Sandbox } from 'yaaf';

// Assume 'host' is an existing PluginHost instance
const host = new PluginHost();

// Assume 'sandbox' is an existing Sandbox instance
const sandbox = new Sandbox({ sandboxRuntime: 'external' });

const backend = new FirecrackerSandboxBackend({
  kernelImagePath: '/images/vmlinux.bin',
  rootfsImagePath: '/images/yaaf-rootfs.ext4',
});

// Registering the plugin calls its initialize() method automatically
await host.register(backend);

// The sandbox can now use the backend
sandbox.setBackend(backend);

// At application shutdown, host.destroyAll() will call backend.destroy()
// await host.destroyAll();
```
*[Source 1]*

### Registering a Custom Search Plugin

This example demonstrates registering the built-in `TfIdfSearchPlugin` to make it available to the `KnowledgeBase` system. A custom implementation of `KBSearchAdapter` would be registered in the same way.

```typescript
import { PluginHost } from 'yaaf';
import { TfIdfSearchPlugin } from 'yaaf/knowledge';

// Assume 'host' is an existing PluginHost instance
const host = new PluginHost();

const searchPlugin = new TfIdfSearchPlugin({
  // Configuration options
});

// Register the plugin. The KnowledgeBase will now use this for searches.
await host.register(searchPlugin);
```
*[Source 3]*

### Integration with CostTracker

The `CostTracker` can use a `PluginHost` to automatically discover pricing information from any registered `LLMAdapter` plugins, avoiding the need to manually configure costs for each model.

```typescript
import { PluginHost, CostTracker } from 'yaaf';
// Assume MyCustomLLMAdapter is a user-defined LLM plugin
import { MyCustomLLMAdapter } from './my-llm-adapter.js';

const host = new PluginHost();

// Register one or more LLM adapters that declare their pricing
await host.register(new MyCustomLLMAdapter());

// Pass the host to the CostTracker. It will query the host
// for all LLMAdapter plugins and merge their pricing tables.
const tracker = new CostTracker({ pluginHost: host });

// Now the tracker knows the cost for models provided by MyCustomLLMAdapter
tracker.record('my-custom-model-v1', { inputTokens: 1000, outputTokens: 500 });
```
*[Source 5]*

## Sources

[Source 1]: src/Integrations/sandbox.firecracker.ts
[Source 2]: src/knowledge/store/store.ts
[Source 3]: src/knowledge/store/tfidfSearch.ts
[Source 4]: src/knowledge/store/wikilinkGraph.ts
[Source 5]: src/utils/costTracker.ts