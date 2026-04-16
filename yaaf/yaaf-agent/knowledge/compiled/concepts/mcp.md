---
title: Model Context Protocol (MCP)
entity_type: concept
summary: An open standard for connecting AI models to data sources and tools, enabling interoperability between different AI ecosystems.
stub: false
compiled_at: 2026-04-16T14:10:41.337Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
confidence: 0.9
---

---
title: "Model Context Protocol (MCP)"
entity_type: "concept"
summary: "An open standard for connecting AI models to data sources and tools, enabling interoperability between different AI ecosystems."
related_subsystems:
  - "PluginHost"
  - "McpPlugin"

## What It Is
The Model Context Protocol (MCP) is an open standard designed to facilitate the connection between AI models and various data sources or tools. It addresses the problem of fragmentation in AI integrations by providing a universal interface, allowing developers to swap or compose capabilities from different ecosystems without writing custom integration code for every specific service.

In YAAF, MCP is utilized to bridge external services—such as GitHub, local filesystems, or proprietary APIs—directly into the agent's toolset. By adhering to this protocol, YAAF agents can leverage any MCP-compliant server as a source of executable tools.

## How It Works in YAAF
YAAF implements MCP support through the `McpPlugin`, which functions as a `ToolProvider` within the framework's plugin architecture. The plugin acts as a client that connects to one or more MCP servers.

The integration process follows these steps:
1.  **Transport Establishment**: The plugin connects to servers using either `stdio` (for local processes) or `sse` (Server-Sent Events for remote web services).
2.  **Tool Discovery**: Upon calling the `connect()` method, the plugin queries the registered MCP servers to discover available tools.
3.  **Tool Mapping**: The discovered MCP tools are converted into native YAAF tools.
4.  **Agent Integration**: These tools are then gathered by the `PluginHost` or passed directly to an `Agent` instance, allowing the LLM to invoke them during a session.

The `McpPlugin` can manage multiple server connections simultaneously, aggregating tools from various sources into a single array for the agent.

## Configuration
Developers can configure the `McpPlugin` by defining an array of servers and their respective connection parameters. YAAF also provides shorthand factories for common configurations.

### Full Configuration
The `McpPlugin` constructor accepts a configuration object defining transports, commands, and environment variables.

```typescript
import { McpPlugin } from 'yaaf';

const plugin = new McpPlugin({
  servers: [
    {
      name:      'filesystem',
      transport: 'stdio',
      command:   'npx',
      args:      ['@modelcontextprotocol/server-filesystem', '.'],
    },
    {
      name:      'github',
      transport: 'stdio',
      command:   'npx',
      args:      ['@modelcontextprotocol/server-github'],
      env:       { GITHUB_TOKEN: process.env.GITHUB_TOKEN! },
    },
    {
      name:      'myapi',
      transport: 'sse',
      url:       'http://localhost:3001/sse',
    },
  ],
  prefixNames: false,  // If true, adds "serverName__" prefix to tool names to avoid collisions
  timeoutMs:   10_000,
});

const mcpTools = await plugin.connect();
```

### Shorthand Factories
For standard use cases, YAAF provides helper functions to quickly instantiate MCP connections:

```typescript
import { filesystemMcp, sseMcp } from 'yaaf';

// Connect to a local filesystem MCP server
const fsMcp = filesystemMcp([process.cwd()]);

// Connect to a remote MCP server via SSE
const remoteMcp = sseMcp({ url: 'https://my-mcp-server.com/sse', name: 'remote' });
```

## Sources
- Plugin & Adapter Architecture (docs/plugins.md)