---
summary: An interface for plugins to register and expose tools to the agent's tool registry.
title: ToolProvider
entity_type: concept
related_subsystems:
 - plugins
 - tools
see_also:
 - concept:AgentFS Plugin
 - concept:Tool Use
 - concept:Agent Skills
search_terms:
 - how to add tools to agent
 - plugin tool registration
 - making tools available to LLM
 - tool provider interface
 - exposing plugin functions as tools
 - agent tool registry
 - custom agent tools
 - YAAF tool integration
 - implementing ToolProvider
 - what is a tool provider
 - tool discovery
stub: false
compiled_at: 2026-04-25T00:25:53.241Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
compiled_from_quality: unknown
confidence: 0.98
---

## What It Is

`ToolProvider` is an interface within the YAAF plugin architecture that establishes a standardized contract for plugins to expose their functionalities as tools. By implementing this interface, a plugin can register one or more tools with the agent's central tool registry, making them discoverable and executable by the agent during its reasoning process. This mechanism allows for the modular extension of an agent's capabilities, where complex logic is encapsulated within a plugin and exposed as a simple, callable tool.

## How It Works in YAAF

A plugin class that intends to offer tools must explicitly implement the `ToolProvider` interface. During the plugin registration process, the `PluginHost` identifies plugins that implement this interface and retrieves the list of tools they provide. These tools are then integrated into the agent's environment, becoming available for [tool use](./tool-use.md) and [Tool Execution](./tool-execution.md).

A concrete example is the [AgentFS Plugin](../plugins/agent-fs-plugin.md), which implements `ToolProvider` to expose a set of virtual filesystem tools to the agent, such as `fs_read`, `fs_write`, `fs_list`, and `fs_tree` [Source 1]. This allows the agent to interact with a virtual filesystem through the standard tool-calling mechanism, without needing to know the internal implementation details of the `AgentFSPlugin`.

The class signature for a plugin implementing this interface, along with others, would look like this [Source 1]:

```typescript
export class AgentFSPlugin
  extends PluginBase
  implements FileSystemAdapter, ToolProvider, ContextProvider
{ /* ... */ }
```

By adhering to the `ToolProvider` contract, plugins ensure their tools are compatible with the core agent framework, facilitating a robust and extensible ecosystem of [Agent Skills](./agent-skills.md).

## See Also

- [AgentFS Plugin](../plugins/agent-fs-plugin.md): A concrete example of a plugin that implements the `ToolProvider` interface.
- [Tool Use](./tool-use.md): The core concept of how agents leverage the tools provided by this interface.
- [Agent Skills](./agent-skills.md): The high-level concept representing the capabilities that tools provide to an agent.

## Sources

[Source 1]: src/integrations/agentfs.ts