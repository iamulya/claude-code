---
export_name: McpSseServer
source_file: src/integrations/mcp.ts
category: type
title: McpSseServer
entity_type: api
summary: Defines the configuration for connecting to a Model Context Protocol (MCP) server over Server-Sent Events (SSE).
search_terms:
 - MCP SSE connection
 - configure SSE server
 - Model Context Protocol server config
 - YAAF MCP plugin
 - server-sent events integration
 - MCP authentication
 - SSE reconnect settings
 - tool server over HTTP
 - McpPlugin server configuration
 - remote tool provider
 - bearer token auth for MCP
 - exponential backoff for SSE
 - connect to remote MCP server
stub: false
compiled_at: 2026-04-25T00:09:22.157Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/mcp.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`McpSseServer` is a TypeScript type that specifies the configuration for connecting to a Model Context Protocol (MCP) server using the Server-Sent Events (SSE) transport. This is typically used for remote servers accessible via an HTTP URL.

This configuration type is used within the `servers` array of the `McpPluginConfig`. It allows the `McpPlugin` to discover and use tools from remote MCP-compatible servers, providing details such as the server's endpoint, authentication credentials, and connection reliability settings.

## Signature

`McpSseServer` is a type alias for an object with the following properties:

```typescript
export type McpSseServer = {
  name: string;
  type: "sse";
  /** URL of the MCP SSE server */
  url: string;
  /** Additional HTTP headers (e.g. Authorization) */
  headers?: Record<string, string>;
  /**
   * Structured auth for the SSE endpoint.
   * Merged into headers as `Authorization: Bearer <token>` before connecting.
   * Prefer this over manually setting `headers.Authorization`.
   */
  auth?: {
    type: "bearer";
    token: string;
  };
  /**
   * When true (default), warn if the SSE URL is not localhost/127.0.0.1
   * and no auth is configured. Set to false only on trusted internal networks.
   */
  requireAuthForRemote?: boolean;
  /**
   * Per-server SSE reconnect settings.
   * When the SSE connection drops, the plugin will retry with exponential backoff.
   *
   * Default: inherits `McpPluginConfig.reconnect` settings.
   */
  reconnect?: McpReconnectConfig;
  /**
   * Per-server tool call timeout (ms). Overrides the plugin-level `timeoutMs`.
   * Useful when one server is reliably faster or slower than others.
   */
  toolTimeoutMs?: number;
};
```

### Properties

| Property               | Type                               | Description                                                                                                                                                                                                                         |
| ---------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | `string`                           | A unique name to identify this server connection.                                                                                                                                                                                   |
| `type`                 | `"sse"`                            | The transport type, which must be `"sse"` for this configuration.                                                                                                                                                                   |
| `url`                  | `string`                           | The URL of the MCP SSE server endpoint.                                                                                                                                                                                             |
| `headers`              | `Record<string, string>` (optional) | A key-value map of additional HTTP headers to send with the connection request, such as for custom authentication schemes.                                                                                                          |
| `auth`                 | `{ type: "bearer"; token: string; }` (optional) | A structured way to provide bearer token authentication. This is the preferred method for token-based auth, as it automatically constructs the `Authorization: Bearer <token>` header.                                     |
| `requireAuthForRemote` | `boolean` (optional)               | If `true` (the default), YAAF will issue a warning if the `url` is not a localhost address and no `auth` is configured. This can be set to `false` for trusted internal networks.                                                      |
| `reconnect`            | `McpReconnectConfig` (optional)    | Per-server configuration for handling dropped SSE connections using [Exponential Backoff](../concepts/exponential-backoff.md). This overrides the global `reconnect` settings in `McpPluginConfig`.                                                                    |
| `toolTimeoutMs`        | `number` (optional)                | A specific timeout in milliseconds for tool calls made to this server. This overrides the global `timeoutMs` set in `McpPluginConfig`, which is useful if a particular server is known to be slower or faster than others. |

## Examples

### Basic Remote Server

This example shows the minimal configuration for connecting to a public or local MCP server over SSE without authentication.

```typescript
import { McpPlugin } from 'yaaf';

const plugin = new McpPlugin({
  servers: [
    {
      name: 'public-server',
      type: 'sse',
      url: 'https://mcp.example.com/tools',
    },
  ],
});
```

### Server with Authentication and Custom Timeouts

This example demonstrates a more complex configuration for a private server that requires bearer token authentication. It also includes custom reconnect logic and a longer tool timeout.

```typescript
import { McpPlugin, McpSseServer } from 'yaaf';

const githubServerConfig: McpSseServer = {
  name: 'github',
  type: 'sse',
  url: 'https://mcp.github.com',
  auth: {
    type: 'bearer',
    token: process.env.GITHUB_TOKEN!,
  },
  // Override global reconnect settings for this specific server
  reconnect: {
    enabled: true,
    initialDelayMs: 2000, // Start with a 2s delay
    maxAttempts: 10,
  },
  // Give GitHub tools more time to execute
  toolTimeoutMs: 60000, // 60 seconds
};

const plugin = new McpPlugin({
  servers: [githubServerConfig],
});

// await plugin.initialize();
```

## See Also

- `McpPlugin`: The plugin that consumes this configuration.
- `McpPluginConfig`: The top-level configuration object for the `McpPlugin`.
- `McpStdioServer`: The alternative configuration type for local, process-based MCP servers.
- `McpReconnectConfig`: The type used for configuring SSE reconnection behavior.
- [Exponential Backoff](../concepts/exponential-backoff.md): The concept used for reconnection attempts.