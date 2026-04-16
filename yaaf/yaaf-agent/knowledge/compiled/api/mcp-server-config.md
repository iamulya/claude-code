---
title: McpServerConfig
entity_type: api
summary: Union type for MCP server configurations, supporting both stdio and SSE transports.
export_name: McpServerConfig
source_file: src/integrations/mcp.ts
category: type
stub: false
compiled_at: 2026-04-16T14:21:53.938Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcp.ts
confidence: 1
---

## Overview
`McpServerConfig` is a TypeScript union type used to define the connection parameters for Model Context Protocol (MCP) servers. It allows the framework to interface with external tool providers using either local process communication (stdio) or remote web-based communication (Server-Sent Events).

This configuration is primarily used within the `McpPluginConfig` to register one or more MCP servers with the framework, enabling an agent to access tools from the broader MCP ecosystem, such as filesystem utilities, database connectors, or API integrations.

## Signature / Constructor

```typescript
export type McpServerConfig = McpStdioServer | McpSseServer;

export type McpStdioServer = {
  name: string;
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export type McpSseServer = {
  name: string;
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
};
```

## Methods & Properties

### McpStdioServer
Used for servers running as local child processes.
*   `name` (string): A unique identifier for the server.
*   `type` (string): Must be the literal `'stdio'`.
*   `command` (string): The executable command to run (e.g., `'npx'`, `'node'`, `'python'`).
*   `args` (string[]): Optional array of command-line arguments passed to the process.
*   `env` (Record<string, string>): Optional environment variables to provide to the child process.

### McpSseServer
Used for servers hosted remotely and accessed via HTTP.
*   `name` (string): A unique identifier for the server.
*   `type` (string): Must be the literal `'sse'`.
*   `url` (string): The full URL of the MCP SSE endpoint.
*   `headers` (Record<string, string>): Optional HTTP headers for the connection, such as `Authorization` tokens.

## Examples

### Stdio Configuration
Configuring a local filesystem MCP server using `npx`.

```typescript
const filesystemConfig: McpServerConfig = {
  name: 'local-files',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/dir']
};
```

### SSE Configuration
Configuring a remote MCP server via a secure URL.

```typescript
const remoteConfig: McpServerConfig = {
  name: 'github-tools',
  type: 'sse',
  url: 'https://mcp.github.com',
  headers: {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
  }
};
```

### Usage in Plugin Configuration
Combining multiple server types into a single plugin configuration.

```typescript
const config: McpPluginConfig = {
  servers: [
    {
      name: 'sqlite',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite', '--db', 'data.db']
    },
    {
      name: 'remote-api',
      type: 'sse',
      url: 'https://api.example.com/mcp'
    }
  ]
};
```

## See Also
- `McpPlugin`
- `McpPluginConfig`