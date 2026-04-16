---
title: TrustPolicy
entity_type: api
summary: A class for verifying the integrity of plugins and MCP servers before they are loaded.
export_name: TrustPolicy
source_file: src/security/trustPolicy.ts
category: class
stub: false
compiled_at: 2026-04-16T14:35:38.012Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/trustPolicy.ts
confidence: 0.95
---

## Overview
`TrustPolicy` is a security component designed to verify the integrity and safety of external components, specifically plugins and Model Context Protocol (MCP) servers, before they are integrated into the agent runtime. It provides a mechanism to prevent the execution of unauthorized code or the exposure of sensitive tools.

The policy supports several verification methods:
- **Plugin Hash Verification**: Uses SHA-256 checksums to ensure plugin entry files have not been tampered with.
- **MCP Tool Filtering**: Restricts which tools an MCP server is permitted to expose via allowlists and blocklists.
- **Version Constraints**: Validates that plugin versions fall within specified Semver ranges.
- **Audit Logging**: Captures verification events for security auditing.

`TrustPolicy` operates in two primary modes:
- `strict`: The default mode, which fails the loading process if any verification mismatch occurs.
- `warn`: Logs verification failures as warnings but allows the component to load.

## Signature / Constructor

### Constructor
```typescript
export class TrustPolicy {
  constructor(config?: TrustPolicyConfig);
}
```

### Factory Function
The API also provides a factory function for creating instances with sensible defaults.
```typescript
export function trustPolicy(config?: TrustPolicyConfig): TrustPolicy;
```

### Configuration Types

#### TrustPolicyConfig
The main configuration object for defining trust rules.
```typescript
export type TrustPolicyConfig = {
  plugins?: Record<string, PluginTrust>;
  mcpServers?: Record<string, McpServerTrust>;
  mode?: 'strict' | 'warn';
  unknownPolicy?: 'allow' | 'deny';
  onVerification?: (event: TrustVerificationEvent) => void;
};
```
- `plugins`: A map of plugin names to their trust requirements.
- `mcpServers`: A map of MCP server names to their tool access rules.
- `mode`: Determines if verification failures block execution (`strict`) or only log warnings (`warn`).
- `unknownPolicy`: Defines behavior for entities not listed in the manifest. Defaults to `deny` in `strict` mode and `allow` in `warn` mode.
- `onVerification`: A callback triggered for every verification attempt.

#### PluginTrust
```typescript
export type PluginTrust = {
  sha256?: string;
  version?: string;
  trusted?: boolean;
};
```
- `sha256`: The expected SHA-256 hash of the plugin's entry module.
- `version`: A Semver constraint (e.g., `^1.0.0`).
- `trusted`: If `true`, bypasses hash and version checks.

#### McpServerTrust
```typescript
export type McpServerTrust = {
  allowedTools?: string[];
  blockTools?: string[];
  trusted?: boolean;
};
```
- `allowedTools`: An explicit list of tools the server is permitted to expose.
- `blockTools`: A list of tools that are explicitly forbidden.
- `trusted`: If `true`, bypasses tool filtering.

## Events
The `TrustPolicy` generates verification events that can be captured via the `onVerification` callback.

### TrustVerificationEvent
```typescript
export type TrustVerificationEvent = {
  target: 'plugin' | 'mcp_server' | 'mcp_tool';
  name: string;
  result: 'trusted' | 'verified' | 'warning' | 'blocked' | 'unknown';
  reason: string;
  timestamp: Date;
};
```

## Examples

### Basic Configuration
This example demonstrates setting up a policy that enforces a specific hash for a plugin and restricts the tools available from a GitHub MCP server.

```typescript
import { TrustPolicy } from 'yaaf';

const trust = new TrustPolicy({
  mode: 'strict',
  plugins: {
    'data-processor': { 
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      version: '^1.2.0'
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

### Using the Factory Function
```typescript
import { trustPolicy } from 'yaaf';

const policy = trustPolicy({
  unknownPolicy: 'deny',
  mcpServers: {
    'filesystem': {
      blockTools: ['delete_file', 'format_drive']
    }
  }
});
```