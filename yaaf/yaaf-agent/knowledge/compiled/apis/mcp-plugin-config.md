---
export_name: McpPluginConfig
source_file: src/integrations/mcp.ts
category: type
title: McpPluginConfig
entity_type: api
summary: Configuration object for the McpPlugin, defining connections to MCP tool servers and behavior like timeouts and circuit breaking.
search_terms:
 - MCP plugin settings
 - connect to MCP server
 - Model Context Protocol configuration
 - McpStdioServer config
 - McpSseServer config
 - tool server connection
 - YAAF MCP integration
 - circuit breaker state file
 - SSE reconnect settings
 - tool call timeout
 - prefix tool names
 - McpReconnectConfig
 - how to configure mcp plugin
stub: false
compiled_at: 2026-04-25T00:09:04.710Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/mcp.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`McpPluginConfig` is a type alias for the configuration object required by the `McpPlugin` class constructor. It specifies the list of Model Context Protocol (MCP) servers to connect to, along with global settings for timeouts, tool name handling, circuit breaking, and reconnection strategies for SSE-based servers [Source 1].

This configuration allows an agent to integrate with the MCP ecosystem, accessing tools from various servers for tasks involving filesystems, version control, project management, and more [Source 1].

## Signature

`McpPluginConfig` is a TypeScript type with the following structure [Source 1]:

```typescript
export type McpPluginConfig = {
  /**
   * An array of server configurations to connect to.
   * Each element can be of type `McpStdioServer` or `McpSseServer`.
   */
  servers: McpServerConfig[];

  /**
   * Explicit plugin name. If omitted, a name is derived from the server names.
   */
  name?: string;

  /**
   * Timeout for tool calls in milliseconds.
   * Default: 30,000.
   * Can be overridden on a per-server basis in `McpSseServer.toolTimeoutMs`.
   */
  timeoutMs?: number;

  /**
   * When true, prefixes all tool names with their server's name to avoid collisions.
   * Default: false (only prefixes names if a collision is detected).
   */
  prefixNames?: boolean;

  /**
   * Timeout for the initial server connection and tool discovery phase in milliseconds.
   * If a server fails to respond within this time, it is marked as disconnected.
   * Default: 10,000.
   */
  connectTimeoutMs?: number;

  /**
   * The number of consecutive connection failures before a server's circuit is opened.
   * Once open, health checks for that server will fail and reconnect attempts are paused
   * until the circuit is manually reset.
   * Default: 3.
   */
  maxConnectFailures?: number;

  /**
   * Path to a JSON file for persisting circuit breaker state.
   * When a server's circuit is tripped, its state is saved to this file. On subsequent
   * initializations (e.g., after a process restart), the plugin reads this file and
   * avoids attempting to connect to servers whose circuits were recently tripped,
   * preventing cascading failures.
   * Default: undefined (state is kept in-memory and lost on restart).
   */
  stateFile?: string;

  /**
   * The duration in milliseconds that a persisted open circuit remains open across
   * process restarts. After this time elapses, the circuit is considered reset.
   * Default: 300,000 (5 minutes).
   */
  circuitResetMs?: number;

  /**
   * Default SSE reconnect configuration for all SSE servers.
   * This can be overridden for individual servers via `McpSseServer.reconnect`.
   */
  reconnect?: McpReconnectConfig;
};
```

### Related Types

#### `McpServerConfig`
This is a union type representing a single MCP server connection [Source 1].
`export type McpServerConfig = McpStdioServer | McpSseServer;`

-   **`McpStdioServer`**: Configures a connection to a local tool server that communicates over standard I/O (stdio). It includes properties for the `command` to run, `args`, and `env` variables.
-   **`McpSseServer`**: Configures a connection to a remote tool server that communicates over Server-Sent Events (SSE). It includes properties for the `url`, `headers`, `auth`, and server-specific `reconnect` and `toolTimeoutMs` settings.

#### `McpReconnectConfig`
This type defines the strategy for automatically reconnecting to an SSE server when the connection is lost [Source 1].

```typescript
export type McpReconnectConfig = {
  /**
   * Whether to auto-reconnect when the SSE connection drops.
   * Default: true.
   */
  enabled?: boolean;
  /**
   * The base delay for the first reconnect attempt in milliseconds.
   * Subsequent attempts use exponential backoff with jitter.
   * Default: 1,000.
   */
  initialDelayMs?: number;
  /**
   * The maximum delay between reconnect attempts in milliseconds.
   * Default: 30,000.
   */
  maxDelayMs?: number;
  /**
   * The maximum number of reconnect attempts before giving up and opening the circuit.
   * Default: 5.
   */
  maxAttempts?: number;
};
```

## Examples

### Basic Configuration

This example configures the `McpPlugin` to connect to a local filesystem server via stdio and a remote GitHub server via SSE [Source 1].

```typescript
import { McpPlugin, McpPluginConfig } from 'yaaf';

const config: McpPluginConfig = {
  servers: [
    {
      name: 'filesystem',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    },
    {
      name: 'github',
      type: 'sse',
      url: 'https://mcp.github.com',
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    },
  ],
  timeoutMs: 45000, // Increase default tool timeout to 45 seconds
};

// This config would be passed to the McpPlugin constructor
// const plugin = new McpPlugin(config);
```

### Advanced Configuration with Circuit Breaking

This example demonstrates configuring a persistent circuit breaker and custom reconnect settings for an SSE server [Source 1].

```typescript
import { McpPlugin, McpPluginConfig } from 'yaaf';

const config: McpPluginConfig = {
  servers: [
    {
      name: 'my-flaky-server',
      type: 'sse',
      url: 'https://mcp.example.com',
      reconnect: {
        maxAttempts: 10, // Be more persistent with this server
        initialDelayMs: 500,
      },
    },
  ],
  // Persist circuit breaker state to a file
  stateFile: '/var/cache/yaaf/mcp-circuit.json',
  // A tripped circuit will remain open for 10 minutes across restarts
  circuitResetMs: 10 * 60 * 1000,
  // Global reconnect settings (used if not overridden by a server)
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    maxDelayMs: 30000,
  },
};

// const plugin = new McpPlugin(config);
```

## Sources

[Source 1]: src/integrations/mcp.ts