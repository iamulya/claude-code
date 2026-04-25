---
summary: A security mechanism to control which tools an MCP server is permitted to expose to an agent.
title: MCP Tool Allowlist/Blocklist
entity_type: concept
related_subsystems:
 - Security
search_terms:
 - MCP security
 - tool filtering
 - restrict agent tools
 - allowlist tools
 - blocklist tools
 - TrustPolicy tool control
 - how to secure MCP servers
 - preventing dangerous tool execution
 - agent tool permissions
 - YAAF security policy
 - McpServerTrust configuration
 - allowedTools property
 - blockTools property
stub: false
compiled_at: 2026-04-24T17:58:23.510Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The MCP Tool Allowlist/Blocklist is a security feature in YAAF that provides granular control over the [Tools](../subsystems/tools.md) an agent can access from a given MCP (Multi-Capability Provider) server [Source 1]. This mechanism allows developers to explicitly define which tools are permitted or forbidden, thereby enforcing security boundaries and reducing the attack surface of an agent. It solves the problem of preventing agents from using potentially harmful, untested, or irrelevant tools that an MCP server might expose, ensuring that the agent's capabilities are strictly limited to what is necessary and approved for its task [Source 1].

## How It Works in YAAF

This functionality is implemented as part of the `TrustPolicy` subsystem [Source 1]. [when](../apis/when.md) a `TrustPolicy` is configured, it can include trust declarations for specific MCP servers, identified by name. Each server's declaration, defined by the `McpServerTrust` type, can specify rules for tool filtering [Source 1].

The filtering operates in two primary modes:

1.  **Allowlist Mode**: By setting the `allowedTools` property to an array of tool names, only the tools in that list will be made available to the agent from that MCP server. All other tools exposed by the server are implicitly blocked [Source 1].
2.  **Blocklist Mode**: By setting the `blockTools` property, any tools with names matching those in the list are explicitly blocked. All other tools are permitted [Source 1].

Additionally, an MCP server can be marked as `trusted: true` in its configuration. This flag bypasses all tool filtering for that server, granting the agent access to all tools it exposes [Source 1]. The `TrustPolicy` logs every verification event, including the blocking or allowing of tools, which can be used for auditing purposes [Source 1].

## Configuration

Configuration is managed within the `TrustPolicyConfig` object, specifically under the `mcpServers` key. The key for each entry is the name of the MCP server, and the value is an `McpServerTrust` object containing the filtering rules [Source 1].

### Allowlist Example

This example configures a `TrustPolicy` to only allow the `search_repos` and `get_issue` tools from the `github` MCP server. Any other tools offered by this server will be blocked.

```typescript
import { TrustPolicy } from 'yaaf';

const trust = new TrustPolicy({
  mcpServers: {
    'github': {
      allowedTools: ['search_repos', 'get_issue']
    },
  },
});
```
[Source 1]

### Blocklist Example

This example configures a `TrustPolicy` to explicitly block a hypothetical `delete_repo` tool from the `github` MCP server, while allowing all other tools.

```typescript
import { TrustPolicy } from 'yaaf';

const trust = new TrustPolicy({
  mcpServers: {
    'github': {
      blockTools: ['delete_repo']
    },
  },
});
```
[Source 1]

## Sources

[Source 1] src/security/trustPolicy.ts