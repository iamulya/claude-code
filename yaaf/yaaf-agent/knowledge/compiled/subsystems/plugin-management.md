---
summary: The subsystem responsible for providing infrastructure for loading, registering, and executing plugins.
primary_files:
 - src/plugin/types.ts
title: Plugin Management
entity_type: subsystem
exports:
 - PluginHost
 - LinterRuleAdapter
search_terms:
 - extending YAAF functionality
 - how to write a plugin
 - plugin architecture
 - YAAF extension points
 - custom agent behavior
 - add-on system
 - plugin lifecycle
 - registering custom code
 - third-party integrations
 - linter rule plugins
 - plugin host interface
 - framework extensibility
stub: false
compiled_at: 2026-04-25T00:30:00.938Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/linter.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Plugin Management subsystem provides the core infrastructure and type definitions that allow developers to extend the functionality of the YAAF framework. It establishes a standardized way for different parts of the system to discover, load, and interact with custom code modules, known as plugins. This enables features like custom linting rules to be added without modifying the core framework code [Source 1].

## Architecture

The architecture of the Plugin Management subsystem is centered around a set of core interfaces defined in `src/plugin/types.ts` [Source 1]. The key components suggested by the source material are:

*   **[PluginHost](../apis/plugin-host.md)**: This likely represents the central orchestrator or manager for all plugins within the framework. It is responsible for the lifecycle of plugins, including loading and registration.
*   **Plugin Adapters**: The subsystem uses specific adapter interfaces to bridge the gap between the generic plugin system and the concrete extension points in other subsystems. An example of this is the [LinterRuleAdapter](../apis/linter-rule-adapter.md), which defines the contract for plugins that wish to add new rules to the [Knowledge Base Linter](./knowledge-base-linter.md) [Source 1]. This pattern allows any subsystem to define its own unique plugin type.

## Integration Points

Other subsystems integrate with the Plugin Management subsystem to make themselves extensible.

*   **[Knowledge Base Linter](./knowledge-base-linter.md)**: The `KBLinter` class utilizes the Plugin Management subsystem to discover and execute custom linting rules. It interacts with plugins that implement the [LinterRuleAdapter](../apis/linter-rule-adapter.md) interface, allowing developers to add their own static checks to the knowledge base compilation process [Source 1].

## Key APIs

The primary APIs for this subsystem define the contracts for creating and managing plugins.

*   **[PluginHost](../apis/plugin-host.md)**: The core interface for the entity that manages the plugin lifecycle [Source 1].
*   **[LinterRuleAdapter](../apis/linter-rule-adapter.md)**: A specific plugin interface that allows for the creation of custom rules for the [Knowledge Base Linter](./knowledge-base-linter.md) [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/linter/linter.ts