---
export_name: McpStdioServer
source_file: src/integrations/mcp.ts
category: type
title: McpStdioServer
entity_type: api
summary: Defines the configuration for connecting to a Model Context Protocol (MCP) server that communicates over standard input/output (stdio).
search_terms:
 - MCP stdio connection
 - Model Context Protocol server config
 - connect to local tool server
 - stdio transport for agents
 - McpPlugin configuration
 - how to run MCP server locally
 - YAAF tool server process
 - command line tool integration
 - filesystem server setup
 - npx tool server
 - environment variables for MCP server
 - local agent tools
stub: false
compiled_at: 2026-04-25T00:09:22.215Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/mcp.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`McpStdioServer` is a TypeScript type that specifies the configuration for launching and communicating with a local Model Context Protocol (MCP) server process [Source 1]. This connection method uses the server's standard input and output (stdio) streams for communication, making it suitable for integrating tools that run as command-line applications [Source 1].

This configuration type is used within the `servers` array of the `McpPluginConfig` to define one of the MCP servers the McpPlugin should manage. It allows a YAAF agent to access tools from any MCP-compatible server that can be executed as a local process [Source 1].

## Signature

The `McpStdioServer` type is an object with the following properties [Source 1]:

```typescript
export type McpStdioServer = {
  /** A unique name to identify this server connection. */
  name: string;

  /** The transport type, which must be "stdio". */
  type: "stdio";

  /** The command to execute to start the server process (e.g., 'npx', 'node', 'python'). */
  command: string;

  /** An array of string arguments to pass to the command. */
  args?: string[];

  /** A record of environment variables to set for the server process. */
  env?: Record<string, string>;
};
```

## Examples

The following example demonstrates how to configure an `McpStdioServer` within the `McpPlugin` to connect to a local filesystem tool server [Source 1].

```typescript
import { McpPlugin } from 'yaaf';
import { PluginHost } from 'yaaf';

// This configuration launches the MCP filesystem server using npx.
const host = new PluginHost();
await host.register(new McpPlugin({
  servers: [
    {
      name: 'filesystem',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
    },
    // ... other server configurations
  ],
}));

// Tools from the 'filesystem' server are now available through the host.
const allTools = host.getAllTools();
```

## See Also

- `McpPlugin`: The main plugin for integrating MCP servers.
- `McpPluginConfig`: The overall configuration for the `McpPlugin`.
- `McpSseServer`: An alternative configuration for connecting to MCP servers over Server-Sent Events (SSE).
- `McpServerConfig`: A union type that can be either `McpStdioServer` or `McpSseServer`.

## Sources

[Source 1]: src/integrations/mcp.ts