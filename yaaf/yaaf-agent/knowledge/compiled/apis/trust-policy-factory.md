---
title: trustPolicy
entity_type: api
summary: Factory function to create a TrustPolicy instance with sensible defaults.
export_name: trustPolicy
source_file: src/security/trustPolicy.ts
category: function
stub: false
compiled_at: 2026-04-16T14:35:35.469Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/trustPolicy.ts
confidence: 0.9
---

## Overview
The `trustPolicy` function is a factory used to instantiate a `TrustPolicy` object, which manages the integrity and security verification of plugins and Model Context Protocol (MCP) servers. It allows developers to define security constraints such as SHA-256 checksums for plugin files, version ranges, and tool-level allowlists or blocklists for MCP servers.

This function is the primary entry point for configuring the security posture of a YAAF agent, supporting both `strict` enforcement (failing on verification mismatches) and `warn` mode (logging issues without blocking execution).

## Signature / Constructor

```typescript
function trustPolicy(config?: TrustPolicyConfig): TrustPolicy;
```

### TrustPolicyConfig
The configuration object defines how the policy should handle known and unknown entities.

| Property | Type | Description |
| :--- | :--- | :--- |
| `plugins` | `Record<string, PluginTrust>` | Security declarations for plugins, keyed by name. |
| `mcpServers` | `Record<string, McpServerTrust>` | Security declarations for MCP servers, keyed by name. |
| `mode` | `'strict' \| 'warn'` | Verification mode. `strict` (default) fails on mismatch; `warn` logs warnings. |
| `unknownPolicy` | `'allow' \| 'deny'` | Handling of entities not in the manifest. Defaults to `deny` in strict mode and `allow` in warn mode. |
| `onVerification` | `(event: TrustVerificationEvent) => void` | Callback triggered on every verification attempt. |

### Supporting Types

#### PluginTrust
Defines constraints for a specific plugin.
- `sha256?: string`: Expected SHA-256 hash of the plugin entry module.
- `version?: string`: Semver version constraint (e.g., `^1.0.0`).
- `trusted?: boolean`: If true, bypasses hash verification.

#### McpServerTrust
Defines constraints for a specific MCP server.
- `allowedTools?: string[]`: Explicit list of permitted tools.
- `blockTools?: string[]`: Explicit list of forbidden tools.
- `trusted?: boolean`: If true, bypasses tool filtering.

## Events
The `trustPolicy` instance tracks verification results through the `onVerification` callback. Each event uses the `TrustVerificationEvent` type:

| Property | Type | Description |
| :--- | :--- | :--- |
| `target` | `'plugin' \| 'mcp_server' \| 'mcp_tool'` | The type of entity being verified. |
| `name` | `string` | The name of the entity. |
| `result` | `string` | One of: `trusted`, `verified`, `warning`, `blocked`, or `unknown`. |
| `reason` | `string` | Human-readable explanation of the result. |
| `timestamp` | `Date` | When the verification occurred. |

## Examples

### Basic Configuration
Creating a policy that enforces specific tools for an MCP server and verifies a plugin hash.

```typescript
import { trustPolicy } from 'yaaf';

const trust = trustPolicy({
  mode: 'strict',
  plugins: {
    'data-processor': { 
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' 
    },
  },
  mcpServers: {
    'github': { 
      allowedTools: ['search_repos', 'get_issue'] 
    },
  },
  onVerification: (event) => {
    console.log(`[Security] ${event.target} ${event.name}: ${event.result} (${event.reason})`);
  }
});
```

### Permissive Warning Mode
Creating a policy that logs integrity issues but does not block execution.

```typescript
import { trustPolicy } from 'yaaf';

const trust = trustPolicy({
  mode: 'warn',
  unknownPolicy: 'allow'
});
```

## See Also
- `TrustPolicy` (class)
- `TrustVerificationEvent` (type)