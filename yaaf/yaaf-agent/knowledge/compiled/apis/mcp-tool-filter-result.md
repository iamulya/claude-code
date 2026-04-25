---
summary: Represents the outcome of filtering MCP tools based on trust policy, listing allowed and blocked tools.
export_name: McpToolFilterResult
source_file: src/security/trustPolicy.ts
category: type
title: McpToolFilterResult
entity_type: api
search_terms:
 - MCP tool filtering
 - tool allowlist result
 - blocked tools list
 - trust policy tool verification
 - how to see which tools are allowed
 - McpServerTrust outcome
 - security policy tool filtering
 - allowed tools
 - blocked tools
 - tool verification events
 - filter MCP tools
 - YAAF security
stub: false
compiled_at: 2026-04-24T17:21:14.913Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `McpToolFilterResult` type is a data structure that holds the results of applying a `TrustPolicy` to a list of [Tools](../subsystems/tools.md) exposed by an MCP (Multi-Capability Provider) server. It categorizes the tools into those that are permitted (`allowed`) and those that are denied (`blocked`) based on the configured `allowedTools` and `blockTools` rules.

This type is typically returned by methods within the `TrustPolicy` class. It provides a clear and auditable record of the filtering decision, including the specific verification events that led to each tool being allowed or blocked.

## Signature

`McpToolFilterResult` is a TypeScript type with the following structure:

```typescript
export type McpToolFilterResult = {
  /** 
   * An array of tool objects that passed the trust policy filter.
   * Each object includes the tool's name, an optional description, and its input schema.
   */
  allowed: Array<{ name: string; description?: string; inputSchema: unknown }>;

  /** 
   * An array of strings, where each string is the name of a tool that was
   * blocked by the trust policy.
   */
  blocked: string[];

  /** 
   * An array of `TrustVerificationEvent` objects generated during the filtering
   * process. These events provide detailed reasons for why each tool was
   * allowed or blocked.
   */
  events: TrustVerificationEvent[];
};
```

## Examples

The following example demonstrates how an `McpToolFilterResult` object would be structured after a `TrustPolicy` filters a list of tools from an MCP server.

```typescript
import { TrustPolicy, McpToolFilterResult } from 'yaaf';

// 1. Configure a TrustPolicy for a specific MCP server
const policy = new TrustPolicy({
  mcpServers: {
    'github-api': {
      allowedTools: ['get_issue', 'list_comments'],
      blockTools: ['delete_repo'],
    },
  },
  // Use 'deny' to block any tool not explicitly in the allowlist
  unknownPolicy: 'deny', 
});

// 2. Define the list of tools advertised by the 'github-api' server
const allAvailableTools = [
  { name: 'get_issue', description: 'Get a GitHub issue.', inputSchema: {} },
  { name: 'create_repo', description: 'Create a new repository.', inputSchema: {} },
  { name: 'delete_repo', description: 'Deletes a repository.', inputSchema: {} },
];

// 3. A method on the TrustPolicy class would process the tools and return an McpToolFilterResult
// (Note: `filterMcpTools` is an illustrative method name)
const result: McpToolFilterResult = policy.filterMcpTools('github-api', allAvailableTools);

// 4. Inspect the result
console.log('Allowed Tools:', result.allowed.map(tool => tool.name));
// Expected Output: Allowed Tools: [ 'get_issue' ]

console.log('Blocked Tools:', result.blocked);
// Expected Output: Blocked Tools: [ 'create_repo', 'delete_repo' ]

console.log('Verification Events:');
result.events.forEach(event => {
  console.log(`- ${event.name}: ${event.result} (${event.reason})`);
});
/* Expected Output:
Verification Events:
- github-api/get_issue: verified (Tool is in the allowlist.)
- github-api/create_repo: blocked (Tool not in allowlist for this server.)
- github-api/delete_repo: blocked (Tool is in the blocklist.)
*/
```

## See Also

- `TrustPolicy`: The class that enforces security policies and produces `McpToolFilterResult`.
- `McpServerTrust`: The configuration object used to define tool filtering rules for an MCP server.
- `TrustVerificationEvent`: The type for individual log entries contained within the `events` array.

## Sources

[Source 1]: src/security/trustPolicy.ts