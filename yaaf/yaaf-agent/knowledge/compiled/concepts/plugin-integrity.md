---
title: Plugin Integrity
entity_type: concept
summary: The mechanism for ensuring that plugins and external tools are verified against hashes and version constraints before execution.
stub: false
compiled_at: 2026-04-16T14:35:46.926Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/trustPolicy.ts
confidence: 0.9
---

---
title: Plugin Integrity
entity_type: concept
summary: The mechanism for ensuring that plugins and external tools are verified against hashes and version constraints before execution.
related_subsystems:
  - security

## What It Is
Plugin Integrity is a security mechanism within YAAF designed to verify the authenticity and safety of external code and tools before they are loaded into the agent runtime. It addresses the risks associated with supply chain attacks, unauthorized code modifications, and version drift by ensuring that only explicitly trusted or verified components are executed.

This concept is central to YAAF's "production-grade" design, providing a layer of defense when using third-party plugins or Model Context Protocol (MCP) servers.

## How It Works in YAAF
The integrity system is primarily implemented through the `TrustPolicy` class. It operates by evaluating plugins and MCP servers against a defined configuration manifest.

### Verification Mechanisms
The framework employs several methods to verify integrity:
*   **SHA-256 Checksum Verification**: For plugins, the framework calculates the SHA-256 hash of the plugin's entry module and compares it against an expected hash.
*   **Version Constraints**: The system checks plugin versions against Semver ranges (e.g., `^2.3.0`) to ensure compatibility and prevent the use of deprecated or vulnerable versions.
*   **MCP Tool Filtering**: For MCP servers, the policy can define `allowedTools` (an allowlist) or `blockTools` (a blocklist) to restrict the specific capabilities an external server can expose to the agent.
*   **Explicit Trust**: Entities can be marked as `trusted`, which allows them to bypass standard hash or tool filtering checks.

### Operational Modes
The integrity system operates in two primary modes:
1.  **Strict**: The default mode. Any verification mismatch or policy violation results in a failure to load the component.
2.  **Warn**: The framework logs verification failures as warnings but allows the component to load and execute.

### Unknown Policy
The framework also defines how to handle "unregistered" entities—plugins or servers not present in the trust manifest. The `unknownPolicy` can be set to `allow` (permitting unknown components) or `deny` (blocking them). In `strict` mode, the default is `deny`, while in `warn` mode, the default is `allow`.

### Audit Logging
Every verification attempt generates a `TrustVerificationEvent`. This event captures the target type, the entity name, the result (e.g., `trusted`, `verified`, `blocked`), the reason for the result, and a timestamp. Developers can hook into these events using the `onVerification` callback for custom auditing or security monitoring.

## Configuration
Developers configure integrity rules by instantiating a `TrustPolicy` with a `TrustPolicyConfig` object.

```ts
import { TrustPolicy } from 'yaaf';

const trust = new TrustPolicy({
  // Verification mode
  mode: 'strict',
  
  // Policy for entities not listed below
  unknownPolicy: 'deny',

  // Plugin-specific constraints
  plugins: {
    'my-plugin': { 
      sha256: 'abc123...', 
      version: '^1.0.0' 
    },
    'internal-tool': {
      trusted: true
    }
  },

  // MCP Server constraints
  mcpServers: {
    'github': { 
      allowedTools: ['search_repos', 'get_issue'] 
    },
    'untrusted-source': {
      blockTools: ['delete_repo']
    }
  },

  // Audit hook
  onVerification: (event) => {
    console.log(`[Security] ${event.target} ${event.name}: ${event.result} (${event.reason})`);
  }
});
```

## Sources
* `src/security/trustPolicy.ts`---