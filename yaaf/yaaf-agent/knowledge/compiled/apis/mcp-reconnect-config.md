---
export_name: McpReconnectConfig
source_file: src/integrations/mcp.ts
category: type
title: McpReconnectConfig
entity_type: api
summary: Defines the configuration for automatic reconnection to an MCP SSE server using an exponential backoff strategy.
search_terms:
 - MCP SSE reconnect
 - exponential backoff settings
 - how to configure MCP retry
 - SSE connection drop
 - network resilience for MCP
 - McpPlugin reconnect options
 - automatic retry configuration
 - connection stability
 - max reconnect attempts
 - reconnect delay
 - circuit breaker for SSE
 - network interruption handling
stub: false
compiled_at: 2026-04-25T00:09:05.921Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/mcp.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`McpReconnectConfig` is a TypeScript type that specifies the parameters for automatically reconnecting to a Model Context Protocol (MCP) Server-Sent Events (SSE) endpoint when the connection is lost [Source 1]. This configuration enables resilient agent operation by attempting to re-establish communication with a temporarily unavailable server.

The reconnection strategy employs [Exponential Backoff](../concepts/exponential-backoff.md) with [Jitter](../concepts/jitter.md) to prevent overwhelming a recovering server. When a connection drops, the system waits for an initial delay before the first attempt. Subsequent attempts double the delay, up to a configured maximum, until the maximum number of attempts is reached [Source 1].

This configuration can be set globally for all SSE servers in `McpPluginConfig` or overridden for a specific server within its `McpSseServer` configuration object [Source 1].

## Signature

`McpReconnectConfig` is a type alias for an object with the following properties:

```typescript
export type McpReconnectConfig = {
  /**
   * Whether to auto-reconnect when the SSE connection drops.
   * Default: true.
   */
  enabled?: boolean;
  /**
   * Base delay for the first reconnect attempt (ms).
   * Subsequent attempts use `initialDelayMs * 2^attempt` with jitter.
   * Default: 1_000.
   */
  initialDelayMs?: number;
  /**
   * Maximum delay between reconnect attempts (ms).
   * Default: 30_000.
   */
  maxDelayMs?: number;
  /**
   * Maximum number of reconnect attempts before giving up.
   * After exhaustion, the circuit opens and `healthCheck()` returns false.
   * Default: 5.
   */
  maxAttempts?: number;
};
```
[Source 1]

### Properties

- **`enabled?: boolean`**: If `true`, the system will attempt to reconnect automatically when an SSE connection is lost. Defaults to `true` [Source 1].
- **`initialDelayMs?: number`**: The base delay in milliseconds for the first reconnection attempt. The delay for subsequent attempts increases exponentially. Defaults to `1000` (1 second) [Source 1].
- **`maxDelayMs?: number`**: The maximum possible delay in milliseconds between reconnection attempts, acting as a cap on the exponential backoff. Defaults to `30000` (30 seconds) [Source 1].
- **`maxAttempts?: number`**: The total number of reconnection attempts to make before considering the server permanently unavailable and opening its circuit. Defaults to `5` [Source 1].

## Examples

### Global Reconnect Configuration

This example defines a default reconnection policy for all SSE servers managed by an `McpPlugin` instance.

```typescript
import { McpPlugin } from 'yaaf';

const plugin = new McpPlugin({
  servers: [
    { 
      name: 'github', 
      type: 'sse', 
      url: 'https://mcp.github.com' 
    },
    { 
      name: 'internal-tools', 
      type: 'sse', 
      url: 'http://localhost:8080' 
    }
  ],
  // This policy applies to both 'github' and 'internal-tools' servers.
  reconnect: {
    enabled: true,
    initialDelayMs: 500,    // Start with a shorter delay
    maxDelayMs: 60_000,     // Allow up to a 1-minute delay
    maxAttempts: 10,        // Try more times before giving up
  }
});
```
[Source 1]

### Per-Server Reconnect Override

This example shows how to override the global (or default) reconnect policy for a specific server that is known to be less reliable.

```typescript
import { McpPlugin } from 'yaaf';

const plugin = new McpPlugin({
  servers: [
    { 
      name: 'stable-server', 
      type: 'sse', 
      url: 'https://mcp.stable.com' 
      // Uses default reconnect settings
    },
    { 
      name: 'flaky-server', 
      type: 'sse', 
      url: 'https://mcp.flaky.com',
      // This server gets a more aggressive retry policy.
      reconnect: {
        initialDelayMs: 2000,
        maxAttempts: 3,
      }
    }
  ],
  // Default settings for any server without a specific override.
  reconnect: {
    initialDelayMs: 1000,
    maxAttempts: 5,
  }
});
```
[Source 1]

## See Also

- `McpPlugin`: The main class that utilizes this configuration to connect to MCP servers.
- `McpPluginConfig`: The top-level configuration object for `McpPlugin`, where a default `McpReconnectConfig` can be specified.
- `McpSseServer`: The configuration type for an individual SSE server, where `McpReconnectConfig` can be used to override global settings.
- [Exponential Backoff](../concepts/exponential-backoff.md): The underlying strategy used for scheduling retry attempts.
- [Jitter](../concepts/jitter.md): The technique used to randomize backoff delays to prevent synchronized retries.

## Sources

- [Source 1]: `src/integrations/mcp.ts`