---
title: McpPlugin
entity_type: plugin
summary: A YAAF plugin that connects to Model Context Protocol (MCP) servers to expose their tools as native YAAF tools.
capabilities:
  - tool-provider
  - mcp
stub: false
compiled_at: 2026-04-16T14:10:38.163Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcp.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcpOAuth.ts
confidence: 1
---

---
title: "McpPlugin"
entity_type: "plugin"
summary: "A YAAF plugin that connects to Model Context Protocol (MCP) servers to expose their tools as native YAAF tools."
capabilities: ["tool-provider", "mcp"]
built_in: true

## Overview
The `McpPlugin` is a specialized integration that connects YAAF agents to the Model Context Protocol (MCP) ecosystem. It acts as a bridge, consuming tools from external MCP servers—using either `stdio` or `SSE` (Server-Sent Events) transports—and exposing them as native YAAF tools. 

By implementing the `McpAdapter` and `ToolProvider` interfaces, the plugin allows agents to interact with a wide range of community and production servers, including those for filesystem access, GitHub, Slack, and databases.

## Installation
The `McpPlugin` requires the Model Context Protocol SDK as a peer dependency. This must be installed alongside `yaaf` if MCP functionality is required.

```bash
npm install @modelcontextprotocol/sdk
```

## Configuration
The plugin is configured via the `McpPluginConfig` object, which defines the servers to connect to and global settings for tool behavior.

### Configuration Types
- **McpStdioServer**: For local processes (e.g., Node.js or Python scripts).
- **McpSseServer**: For remote servers over HTTP.
- **McpPluginConfig**:
    - `servers`: An array of server configurations.
    - `name`: Optional explicit plugin name.
    - `timeoutMs`: Timeout for tool calls (default: 30,000ms).
    - `prefixNames`: If true, prefixes tool names with the server name (e.g., `filesystem_read_file`). Defaults to false, only prefixing on collision.

### Example Implementation
```typescript
import { McpPlugin, PluginHost } from 'yaaf';

const host = new PluginHost();

await host.register(new McpPlugin({
  servers: [
    {
      name: 'filesystem',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/workspace'],
    },
    {
      name: 'github',
      type: 'sse',
      url: 'https://mcp.github.com',
      headers: { 
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}` 
      },
    },
  ],
  prefixNames: true,
  timeoutMs: 15_000,
}));

// Tools from both servers are now available
const tools = host.getAllTools();
```

### Shorthand Factories
YAAF provides shorthand factories for common MCP configurations:
- `filesystemMcp(paths: string[])`: Quickly creates a filesystem MCP configuration.
- `sseMcp(config: { url: string, name: string })`: Quickly creates an SSE MCP configuration.

## Capabilities

### tool-provider
The plugin implements the `ToolProvider` interface. Upon initialization, it connects to all configured servers, retrieves their tool definitions, and converts them into native YAAF `Tool` objects. These tools can be retrieved via `plugin.getTools()` or automatically through a `PluginHost` using `host.getAllTools()`.

### mcp
As an `McpAdapter`, the plugin provides MCP-specific introspection and management features:
- **Server Status**: Through the `PluginHost`, users can call `getMcpServers()` to retrieve connection status and tool counts for all registered MCP servers.
- **Tool Isolation**: `getMcpTools()` allows for retrieving only the tools sourced from MCP servers, excluding other native plugin tools.
- **Lifecycle Management**: The plugin handles the graceful connection and disconnection of all server transports during the `initialize()` and `destroy()` phases.

### OAuth Authentication
For production MCP servers requiring OAuth 2.0 (such as Google Drive or Slack), YAAF includes an `McpOAuthClient`. This utility supports:
- Authorization Code flow with PKCE.
- Client Credentials flow.
- Automatic token refresh and pluggable token storage (memory or filesystem).
- The `oauthMcpServer` helper function, which generates an authenticated `McpSseServer` configuration ready for use with the `McpPlugin`.

## Limitations
- **Environment Requirements**: Stdio-based servers require the relevant runtimes (e.g., Node.js, Python) to be available in the system path.
- **Network Latency**: SSE-based tools are subject to network conditions and the `timeoutMs` configuration.
- **Peer Dependency**: The plugin will fail to initialize if `@modelcontextprotocol/sdk` is not present in the project dependencies.