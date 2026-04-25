---
summary: Configuration interface for the TrustPolicy class, specifying plugin and MCP server trust rules.
export_name: TrustPolicyConfig
source_file: src/security/trustPolicy.ts
category: type
title: TrustPolicyConfig
entity_type: api
search_terms:
 - plugin security configuration
 - MCP server trust settings
 - how to configure trust policy
 - plugin hash verification
 - tool allowlist
 - tool blocklist
 - semver constraints for plugins
 - strict mode security
 - warn mode security
 - unregistered plugin policy
 - trust verification events
 - YAAF security settings
 - agent supply chain security
stub: false
compiled_at: 2026-04-24T17:46:15.210Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`TrustPolicyConfig` is a TypeScript type alias that defines the configuration object for the `TrustPolicy` class. It specifies a set of rules for verifying the integrity and trustworthiness of plugins and Multi-Capability Provider (MCP) servers before they are loaded or used by an agent [Source 1].

This configuration allows developers to enforce security policies, such as ensuring plugins have not been tampered with (via SHA-256 hash checking), restricting the [Tools](../subsystems/tools.md) an agent can access from a given MCP server, and defining behavior for unlisted or unknown components [Source 1].

## Signature

`TrustPolicyConfig` is an object with the following properties [Source 1]:

```typescript
export type TrustPolicyConfig = {
  /**
   * Plugin trust declarations, keyed by plugin name.
   */
  plugins?: Record<string, PluginTrust>;

  /**
   * MCP server trust declarations, keyed by server name.
   */
  mcpServers?: Record<string, McpServerTrust>;

  /**
   * Verification mode:
   * - `strict` — fail on mismatch (default)
   * - `warn` — log warning, allow loading
   */
  mode?: "strict" | "warn";

  /**
   * What to do with unregistered plugins/servers (not in the manifest):
   * - `allow` — permit unknown plugins (default in warn mode)
   * - `deny` — block unknown plugins (default in strict mode)
   */
  unknownPolicy?: "allow" | "deny";

  /**
   * Called on every verification event.
   */
  onVerification?: (event: TrustVerificationEvent) => void;
};
```

### `PluginTrust` Type

The `plugins` property is a record where each value is a `PluginTrust` object with the following structure [Source 1]:

```typescript
export type PluginTrust = {
  /** Expected SHA-256 hash of the plugin entry module content */
  sha256?: string;
  /** Semver version constraint (e.g., '>=1.0.0', '^2.3.0') */
  version?: string;
  /** Whether this plugin is explicitly trusted (bypasses hash check) */
  trusted?: boolean;
};
```

### `McpServerTrust` Type

The `mcpServers` property is a record where each value is an `McpServerTrust` object with the following structure [Source 1]:

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

### `TrustVerificationEvent` Type

The `onVerification` callback receives a `TrustVerificationEvent` object with the following structure [Source 1]:

```typescript
export type TrustVerificationEvent = {
  /** What was verified */
  target: "plugin" | "mcp_server" | "mcp_tool";
  /** Name of the entity */
  name: string;
  /** Result of verification */
  result: "trusted" | "verified" | "warning" | "blocked" | "unknown";
  /** Reason for the result */
  reason: string;
  /** Timestamp */
  timestamp: Date;
};
```

## Examples

### Basic Configuration

This example demonstrates a basic `TrustPolicyConfig` that verifies a single plugin's hash and restricts the tools available from an MCP server.

```typescript
import { TrustPolicy, TrustPolicyConfig } from 'yaaf';

const config: TrustPolicyConfig = {
  plugins: {
    'my-plugin': { sha256: 'abc123def456...' },
  },
  mcpServers: {
    'github': { allowedTools: ['search_repos', 'get_issue'] },
  },
};

const trustPolicy = new TrustPolicy(config);
```

### Strict Mode with an Audit Callback

This example shows a more comprehensive configuration operating in `strict` mode, denying unknown plugins, and logging all verification events.

```typescript
import { TrustPolicy, TrustPolicyConfig, TrustVerificationEvent } from 'yaaf';

const strictConfig: TrustPolicyConfig = {
  mode: 'strict',
  unknownPolicy: 'deny',
  plugins: {
    'plugin-a': {
      sha256: 'f2d81a260dea8b1080139706df1a430173154316601cf403231d3b7d18402b8f',
      version: '^1.2.0',
    },
    'internal-plugin': {
      trusted: true, // Bypass hash/version checks
    },
  },
  mcpServers: {
    'internal-api': {
      trusted: true,
    },
    'external-api': {
      blockTools: ['delete_data'],
    },
  },
  onVerification: (event: TrustVerificationEvent) => {
    console.log(`[TRUST_AUDIT] ${event.timestamp.toISOString()} - ${event.target}:${event.name} -> ${event.result} (${event.reason})`);
  },
};

const strictTrustPolicy = new TrustPolicy(strictConfig);
```

## See Also

- `TrustPolicy`: The class that consumes this configuration to perform security checks.
- `trustPolicy`: A factory function for creating a `TrustPolicy` instance with sensible defaults.

## Sources

[Source 1]: src/security/trustPolicy.ts