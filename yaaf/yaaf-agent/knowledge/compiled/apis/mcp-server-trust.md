---
summary: Defines the trust configuration for an MCP server, including allowed and blocked tools.
export_name: McpServerTrust
source_file: src/security/trustPolicy.ts
category: type
title: McpServerTrust
entity_type: api
search_terms:
 - MCP server security
 - tool allowlist
 - tool blocklist
 - restrict agent tools
 - MCP trust policy
 - how to configure MCP server trust
 - agent tool filtering
 - McpServerTrust configuration
 - YAAF security policy
 - allowedTools property
 - blockTools property
 - trusted MCP server
stub: false
compiled_at: 2026-04-24T17:21:10.396Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `McpServerTrust` type is a configuration object that defines the security and trust settings for a specific MCP (Multi-Capability Provider) server within a `TrustPolicy`. It allows administrators to control which [Tools](../subsystems/tools.md) exposed by an MCP server can be used by an agent, providing a critical layer of security.

This is achieved by specifying an allowlist (`allowedTools`), a blocklist (`blockTools`), or by explicitly marking the entire server as `trusted`, which bypasses all tool filtering. This configuration is part of the larger `TrustPolicyConfig` object used to initialize a `TrustPolicy`.

## Signature

`McpServerTrust` is a TypeScript type alias with the following structure:

```typescript
export type McpServerTrust = {
  /** If set, only these tools are allowed from this server */
  allowedTools?: string[];
  /** If set, these tools are explicitly blocked from this server */
  blockTools?: string[];
  /** Whether this server is explicitly trusted (bypasses tool filtering) */
  trusted?: boolean;
};
```

### Properties

- **`allowedTools?: string[]`**: An optional array of tool names. If this property is defined, only the tools whose names are in this array will be permitted for use from the MCP server. All other tools will be blocked. `allowedTools` and `blockTools` are mutually exclusive.
- **`blockTools?: string[]`**: An optional array of tool names. If this property is defined, any tool whose name is in this array will be blocked. All other tools from the MCP server will be permitted. `allowedTools` and `blockTools` are mutually exclusive.
- **`trusted?: boolean`**: An optional boolean. If set to `true`, all tool filtering for this MCP server is bypassed, and all tools it exposes are considered allowed. This provides a convenient way to fully trust a known, secure server.

## Examples

The `McpServerTrust` object is used within the `mcpServers` property of a `TrustPolicyConfig`.

### Using an Allowlist

This example configures a trust policy for an MCP server named `github-api`. It only allows the agent to use the `get_issue` and `list_pull_requests` tools, blocking all others from that server.

```typescript
import { TrustPolicy } from 'yaaf';

const policy = new TrustPolicy({
  mcpServers: {
    'github-api': {
      allowedTools: ['get_issue', 'list_pull_requests'],
    },
  },
});
```

### Using a Blocklist

This example blocks a potentially destructive tool, `delete_repo`, from the `github-api` server, while allowing all other tools it might expose.

```typescript
import { TrustPolicy } from 'yaaf';

const policy = new TrustPolicy({
  mcpServers: {
    'github-api': {
      blockTools: ['delete_repo'],
    },
  },
});
```

### Trusting a Server Explicitly

This example marks the `internal-metrics-server` as fully trusted, bypassing any tool-level checks. All tools from this server will be available to the agent.

```typescript
import { TrustPolicy } from 'yaaf';

const policy = new TrustPolicy({
  mcpServers: {
    'internal-metrics-server': {
      trusted: true,
    },
  },
});
```

## See Also

- `TrustPolicy`: The class that consumes `McpServerTrust` configurations to enforce security policies.
- `TrustPolicyConfig`: The main configuration object for a `TrustPolicy`, which contains the `mcpServers` mapping.
- `PluginTrust`: A related type for defining trust policies for plugins.

## Sources

[Source 1] `src/security/trustPolicy.ts`