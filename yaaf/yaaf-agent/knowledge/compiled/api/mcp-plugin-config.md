---
title: McpPluginConfig
entity_type: api
summary: Configuration interface for the McpPlugin, defining server connections and operational parameters.
export_name: McpPluginConfig
source_file: src/integrations/mcp.ts
category: type
stub: false
compiled_at: 2026-04-16T14:21:50.307Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcp.ts
confidence: 1
---

## Overview
`McpPluginConfig` is the configuration interface used to initialize an `McpPlugin`. It defines the connection parameters for one or more Model Context Protocol (MCP) servers, allowing the plugin to aggregate tools from various sources—such as local filesystem utilities or remote API integrations—and expose them to a YAAF agent.

This configuration supports both `stdio` (local process) and `sse` (Server-Sent Events) transport types.

## Signature / Constructor

```typescript
export type McpPluginConfig = {
  servers: McpServerConfig[]
  name?: string
  timeoutMs?: number
  prefixNames?: boolean
}
```

### Related Types

#### McpServerConfig
A union type representing either a local or remote MCP server connection.
```typescript
export type McpServerConfig = McpStdioServer | McpSseServer
```

#### McpStdioServer
Configuration for servers running as local child processes.
*   `name`: (string) Unique identifier for the server.
*   `type`: `'stdio'`
*   `command`: (string) The executable to run (e.g., `'npx'`, `'python'`).
*   `args`: (string[]) Optional arguments for the command.
*   `env`: (Record<string, string>) Optional environment variables for the process.

#### McpSseServer
Configuration for servers accessible via HTTP SSE.
*   `name`: (string) Unique identifier for the server.
*   `type`: `'sse'`
*   `url`: (string) The endpoint URL of the MCP server.
*   `headers`: (Record<string, string>) Optional HTTP headers, such as authentication tokens.

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `servers` | `McpServerConfig[]` | **Required.** An array of server definitions the plugin should connect to. |
| `name` | `string` | **Optional.** An explicit name for the plugin instance. If omitted, the name is derived from the configured servers. This is useful for avoiding collisions when registering multiple MCP plugins in a single host. |
| `timeoutMs` | `number` | **Optional.** The timeout for tool execution in milliseconds. Defaults to `30000` (30 seconds). |
| `prefixNames` | `boolean` | **Optional.** When `true`, tool names are prefixed with the server name (e.g., `filesystem_read_file`). Defaults to `false`, where prefixing only occurs if a name collision is detected. |

## Examples

### Basic Configuration with Multiple Transports
This example demonstrates configuring the plugin to connect to a local filesystem server via `stdio` and a remote GitHub server via `sse`.

```typescript
import { McpPlugin, PluginHost } from 'yaaf';

const config: McpPluginConfig = {
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
      headers: { 
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}` 
      }
    }
  ],
  prefixNames: true,
  timeoutMs: 60000
};

const host = new PluginHost();
await host.register(new McpPlugin(config));
```

### Standalone Usage
The configuration can also be passed directly to the `McpPlugin` constructor when used outside of a `PluginHost`.

```typescript
const plugin = new McpPlugin({
  servers: [
    {
      name: 'my-local-tool',
      type: 'stdio',
      command: 'node',
      args: ['./dist/server.js']
    }
  ]
});

await plugin.initialize();
const tools = plugin.getTools();
```