---
export_name: McpServerConfig
source_file: src/integrations/mcp.ts
category: type
title: McpServerConfig
entity_type: api
summary: A type that defines the configuration for a single Model Context Protocol (MCP) server, supporting either stdio or SSE transports.
search_terms:
 - MCP server configuration
 - connect to MCP server
 - stdio tool server
 - SSE tool server
 - McpStdioServer
 - McpSseServer
 - Model Context Protocol setup
 - YAAF MCP plugin
 - tool provider config
 - external tool integration
 - how to configure MCP
 - stdio vs sse mcp
 - local process tools
 - remote tool server
stub: false
compiled_at: 2026-04-25T00:09:22.616Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/mcp.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`McpServerConfig` is a TypeScript union type used to configure a connection to a single Model Context Protocol (MCP) server within the `McpPlugin`. It allows YAAF agents to connect to and utilize tools from the broader MCP ecosystem, which includes servers for filesystems, version control systems like GitHub, project management tools, and more [Source 1].

This type is a union of two specific server configurations:
1.  `McpStdioServer`: For connecting to a local tool server that communicates over standard input/output (stdio). This is typically used for running a server as a child process.
2.  `McpSseServer`: For connecting to a remote tool server that communicates over HTTP using Server-Sent Events (SSE).

An array of `McpServerConfig` objects is passed to the `McpPlugin` constructor to define all the MCP servers the agent should connect to [Source 1].

## Signature

`McpServerConfig` is a union type composed of `McpStdioServer` and `McpSseServer`.

```typescript
export type McpServerConfig = McpStdioServer | McpSseServer;
```

### McpStdioServer

Configuration for a server that runs as a local process and communicates via stdio.

```typescript
export type McpStdioServer = {
  name: string;
  type: "stdio";
  /** Command to run (e.g. 'npx', 'node', 'python') */
  command: string;
  /** Arguments to the command */
  args?: string[];
  /** Environment variables to pass to the process */
  env?: Record<string, string>;
};
```

### McpSseServer

Configuration for a server that communicates over HTTP using Server-Sent Events (SSE).

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

## Examples

The following example demonstrates how to define configurations for both an `stdio` and an `sse` server. These configurations would be passed in an array to the `servers` property of the `McpPluginConfig`.

```typescript
import type { McpServerConfig } from 'yaaf';

// Example configuration for a local filesystem server via stdio
const filesystemServer: McpServerConfig = {
  name: 'filesystem',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
  env: { 'LOG_LEVEL': 'info' }
};

// Example configuration for a remote GitHub server via SSE
const githubServer: McpServerConfig = {
  name: 'github',
  type: 'sse',
  url: 'https://mcp.github.com',
  auth: {
    type: 'bearer',
    token: process.env.GITHUB_TOKEN || '',
  },
  toolTimeoutMs: 20000, // Custom timeout for this server
};

// These configurations would be used when instantiating the McpPlugin:
//
// import { McpPlugin } from 'yaaf';
//
// const mcpPlugin = new McpPlugin({
//   servers: [filesystemServer, githubServer],
// });
```

## See Also

*   `McpPlugin`: The YAAF plugin that consumes `McpServerConfig` objects to connect to MCP servers.
*   `McpPluginConfig`: The top-level configuration for the `McpPlugin`, which contains an array of `McpServerConfig`.
*   `McpReconnectConfig`: Configuration type for SSE connection retry logic, used within `McpSseServer`.

## Sources

[Source 1]: src/integrations/mcp.ts