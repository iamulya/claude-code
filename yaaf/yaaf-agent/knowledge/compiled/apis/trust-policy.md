---
summary: Verifies the integrity of plugins and MCP servers before they are loaded, enforcing security policies.
export_name: TrustPolicy
source_file: src/security/trustPolicy.ts
category: class
title: TrustPolicy
entity_type: api
search_terms:
 - plugin security
 - MCP server security
 - verify plugin integrity
 - tool allowlist
 - tool blocklist
 - plugin checksum
 - SHA-256 verification
 - semver constraints for plugins
 - agent security policy
 - strict mode security
 - warn mode security
 - audit logging for security
 - how to trust a plugin
 - restrict MCP tools
stub: false
compiled_at: 2026-04-24T17:46:16.469Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `TrustPolicy` class is a security component responsible for verifying the integrity of plugins and MCP (Multi-Capability Provider) servers before they are loaded into the agent's runtime [Source 1]. It acts as a gatekeeper, enforcing a configurable security policy to prevent the execution of untrusted or modified code.

Key verification features include [Source 1]:
- **Plugin Hash Verification**: Checks the SHA-256 checksum of plugin entry files against a known hash to ensure they have not been tampered with.
- **MCP Tool Filtering**: Restricts which [Tools](../subsystems/tools.md) an MCP server can expose to the agent using allowlists and blocklists.
- **Version Constraints**: Ensures that a plugin's version matches an expected semantic versioning (semver) range.
- **Audit Logging**: Emits detailed events for every verification attempt, providing a comprehensive audit trail.

`TrustPolicy` can operate in two modes:
- `strict`: The default mode, where any verification failure will prevent the plugin or server from being loaded.
- `warn`: A more permissive mode that logs a warning for verification failures but still allows the resource to be loaded.

This class is essential for production environments where ensuring the provenance and integrity of executable components is a critical security requirement.

## Constructor

The `TrustPolicy` class is instantiated with a configuration object that defines the security rules.

```typescript
import { TrustPolicy, TrustPolicyConfig } from 'yaaf';

const policy = new TrustPolicy(config?: TrustPolicyConfig);
```

### `TrustPolicyConfig`

The constructor accepts an optional `TrustPolicyConfig` object with the following properties [Source 1]:

| Property       | Type                                       | Description                                                                                                                                                           |
|----------------|--------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `plugins`      | `Record<string, PluginTrust>`              | Optional. Plugin trust declarations, keyed by the plugin's name.                                                                                                      |
| `mcpServers`   | `Record<string, McpServerTrust>`           | Optional. MCP server trust declarations, keyed by the server's name.                                                                                                  |
| `mode`         | `'strict' \| 'warn'`                       | Optional. The verification mode. `strict` (default) fails on mismatch, while `warn` logs a warning but allows loading.                                                  |
| `unknownPolicy`| `'allow' \| 'deny'`                        | Optional. Defines behavior for unregistered plugins/servers. Defaults to `deny` in `strict` mode and `allow` in `warn` mode.                                           |
| `onVerification`| `(event: TrustVerificationEvent) => void` | Optional. A callback function that is invoked for every verification event, enabling audit logging.                                                                   |

### `PluginTrust`

This type defines the trust criteria for a single plugin [Source 1].

| Property  | Type      | Description                                                              |
|-----------|-----------|--------------------------------------------------------------------------|
| `sha256`  | `string`  | Optional. The expected SHA-256 hash of the plugin's entry module content. |
| `version` | `string`  | Optional. A semver constraint for the plugin's version (e.g., `'^1.2.3'`). |
| `trusted` | `boolean` | Optional. If `true`, this plugin is explicitly trusted, bypassing other checks. |

### `McpServerTrust`

This type defines the trust criteria for a single MCP server, primarily for tool filtering [Source 1].

| Property       | Type         | Description                                                                     |
|----------------|--------------|---------------------------------------------------------------------------------|
| `allowedTools` | `string[]`   | Optional. If set, only tools with names in this list are permitted.             |
| `blockTools`   | `string[]`   | Optional. If set, tools with names in this list are explicitly blocked.         |
| `trusted`      | `boolean`    | Optional. If `true`, this server is explicitly trusted, bypassing tool filtering. |

## Events

The `TrustPolicy` provides an audit trail through the `onVerification` callback specified in its constructor. This function is called for every verification event that occurs.

### `onVerification`

The callback receives a single argument, a `TrustVerificationEvent` object.

```typescript
const policy = new TrustPolicy({
  onVerification: (event: TrustVerificationEvent) => {
    console.log(`[${event.timestamp.toISOString()}] ${event.target} '${event.name}': ${event.result} - ${event.reason}`);
  }
});
```

### `TrustVerificationEvent`

This object contains details about a specific verification action [Source 1].

| Property    | Type                                                     | Description                                                              |
|-------------|----------------------------------------------------------|--------------------------------------------------------------------------|
| `target`    | `'plugin' \| 'mcp_server' \| 'mcp_tool'`                 | The type of entity that was verified.                                    |
| `name`      | `string`                                                 | The name of the plugin, server, or tool.                                 |
| `result`    | `'trusted' \| 'verified' \| 'warning' \| 'blocked' \| 'unknown'` | The outcome of the verification.                                         |
| `reason`    | `string`                                                 | A human-readable explanation for the result.                             |
| `timestamp` | `Date`                                                   | The time at which the verification occurred.                             |

## Examples

The following example demonstrates how to create a `TrustPolicy` to enforce rules for a specific plugin and an MCP server.

```typescript
import { TrustPolicy } from 'yaaf';

// Define a trust policy
const trust = new TrustPolicy({
  // Operate in strict mode (fail on any mismatch)
  mode: 'strict',

  // Define rules for plugins
  plugins: {
    'my-secure-plugin': {
      // The plugin's entry file must match this SHA-256 hash
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      // The plugin's version must be compatible with 2.x
      version: '^2.0.0'
    },
  },

  // Define rules for MCP servers
  mcpServers: {
    'github-api': {
      // Only allow these specific tools from the GitHub MCP server
      allowedTools: ['search_repos', 'get_issue'],
    },
    'internal-tools': {
      // Block a potentially dangerous tool
      blockTools: ['delete_database_records'],
    }
  },

  // Log all verification events to the console
  onVerification: (event) => {
    console.log(`TrustPolicy Event: ${JSON.stringify(event)}`);
  }
});

// This policy instance would then be passed to the agent runtime.
```

## See Also

- The `trustPolicy` factory function provides a convenient way to create a `TrustPolicy` instance with sensible defaults.

## Sources

[Source 1] src/security/trustPolicy.ts