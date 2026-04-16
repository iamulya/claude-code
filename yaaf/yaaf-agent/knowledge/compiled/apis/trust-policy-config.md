---
title: TrustPolicyConfig
entity_type: api
summary: Configuration interface for defining plugin and MCP server trust declarations.
export_name: TrustPolicyConfig
source_file: src/security/trustPolicy.ts
category: type
stub: false
compiled_at: 2026-04-16T14:35:45.263Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/trustPolicy.ts
confidence: 0.9
---

## Overview
`TrustPolicyConfig` is the configuration interface used to initialize a `TrustPolicy`. It defines the security manifest for a YAAF application, allowing developers to specify integrity requirements for plugins and access control lists for Model Context Protocol (MCP) servers. 

This configuration is used to enforce SHA-256 checksum verification, version constraints, and tool-level allowlists/blocklists. It supports two operational modes: `strict`, which prevents the loading of unverified components, and `warn`, which logs issues but allows execution to proceed.

## Signature / Constructor

```typescript
export type TrustPolicyConfig = {
  /**
   * Plugin trust declarations, keyed by plugin name.
   */
  plugins?: Record<string, PluginTrust>

  /**
   * MCP server trust declarations, keyed by server name.
   */
  mcpServers?: Record<string, McpServerTrust>

  /**
   * Verification mode:
   * - `strict` — fail on mismatch (default)
   * - `warn` — log warning, allow loading
   */
  mode?: TrustPolicyMode

  /**
   * What to do with unregistered plugins/servers (not in the manifest):
   * - `allow` — permit unknown plugins (default in warn mode)
   * - `deny` — block unknown plugins (default in strict mode)
   */
  unknownPolicy?: 'allow' | 'deny'

  /**
   * Called on every verification event.
   */
  onVerification?: (event: TrustVerificationEvent) => void
}
```

## Methods & Properties

### PluginTrust
The `PluginTrust` type defines security constraints for individual plugins:
*   `sha256` (string, optional): The expected SHA-256 hash of the plugin's entry module content.
*   `version` (string, optional): A Semver version constraint (e.g., `'>=1.0.0'`, `'^2.3.0'`).
*   `trusted` (boolean, optional): If `true`, the plugin is explicitly trusted and bypasses hash verification.

### McpServerTrust
The `McpServerTrust` type defines security constraints for MCP servers:
*   `allowedTools` (string[], optional): An explicit list of tool names permitted from this server.
*   `blockTools` (string[], optional): An explicit list of tool names to be blocked from this server.
*   `trusted` (boolean, optional): If `true`, the server is explicitly trusted and bypasses tool filtering.

### TrustPolicyMode
A union type defining the enforcement level:
*   `strict`: Fails the loading process if any verification mismatch occurs.
*   `warn`: Logs a warning to the `onVerification` callback but allows the component to load.

## Events

The `onVerification` property accepts a callback that receives a `TrustVerificationEvent` whenever a component is checked against the policy.

### TrustVerificationEvent
*   `target`: The type of entity verified (`'plugin'`, `'mcp_server'`, or `'mcp_tool'`).
*   `name`: The unique identifier of the entity.
*   `result`: The outcome of the check (`'trusted'`, `'verified'`, `'warning'`, `'blocked'`, or `'unknown'`).
*   `reason`: A human-readable string explaining the result.
*   `timestamp`: The date and time the verification occurred.

## Examples

### Basic Security Manifest
This example demonstrates configuring a trust policy with a plugin hash check and an MCP tool allowlist.

```typescript
import { TrustPolicy } from 'yaaf';

const trust = new TrustPolicy({
  mode: 'strict',
  unknownPolicy: 'deny',
  plugins: {
    'data-processor': { 
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      version: '^1.2.0'
    },
  },
  mcpServers: {
    'github-mcp': { 
      allowedTools: ['search_repos', 'get_issue'] 
    },
  },
  onVerification: (event) => {
    console.log(`[Security] ${event.target} ${event.name}: ${event.result} (${event.reason})`);
  }
});
```

### Permissive Warning Mode
This example shows a configuration that logs integrity mismatches without blocking execution.

```typescript
const permissiveConfig: TrustPolicyConfig = {
  mode: 'warn',
  unknownPolicy: 'allow',
  plugins: {
    'legacy-plugin': { trusted: true }
  }
};
```