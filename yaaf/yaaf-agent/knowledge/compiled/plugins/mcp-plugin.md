---
tags:
 - integrations
 - tools
 - mcp
title: McpPlugin
entity_type: plugin
summary: A plugin that connects to Model Context Protocol (MCP) servers to expose their tools as native YAAF tools.
capabilities:
 - tool_provider
search_terms:
 - Model Context Protocol
 - MCP integration
 - how to use external tools
 - connect to MCP server
 - YAAF tool provider
 - stdio tool server
 - SSE tool server
 - filesystem tools
 - GitHub tools
 - Slack tools
 - Linear tools
 - database tools
 - McpAdapter
 - tool server connection
stub: false
compiled_at: 2026-04-25T00:27:11.615Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/mcp.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `McpPlugin` provides an integration with the Model Context Protocol (MCP), allowing a YAAF [Agent](../apis/agent.md) to connect to MCP-compatible tool servers and use their capabilities as native YAAF [Tools](../subsystems/tools.md) [Source 1]. It supports connecting to servers via standard I/O (`stdio`) or Server-Sent Events (`sse`) transports. This enables access to a wide ecosystem of existing tools for interacting with services like filesystems, GitHub, Slack, Linear, and databases [Source 1].

The plugin implements the `McpAdapter` interface, which extends the [ToolProvider](../concepts/tool-provider.md) PluginCapability. When registered with a `PluginHost`, its discovered tools are automatically made available through methods like `getAllTools()`. The `PluginHost` also manages the lifecycle of the MCP connections, including health checks and clean disconnection [Source 1].

## Installation

The `McpPlugin` has a peer dependency on the `@modelcontextprotocol/sdk` package, which must be installed separately [Source 1].

```bash
npm install @modelcontextprotocol/sdk
```

The plugin can then be imported from the YAAF package.

```typescript
import { McpPlugin } from 'yaaf'; // or appropriate package path
```

## Configuration

The `McpPlugin` is configured via the `McpPluginConfig` object passed to its constructor. This object defines the list of servers to connect to and other operational parameters [Source 1].

### `McpPluginConfig`

| Parameter | Type | Description | Default |
| --- | --- | --- | --- |
| `servers` | `McpServerConfig[]` | An array of MCP server configurations to connect to. | (required) |
| `name` | `string` | An explicit name for the plugin. If omitted, it's derived from server names. | `undefined` |
| `timeoutMs` | `number` | Default timeout for tool calls in milliseconds. | `30_000` |
| `prefixNames` | `boolean` | If true, prefixes all tool names with the server name. If false, only prefixes on name collision. | `false` |
| `connectTimeoutMs` | `number` | Timeout for initial server connection and tool discovery in milliseconds. | `10_000` |
| `maxConnectFailures` | `number` | Number of consecutive connection failures before opening a server's circuit breaker. | `3` |
| `stateFile` | `string` | Path to a JSON file for persisting circuit breaker state across restarts. | `undefined` |
| `circuitResetMs` | `number` | How long a persisted open circuit remains open across restarts, in milliseconds. | `300_000` (5 minutes) |
| `reconnect` | `McpReconnectConfig` | Default reconnect configuration for all SSE servers. | See `McpReconnectConfig` |

### `McpServerConfig`

This is a union of `McpStdioServer` and `McpSseServer` [Source 1].

#### `McpStdioServer`

For servers that communicate over standard I/O.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | A unique name for the server. |
| `type` | `"stdio"` | The transport type. |
| `command` | `string` | The command to execute (e.g., 'npx', 'node'). |
| `args` | `string[]` | Arguments for the command. |
| `env` | `Record<string, string>` | Environment variables for the child process. |

#### `McpSseServer`

For servers that communicate over Server-Sent Events (SSE).

| Parameter | Type | Description | Default |
| --- | --- | --- | --- |
| `name` | `string` | A unique name for the server. | |
| `type` | `"sse"` | The transport type. | |
| `url` | `string` | The URL of the MCP SSE server. | |
| `headers` | `Record<string, string>` | Additional HTTP headers for the connection. | `undefined` |
| `auth` | `{ type: "bearer"; token: string; }` | Structured bearer token authentication. Merged into headers. | `undefined` |
| `requireAuthForRemote` | `boolean` | Warn if a non-local SSE URL is used without authentication. | `true` |
| `reconnect` | `McpReconnectConfig` | Per-server override for SSE reconnect settings. | Inherits from plugin config |
| `toolTimeoutMs` | `number` | Per-server override for the tool call timeout. | Inherits from plugin config |

### `McpReconnectConfig`

Configuration for [Exponential Backoff](../concepts/exponential-backoff.md) retry logic when an SSE connection drops [Source 1].

| Parameter | Type | Description | Default |
| --- | --- | --- | --- |
| `enabled` | `boolean` | Whether to automatically reconnect. | `true` |
| `initialDelayMs` | `number` | Base delay for the first reconnect attempt in milliseconds. | `1_000` |
| `maxDelayMs` | `number` | Maximum delay between reconnect attempts in milliseconds. | `30_000` |
| `maxAttempts` | `number` | Maximum number of reconnect attempts before opening the circuit. | `5` |

### Example

The following example demonstrates configuring the `McpPlugin` with both a local `stdio` server for filesystem access and a remote `sse` server for GitHub access, managed by a `PluginHost` [Source 1].

```typescript
import { PluginHost } from 'yaaf';
import { McpPlugin } from 'yaaf'; // or appropriate package path

// Using with PluginHost (recommended — full lifecycle management)
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

// MCP tools appear automatically in getAllTools()
const tools = host.getAllTools(); // → [...nativeTools, ...mcpTools]

// MCP-specific introspection
const servers = host.getMcpServers();
// → [{ name: 'filesystem', transport: 'stdio', connected: true, toolCount: 12 }, ...]
```

## Capabilities

### ToolProvider

`McpPlugin` implements the `McpAdapter` interface, which extends the [ToolProvider](../concepts/tool-provider.md) capability [Source 1]. This allows it to:
- Connect to one or more MCP servers during its `initialize()` phase.
- Perform [Discovery](../concepts/discovery.md) of the tools offered by each server.
- Expose these discovered tools as a standard `Tool[]` array via its `getTools()` method.

When used with a `PluginHost`, this integration is seamless. The `PluginHost` automatically calls `getTools()` on the plugin and includes the returned MCP tools in the collection provided by `getAllTools()`. The `PluginHost` also provides specialized methods for inspecting MCP integrations, such as `getMcpTools()` to get only MCP-sourced tools and `getMcpServers()` to check the connection status of each configured server [Source 1].

## Sources

[Source 1] src/integrations/mcp.ts