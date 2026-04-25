---
export_name: McpAdapter
source_file: src/plugin/types.js
category: interface
title: McpAdapter
entity_type: api
summary: An interface for YAAF plugins that connect to Model Context Protocol (MCP) tool servers.
search_terms:
 - Model Context Protocol integration
 - connect to MCP server
 - use external tools
 - MCP plugin
 - stdio tool server
 - SSE tool server
 - how to use filesystem tools
 - YAAF tool provider
 - McpPlugin interface
 - external tool ecosystem
 - remote tool execution
 - what is McpAdapter
 - tool server adapter
stub: false
compiled_at: 2026-04-25T00:09:02.839Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/mcp.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`McpAdapter` is a specialized plugin interface that extends the base [ToolProvider](../concepts/tool-provider.md) interface. It serves as the contract for plugins that connect YAAF to external tool servers compatible with the Model Context Protocol (MCP) [Source 1].

By implementing this interface, a plugin can expose tools from the entire MCP ecosystem—such as filesystem operations, GitHub integration, and database access—as native YAAF tools. This makes them seamlessly available to any [Agent](./agent.md) within the framework [Source 1].

The primary implementation of this interface is the `McpPlugin` class. When an `McpAdapter` is registered with a `PluginHost`, its tools are automatically included in the host's tool collection, and the host can use the adapter's specific methods for introspection and health checks of the underlying MCP server connections [Source 1].

## Signature

`McpAdapter` extends the [ToolProvider](../concepts/tool-provider.md) interface, inheriting its methods like `getTools()`. It adds MCP-specific functionality for managing and inspecting server connections [Source 1].

```typescript
import type { ToolProvider } from './tool-provider';
import type { McpServerInfo } from './types';

/**
 * A specialized ToolProvider for connecting to MCP servers.
 */
export interface McpAdapter extends ToolProvider {
  /**
   * Returns connection status and metadata for all configured MCP servers.
   */
  getMcpServers(): McpServerInfo[];
}
```

## Methods & Properties

An `McpAdapter` implementation has the following methods:

### Inherited from [ToolProvider](../concepts/tool-provider.md)

The `McpAdapter` interface inherits all methods from [ToolProvider](../concepts/tool-provider.md), most notably `getTools()`, which returns the list of tools discovered from the connected MCP servers.

### getMcpServers()

Returns an array of objects containing status and metadata for each configured MCP server.

**Signature**
```typescript
getMcpServers(): McpServerInfo[];
```

**Returns**

An array of `McpServerInfo` objects. Each object has a structure similar to this [Source 1]:

```typescript
type McpServerInfo = {
  /** The unique name of the server. */
  name: string;
  /** The transport type, e.g., 'stdio' or 'sse'. */
  transport: 'stdio' | 'sse';
  /** Whether the plugin is currently connected to the server. */
  connected: boolean;
  /** The number of tools exposed by this server. */
  toolCount: number;
};
```

## Examples

The most common way to use an `McpAdapter` is by instantiating its primary implementation, `McpPlugin`, and registering it with a `PluginHost`. This handles the full lifecycle management of the MCP connections [Source 1].

```typescript
import { PluginHost } from 'yaaf';
import { McpPlugin } from 'yaaf/plugins'; // Assuming McpPlugin is exported here

// Using with PluginHost (recommended)
const host = new PluginHost();
await host.register(new McpPlugin({
  servers: [
    { 
      name: 'filesystem', 
      type: 'stdio',
      command: 'npx', 
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] 
    },
    { 
      name: 'github', 
      type: 'sse',
      url: 'https://mcp.github.com',
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } 
    },
  ],
}));

// MCP tools are now available alongside other tools
const allTools = host.getAllTools();

// Use McpAdapter-specific methods for introspection
const mcpServers = host.getMcpServers();
/*
[
  { name: 'filesystem', transport: 'stdio', connected: true, toolCount: 12 },
  { name: 'github', transport: 'sse', connected: true, toolCount: 25 }
]
*/
```

## See Also

*   [ToolProvider](../concepts/tool-provider.md): The base interface that `McpAdapter` extends.
*   `McpPlugin`: The primary class that implements the `McpAdapter` interface.
*   `PluginHost`: The class responsible for managing plugins, including those that implement `McpAdapter`.

## Sources

[Source 1]: src/integrations/mcp.ts