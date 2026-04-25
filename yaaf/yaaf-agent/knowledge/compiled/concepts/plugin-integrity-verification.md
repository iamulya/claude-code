---
summary: The process of verifying the authenticity and integrity of YAAF plugins before loading them.
title: Plugin Integrity Verification
entity_type: concept
related_subsystems:
 - security
search_terms:
 - plugin security
 - verify plugin checksum
 - plugin allowlist
 - plugin blocklist
 - trust policy
 - how to secure agents
 - prevent malicious plugins
 - SHA-256 plugin hash
 - MCP server tool filtering
 - semver version constraints for plugins
 - strict mode verification
 - YAAF security model
 - audit plugin loading
stub: false
compiled_at: 2026-04-24T18:00:31.622Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Plugin Integrity Verification is a security mechanism in YAAF designed to ensure that plugins and MCP (Model Capability Provider) servers are authentic and have not been tampered with before they are loaded into an agent's runtime [Source 1]. This process mitigates the risk of executing malicious or compromised code by establishing a chain of trust based on predefined policies. It addresses security concerns by providing multiple layers of checks, including content hashing, version constraints, and capability filtering [Source 1].

## How It Works in YAAF

The core of this mechanism is the `TrustPolicy` class, which evaluates plugins and MCP servers against a developer-defined configuration [Source 1]. The verification process includes several distinct checks:

*   **Plugin Hash Verification**: The system calculates a SHA-256 checksum of a plugin's entry file content. This hash is then compared against an expected hash provided in the trust policy. A mismatch indicates that the file has been altered [Source 1].
*   **Version Constraints**: The policy can specify a semantic versioning (semver) range for a plugin (e.g., `'>=1.0.0'`, `'^2.3.0'`). The framework verifies that the plugin's declared version satisfies this constraint [Source 1].
*   **MCP Tool Filtering**: For MCP servers, the trust policy can define an allowlist (`allowed[[[[[[[[Tools]]]]]]]]`) or a blocklist (`blockTools`) to restrict which Tools the agent is permitted to use. This prevents an MCP server from exposing unintended or overly permissive capabilities [Source 1].
*   **Explicit Trust**: A plugin or MCP server can be marked as explicitly `trusted`, which bypasses other verification checks like hashing or tool filtering [Source 1].
*   **Audit Logging**: Every verification attempt generates a `TrustVerificationEvent`, which is passed to an `onVerification` callback. This event logs the target, name, result (`trusted`, `verified`, `warning`, `blocked`, `unknown`), a reason, and a timestamp, creating a comprehensive audit trail of all security decisions [Source 1].

The `TrustPolicy` operates in one of two modes:

*   **`strict`**: The default mode. Any verification failure will prevent the plugin or server from being loaded [Source 1].
*   **`warn`**: In this mode, verification failures will be logged as warnings, but the framework will still proceed with loading the plugin or server [Source 1].

The policy also defines how to handle plugins or servers that are not registered in the configuration via the `unknownPolicy` setting. In `strict` mode, the default is to `deny` unknown entities, while in `warn` mode, the default is to `allow` them [Source 1].

## Configuration

A developer configures Plugin Integrity Verification by creating an instance of the `TrustPolicy` class with a `TrustPolicyConfig` object. This object specifies the rules for plugins and MCP servers.

The following example demonstrates a `TrustPolicy` configuration:

```typescript
import { TrustPolicy } from 'yaaf';

const trust = new TrustPolicy({
  // Verification mode is 'strict' by default
  mode: 'strict',

  // Policy for plugins not listed below is 'deny' by default in strict mode
  unknownPolicy: 'deny',

  plugins: {
    'my-plugin': {
      // The plugin's entry file must match this SHA-256 hash
      sha256: 'abc123...',
      // The plugin's version must be compatible with version 2.3.x
      version: '^2.3.0'
    },
  },

  mcpServers: {
    'github': {
      // Only allow these two specific tools from the 'github' MCP server
      allowedTools: ['search_repos', 'get_issue'],
    },
  },

  // Optional callback for audit logging
  onVerification: (event) => {
    console.log(`Trust verification for ${event.target} '${event.name}': ${event.result} - ${event.reason}`);
  }
});
```
[Source 1]

In this configuration:
*   The policy operates in `strict` mode.
*   The plugin named `my-plugin` will only be loaded if its content hash and version match the specified values.
*   For the MCP server named `github`, only the `search_repos` and `get_issue` tools will be made available to the agent.
*   Any other plugin or MCP server will be blocked because `unknownPolicy` defaults to `deny` in `strict` mode.

## Sources

[Source 1] src/security/trustPolicy.ts