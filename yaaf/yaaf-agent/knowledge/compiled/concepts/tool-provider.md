---
title: Tool Provider
entity_type: concept
summary: A capability pattern that allows plugins or subsystems to expose executable tools to LLM agents.
related_subsystems:
  - PluginHost
  - AgentFS
stub: false
compiled_at: 2026-04-16T14:21:14.691Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/agentfs.ts
confidence: 0.9
---

## What It Is
The **Tool Provider** is a capability pattern in YAAF that enables plugins and subsystems to register, manage, and expose executable tools to LLM agents. It serves as a standardized interface for tool discovery and execution, allowing the framework to bridge the gap between an agent's reasoning and the execution of specific logic or external system interactions.

By implementing the Tool Provider pattern, a component declares that it can host a registry of tools and handle requests to execute them. This is essential for building complex agents that need to interact with filesystems, APIs, or other specialized environments.

## How It Works in YAAF
In YAAF, the Tool Provider pattern is typically realized through an interface implemented by plugins. A primary example is the `AgentFSPlugin`, which implements `ToolProvider` alongside other interfaces like `FileSystemAdapter` and `ContextProvider`.

### Tool Registration and Execution
A Tool Provider maintains a registry where tools can be "mounted" or registered. These tools are defined using the `Tool` type, often constructed via the `buildTool` utility. When an agent or the framework needs to perform an action, it calls the provider's execution method.

The execution flow generally involves:
1.  **Mounting**: Tools are added to the provider's registry (e.g., via a `mountTools` method).
2.  **Invocation**: The provider's execution method (e.g., `executeTool`) is called with a tool identifier, arguments, and a `ToolContext`.
3.  **Result**: The tool execution returns a `ToolResult`, which contains the output or error state of the operation.

### Integration with AgentFS
When implemented within the `AgentFSPlugin`, the Tool Provider pattern allows the filesystem to act as a virtual registry for tools. Tools can be addressed via paths (e.g., `/tools/grep`), and the provider exposes standard filesystem operations as tools themselves, such as `fs_read`, `fs_write`, `fs_list`, and `fs_tree`.

## Configuration
Developers interact with Tool Providers by registering them with a `PluginHost` and then using the provider's API to manage tools.

```typescript
const host = new PluginHost();
await host.register(new AgentFSPlugin());

// Access the plugin as a ToolProvider
const afs = host.getPlugin<AgentFSPlugin>('agentfs')!;

// Register tools with the provider
afs.mountTools([grepTool, bashTool]);

// Execute a tool through the provider
const result = await afs.executeTool(
  '/tools/grep', 
  { pattern: 'TODO' }, 
  ctx
);
```

### Data Structures
The Tool Provider pattern relies on several core types:
*   **Tool**: The definition of the executable logic, including its schema and implementation.
*   **ToolContext**: Metadata and state passed to the tool during execution.
*   **ToolResult**: The standardized output format returned after execution.

## Sources
* `src/integrations/agentfs.ts`