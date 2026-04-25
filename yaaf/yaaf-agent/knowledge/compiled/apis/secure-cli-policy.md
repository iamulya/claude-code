---
summary: A pre-built permission policy for command-line agents that blocks dangerous commands and requires approval for shell execution.
export_name: secureCLIPolicy
source_file: src/permissions.ts
category: function
title: secureCLIPolicy
entity_type: api
search_terms:
 - default permission policy
 - secure agent permissions
 - CLI agent security
 - block dangerous commands
 - shell execution approval
 - command line agent policy
 - pre-built security rules
 - how to secure an agent
 - YAAF permissions
 - safe tool execution
 - exec command security
 - prevent rm -rf
 - safe by default
stub: false
compiled_at: 2026-04-24T17:36:01.538Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `secure[[[[[[[[CLI]]]]]]]]Policy` function is a factory that creates a pre-configured `PermissionPolicy` instance with a set of security rules suitable for agents that interact with a command-line interface (CLI) [Source 1]. It provides a safe-by-default starting point for tool permissions to prevent agents from performing destructive actions without explicit user consent.

This policy is configured with three main behaviors [Source 1]:
1.  **Blocks Dangerous Commands**: It automatically denies [Tool Calls](../concepts/tool-calls.md) whose arguments match a list of potentially destructive shell patterns (e.g., `rm -rf /`, `sudo`, fork bombs). This is achieved using a predicate based on the `isDangerousCommand` utility.
2.  **Requires Approval for Execution**: Any tool call that involves shell execution (e.g., `exec_command`) is escalated for manual approval.
3.  **Allows Read-Only Operations**: The policy is designed to permit read-only operations, which are generally considered safe.

Developers should use `secureCLIPolicy` as a baseline and then chain additional rules or attach an `ApprovalHandler` like `cliApproval` to handle the approval flow [Source 1].

## Signature

`secureCLIPolicy` is a function that takes no arguments and returns a new `PermissionPolicy` instance.

```typescript
export function secureCLIPolicy(): PermissionPolicy;
```

**Returns:**

*   `PermissionPolicy`: An instance of `PermissionPolicy` with pre-configured security rules.

## Examples

The most common use case is to create the policy and then attach an interactive approval handler. The policy can also be further customized with additional `allow`, `deny`, or `requireApproval` rules.

```typescript
import { Agent } from 'yaaf';
import { secureCLIPolicy, cliApproval } from 'yaaf';

// Create a policy with secure defaults for a CLI agent.
const policy = secureCLIPolicy()
  // You can chain additional rules to customize the policy.
  // This example explicitly allows all tools starting with "read_".
  .allow('read_*')
  // Attach an interactive approval handler for escalated tool calls.
  .onRequest(cliApproval());

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant that can use tools.',
  permissions: policy,
  // ... other agent configuration
});
```

## Sources

[Source 1]: src/permissions.ts