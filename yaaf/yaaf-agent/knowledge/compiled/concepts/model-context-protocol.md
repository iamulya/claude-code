---
title: Model Context Protocol (MCP)
entity_type: concept
summary: An industry-standard protocol enabling seamless integration between LLM agents and external tool/data ecosystems.
stub: false
compiled_at: 2026-04-16T14:21:48.828Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcp.ts
confidence: 0.95
---

---
title: "Model Context Protocol (MCP)"
entity_type: "concept"
summary: "An industry-standard protocol enabling seamless integration between LLM agents and external tool/data ecosystems."
related_subsystems:
  - "PluginHost"
  - "ToolProvider"

## What It Is
The Model Context Protocol (MCP) is an industry-standard communication protocol designed to connect Large Language Model (LLM) agents with external data sources and tools. In the context of YAAF, MCP is implemented as a first-class integration that allows agents to access a broad ecosystem of community-maintained servers, including those for filesystems, GitHub, Slack, Linear, and various databases.

By adopting MCP, YAAF avoids the need for manual, one-off integrations for every external service. Instead, it provides a unified interface where any MCP-compliant server can be plugged into the framework, instantly exposing its capabilities as native YAAF tools.

## How It Works in YAAF
MCP integration in YAAF is primarily handled through the `McpPlugin` class. This plugin implements the `McpAdapter` interface, which in turn extends the `ToolProvider` interface. This hierarchy ensures that MCP-sourced tools are treated with the same priority and lifecycle management as native framework tools.

### Transport Mechanisms
YAAF supports two primary transport types for connecting to MCP servers:
1.  **stdio**: Used for local processes. The framework spawns a child process (e.g., via `npx`, `node`, or `python`) and communicates over standard input/output.
2.  **SSE (Server-Sent Events)**: Used for remote servers. The framework connects to a persistent HTTP endpoint to receive updates and send requests.

### Lifecycle and Management
When registered with the `PluginHost`, the `McpPlugin` participates in the standard YAAF lifecycle:
*   **Discovery**: Tools from all connected MCP servers are automatically aggregated and made available via `PluginHost.getAllTools()`.
*   **Introspection**: Developers can use `PluginHost.getMcpServers()` to monitor connection status and tool counts for each server.
*   **Health Monitoring**: The `PluginHost.healthCheckAll()` method includes connectivity checks for all active MCP transports.
*   **Cleanup**: Upon framework shutdown, `PluginHost.destroyAll()` ensures that all `stdio` processes are terminated and `SSE` connections are closed cleanly.

### Tool Naming and Collisions
To prevent naming conflicts between different MCP servers or between MCP tools and native tools, the framework provides a `prefixNames` configuration. When enabled, tool names are namespaced (e.g., `filesystem_read_file` instead of `read_file`). By default, YAAF only applies prefixes when a collision is detected.

## Configuration
To use MCP in YAAF, the `@modelcontextprotocol/sdk` must be installed as a peer dependency. The `McpPlugin` is configured with an array of server definitions and optional settings for timeouts and naming.

```typescript
import { PluginHost } from 'yaaf';
import { McpPlugin } from 'yaaf/integrations/mcp';

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
  timeoutMs: 30000,
  prefixNames: true
}));

// Tools from both servers are now available
const tools = host.getAllTools();
```

### Configuration Fields
*   **servers**: An array of `McpStdioServer` or `McpSseServer` configurations.
*   **name**: An optional explicit name for the plugin instance to avoid collisions in the `PluginHost`.
*   **timeoutMs**: The maximum time allowed for a tool call to return (default: 30,000ms).
*   **prefixNames**: A boolean indicating whether to always prefix tool names with their source server name.

## Sources
* `src/integrations/mcp.ts`