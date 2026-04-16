---
title: MCP Security
entity_type: concept
summary: Security patterns specifically for Model Context Protocol (MCP) servers, including tool allowlisting and blocklisting.
stub: false
compiled_at: 2026-04-16T14:35:51.028Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/trustPolicy.ts
confidence: 0.9
---

---
title: MCP Security
entity_type: concept
summary: Security patterns specifically for Model Context Protocol (MCP) servers, including tool allowlisting and blocklisting.
related_subsystems:
  - security

## What It Is
MCP Security in YAAF refers to the framework's mechanisms for verifying the integrity and restricting the capabilities of Model Context Protocol (MCP) servers. As agents often connect to external or third-party MCP servers to extend their capabilities, YAAF implements security layers to ensure that only authorized tools are exposed to the LLM. This prevents the execution of dangerous or unintended functions by restricting the tool surface area through explicit trust policies.

## How It Works in YAAF
MCP Security is primarily implemented through the `TrustPolicy` class within the `security/trustPolicy` module. It operates by evaluating MCP servers against a defined manifest of trusted entities and their permitted actions.

### Tool Filtering
The framework uses two primary mechanisms to control tool access:
*   **Allowlisting (`allowedTools`)**: A list of specific tools that are permitted to be loaded from a given MCP server. If this list is defined, any tool not explicitly named is blocked.
*   **Blocklisting (`blockTools`)**: A list of specific tools that are explicitly forbidden from being loaded, even if the server is otherwise trusted.

### Verification Modes
The security system operates in one of two modes:
*   **`strict`**: The default mode. Any verification mismatch or attempt to load an unauthorized tool results in a failure to load the resource.
*   **`warn`**: Verification mismatches are logged as warnings, but the framework allows the MCP server or tool to be loaded.

### Unknown Policy
YAAF defines how to handle MCP servers that are not present in the trust manifest via the `unknownPolicy` setting:
*   **`deny`**: Blocks any server or tool not explicitly defined in the configuration (default in `strict` mode).
*   **`allow`**: Permits unknown servers to load (default in `warn` mode).

### Audit Logging
Every security decision is captured as a `TrustVerificationEvent`. These events include the target (e.g., `mcp_server` or `mcp_tool`), the name of the entity, the result (e.g., `trusted`, `verified`, `blocked`), and a timestamp. Developers can hook into these events using the `onVerification` callback for real-time monitoring or auditing.

## Configuration
Developers configure MCP security by initializing a `TrustPolicy` and passing it to the agent or runtime configuration.

```typescript
import { TrustPolicy } from 'yaaf';

const trust = new TrustPolicy({
  mcpServers: {
    'github': {
      // Only allow read-only operations
      allowedTools: ['search_repos', 'get_issue', 'list_pull_requests'],
      // Explicitly block destructive operations
      blockTools: ['delete_repo']
    },
    'local-filesystem': {
      // Mark a server as fully trusted to bypass tool filtering
      trusted: true
    }
  },
  mode: 'strict',
  unknownPolicy: 'deny'
});
```

## Sources
* `src/security/trustPolicy.ts`