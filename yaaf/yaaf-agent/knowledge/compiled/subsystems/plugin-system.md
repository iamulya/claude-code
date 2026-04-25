---
title: Plugin System
entity_type: subsystem
summary: The YAAF subsystem responsible for managing, loading, and orchestrating plugins and their capabilities.
primary_files:
 - src/plugin/base.ts
 - src/plugin/types.ts
exports:
 - PluginBase
 - Plugin
 - PluginCapability
 - LLMAdapter
 - KBSearchAdapter
search_terms:
 - YAAF plugins
 - how to add a new backend
 - swappable components
 - adapter pattern in YAAF
 - extending YAAF functionality
 - plugin lifecycle management
 - LLM adapter
 - memory adapter
 - search adapter
 - plugin capabilities
 - registering a plugin
 - PluginHost
 - PluginBase class
stub: false
compiled_at: 2026-04-24T18:18:23.827Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/plugin/base.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Plugin System is a core architectural component of YAAF that provides [Adapter Interfaces](../concepts/adapter-interfaces.md) for [Swappable Backends](../concepts/swappable-backends.md) [Source 1]. Its primary purpose is to decouple the framework's core logic from concrete implementations of external services or strategies. This allows developers to extend YAAF's functionality and integrate different providers for key operations such as [LLM](../concepts/llm.md) interaction, knowledge base searching, and sandboxed code execution.

By defining standardized interfaces, the Plugin System makes YAAF provider-agnostic and highly extensible. For example, a developer can replace the default [TF-IDF](../concepts/tf-idf.md) search mechanism with a different one by simply providing a new plugin that implements the `KBSearchAdapter` interface [Source 4]. The system also provides optional, centralized lifecycle management for plugins through a `PluginHost`, which can automatically initialize and dispose of registered plugins [Source 2].

## Architecture

The Plugin System is designed around a set of core interfaces and a base class that standardize how extensions are built and managed.

- **`Plugin` Interface**: The fundamental contract that all plugins must adhere to. It is defined in `src/plugin/types.ts` [Source 6].
- **`PluginBase` Class**: An abstract base class that provides boilerplate implementations for common plugin properties like `name`, `version`, `capabilities`, and a default `healthCheck()` method. Plugin authors are encouraged to extend this class to reduce redundant code [Source 6].
- **`PluginCapability`**: A type used by plugins to declare the functionalities they provide (e.g., `'memory'`, `'llm'`). This allows other parts of the system to discover and select appropriate plugins [Source 6].
- **Adapter Interfaces**: Specific interfaces that extend the base `Plugin` interface to define the contract for a particular capability. Examples include `LLMAdapter` for language model interactions [Source 5], `KBSearchAdapter` for knowledge base searching [Source 3], and `SandboxExternalBackend` for [Tool Execution](../concepts/tool-execution.md) environments [Source 2].
- **`PluginHost`**: A central registry and lifecycle manager for plugins. While its own source code is not detailed in the provided materials, its role is evident. Other subsystems can register plugins with the `PluginHost`, which then manages their initialization and destruction. This also facilitates integration with framework-level features like health checks [Source 2, Source 4].

Plugins in YAAF often have a dual nature: they can be instantiated and used directly by a component (standalone mode) or registered with the `PluginHost` for managed lifecycle and broader availability [Source 2].

## Integration Points

Various subsystems within YAAF rely on the Plugin System to acquire implementations for their dependencies.

- **Knowledge Base**: The `KBStore` can be configured with a custom `KBSearchAdapter` plugin. If no custom adapter is registered with the `PluginHost`, it defaults to using the built-in `TfIdfSearchPlugin` [Source 3, Source 4].
- **Models**: All interactions with Large Language Models are mediated through the `LLMAdapter` plugin interface. Concrete implementations for different model providers extend the `BaseLLMAdapter` class [Source 5].
- **Sandbox**: The tool execution `Sandbox` can be configured with an external backend that implements the `SandboxExternalBackend` interface. The `FirecrackerSandboxBackend` is an example of such a plugin, which can be managed by the `PluginHost` or used in a standalone capacity [Source 2].

## Key APIs

- **`PluginBase`**: The abstract base class located in `src/plugin/base.ts`. It is the recommended starting point for creating any new plugin, providing default implementations for the `Plugin` interface [Source 6].
- **`LLMAdapter`**: An interface defining the contract for interacting with language models. Implementations of this adapter are responsible for making API calls to specific LLM providers [Source 5].
- **`KBSearchAdapter`**: An interface for knowledge base search functionality. The `TfIdfSearchPlugin` is the default implementation provided by the framework [Source 3, Source 4].

## Configuration

Developers can integrate plugins in two primary ways:

1.  **Standalone Instantiation**: A plugin can be instantiated directly and passed to the constructor or a setter method of the subsystem that requires it. This approach gives the developer full control over the plugin's lifecycle.

    ```typescript
    // Example of standalone plugin usage
    const backend = new FirecrackerSandboxBackend({
      kernelImagePath: '/images/vmlinux.bin',
      rootfsImagePath: '/images/yaaf-rootfs.ext4',
    });
    await backend.initialize(); // Manual lifecycle management

    const sandbox = new Sandbox({ sandboxRuntime: 'external', sandboxBackend: backend });
    ```
    [Source 2]

2.  **Registration with `PluginHost`**: A plugin instance can be registered with the central `PluginHost`. The host then manages the plugin's lifecycle, calling methods like `initialize()` and `dispose()` automatically. This is the recommended approach for integrating with framework-wide services.

    ```typescript
    // Example of PluginHost-managed usage
    const backend = new FirecrackerSandboxBackend({ ... });
    await host.register(backend); // host calls initialize()
    sandbox.setBackend(backend);
    // host.destroyAll() will call backend.destroy() at shutdown
    ```
    [Source 2]

## Extension Points

The entire Plugin System serves as the primary extension point for the YAAF framework. To add new functionality or support for a new external provider, a developer typically performs the following steps:

1.  Identify the relevant adapter interface (e.g., `LLMAdapter`, `MemoryAdapter`).
2.  Create a new class that implements this interface.
3.  Inherit from `PluginBase` to gain default implementations for common plugin methods [Source 6].
4.  Implement the methods specific to the chosen adapter interface.
5.  The new plugin can then be instantiated and provided to the framework, either directly or via the `PluginHost` [Source 2, Source 4].

## Sources

[Source 1]: src/index.ts
[Source 2]: src/[Integrations](./integrations.md)/sandbox.firecracker.ts
[Source 3]: src/knowledge/store/store.ts
[Source 4]: src/knowledge/store/tfidfSearch.ts
[Source 5]: src/models/base.ts
[Source 6]: src/plugin/base.ts