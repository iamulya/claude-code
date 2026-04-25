---
summary: An extensible component that adds capabilities or integrates external services into YAAF.
title: Plugin
entity_type: concept
related_subsystems:
 - Plugin System
see_also:
 - "[Plugin System](../subsystems/plugin-system.md)"
 - "[PluginHost](../apis/plugin-host.md)"
 - "[PluginBase](../apis/plugin-base.md)"
 - "PluginCapability"
 - "[Adapter Interfaces](./adapter-interfaces.md)"
 - "[Honcho Plugin](../plugins/honcho-plugin.md)"
 - "[AgentFS Plugin](../plugins/agent-fs-plugin.md)"
search_terms:
 - YAAF plugins
 - how to extend YAAF
 - adding new features to agent
 - YAAF integrations
 - plugin architecture
 - custom agent capabilities
 - what is a plugin in YAAF
 - plugin vs adapter
 - extensibility model
 - third-party integrations
 - YAAF plugin system
 - registering a plugin
 - swappable components
stub: false
compiled_at: 2026-04-25T00:23:10.368Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/groundingPlugin.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/linter.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/gemini.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/plugin/base.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/costTracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/notifier.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A Plugin in YAAF is a modular, self-contained component that extends the framework's functionality. Plugins are the primary mechanism for adding new capabilities, integrating with external services, or providing alternative implementations for core features [Source 7]. They allow developers to customize and enhance an agent's behavior without modifying the framework's core code.

Plugins solve the problem of extensibility and customization. They enable YAAF to be provider-agnostic by abstracting service-specific logic into swappable components. For example, YAAF includes default, in-process plugins like the [TfIdfSearchPlugin](../plugins/tf-idf-search-plugin.md) and [VectorMemoryPlugin](../plugins/vector-memory-plugin.md) for basic functionality, which can be replaced by more robust, production-grade plugins for services like ChromaDB or Qdrant without altering the agent's logic [Source 6, Source 7].

Plugins can provide a wide range of functionalities, including:
*   Connecting to different [LLM](./llm.md) providers (e.g., `GeminiChatModel`) [Source 9].
*   Adding new memory backends (e.g., [Honcho Plugin](../plugins/honcho-plugin.md)) [Source 2].
*   Providing virtual filesystems and tools (e.g., [AgentFS Plugin](../plugins/agent-fs-plugin.md)) [Source 1].
*   Implementing secure code execution environments (e.g., [FirecrackerSandboxBackend](../plugins/firecracker-sandbox-backend.md)) [Source 3].
*   Defining custom linting rules for the Knowledge Base [Source 5].
*   Integrating with notification systems [Source 13].

## How It Works in YAAF

The YAAF [Plugin System](../subsystems/plugin-system.md) is centered around the [PluginHost](../apis/plugin-host.md) class, which acts as a central registry and lifecycle manager for all active plugins.

1.  **Base Class and Capabilities**: All plugins must extend the abstract [PluginBase](../apis/plugin-base.md) class. This base class provides common properties like `name`, `version`, and a list of `capabilities` it implements [Source 11]. A capability is a standardized interface, such as `memory`, `llm`, or `vectorstore`, that the framework understands [Source 11]. A single plugin can implement multiple capabilities; for example, the [AgentFS Plugin](../plugins/agent-fs-plugin.md) provides `FileSystemAdapter`, `ToolProvider`, and [ContextProvider](./context-provider.md) capabilities [Source 1].

2.  **Registration**: Plugins are instantiated and then registered with an instance of [PluginHost](../apis/plugin-host.md). The host manages their lifecycle, including initialization and disposal [Source 3].

3.  **Discovery and Decoupling**: Other parts of the framework and the agent's application logic interact with plugins through the [PluginHost](../apis/plugin-host.md). To get a feature implementation, a consumer calls `host.getAdapter<T>('capabilityName')`. This returns the registered plugin that provides the requested capability, conforming to a standard [adapter interface](./adapter-interfaces.md). This decouples the agent's code from the specific plugin implementation [Source 1, Source 2]. For instance, the core model resolver checks the [PluginHost](../apis/plugin-host.md) for a registered [BaseLLMAdapter](../apis/base-llm-adapter.md) before falling back to environment variables [Source 10]. Similarly, utilities like `CostTracker` can query the host to discover pricing information from all registered LLM plugins [Source 12].

4.  **Dual Nature**: Many plugins exhibit a "dual nature." They can be used as standalone classes or be managed by the [PluginHost](../apis/plugin-host.md). Registering a plugin with the host is often preferred as it provides automatic lifecycle management (calling `initialize()` and `dispose()` at the appropriate times) and integrates the plugin into framework-wide features like health checks [Source 3].

5.  **Direct Access**: In addition to accessing plugins through their standardized adapter interfaces, developers can get a direct reference to a specific plugin instance using `host.getPlugin<T>('pluginName')`. This is useful for accessing plugin-specific methods and features that are not part of a standard capability interface [Source 1, Source 2].

## Configuration

Plugins are typically configured during instantiation and then registered with the [PluginHost](../apis/plugin-host.md). The host then makes their capabilities available to the rest of the application.

The following example demonstrates how to register and use multiple plugins:

```typescript
import { PluginHost } from 'yaaf';
import { AgentFSPlugin } from 'yaaf/integrations';
import { HonchoPlugin } from 'yaaf/integrations';
import type { MemoryAdapter, FileSystemAdapter } from 'yaaf/plugins';

// 1. Create a PluginHost instance.
const host = new PluginHost();

// 2. Instantiate plugins with their specific configurations.
const honchoPlugin = new HonchoPlugin({
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-app',
});

const agentFsPlugin = new AgentFSPlugin({
  maxTotalSize: 100 * 1024 * 1024, // 100MB
});

// 3. Register the plugins with the host.
await host.register(honchoPlugin);
await host.register(agentFsPlugin);

// 4. Access capabilities through standardized adapter interfaces.
// The agent code doesn't need to know which plugin provides the memory.
const memory = host.getAdapter<MemoryAdapter>('memory')!;
await memory.save({ name: 'User prefers concise answers' });

const fs = host.getAdapter<FileSystemAdapter>('filesystem')!;
await fs.write('/workspace/plan.md', '# Step 1: ...');

// 5. Access a specific plugin instance for its unique APIs.
const afs = host.getPlugin<AgentFSPlugin>('agentfs')!;
afs.mountTools([customTool]); // mountTools is specific to AgentFSPlugin
```

## See Also

*   [Plugin System](../subsystems/plugin-system.md): The core subsystem that manages plugins.
*   [PluginHost](../apis/plugin-host.md): The API for registering and interacting with plugins.
*   [PluginBase](../apis/plugin-base.md): The abstract base class all plugins must extend.
*   PluginCapability: The enumeration of standard capabilities a plugin can provide.
*   [Adapter Interfaces](./adapter-interfaces.md): The concept of standardized interfaces that plugins implement.
*   [Honcho Plugin](../plugins/honcho-plugin.md): An example of a plugin integrating an external memory service.
*   [AgentFS Plugin](../plugins/agent-fs-plugin.md): An example of a plugin providing filesystem and tool capabilities.
*   [FirecrackerSandboxBackend](../plugins/firecracker-sandbox-backend.md): An example of a plugin providing a secure execution environment.

## Sources
[Source 1]: src/integrations/agentfs.ts
[Source 2]: src/integrations/honcho.ts
[Source 3]: src/integrations/sandbox.firecracker.ts
[Source 4]: src/knowledge/compiler/groundingPlugin.ts
[Source 5]: src/knowledge/compiler/linter/linter.ts
[Source 6]: src/knowledge/store/tfidfSearch.ts
[Source 7]: src/memory/vectorMemory.ts
[Source 8]: src/models/base.ts
[Source 9]: src/models/gemini.ts
[Source 10]: src/models/resolver.ts
[Source 11]: src/plugin/base.ts
[Source 12]: src/utils/costTracker.ts
[Source 13]: src/utils/notifier.ts