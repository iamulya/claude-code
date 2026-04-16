---
title: secureCLIPolicy
entity_type: api
summary: A factory function that returns a pre-configured PermissionPolicy with safety defaults for command-line environments.
export_name: secureCLIPolicy
source_file: src/permissions.ts
category: function
stub: false
compiled_at: 2026-04-16T14:31:48.637Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/permissions.ts
confidence: 1
---

## Overview
The `secureCLIPolicy` is a factory function designed to provide a baseline security configuration for agents operating in command-line environments. It initializes a `PermissionPolicy` with sensible defaults aimed at preventing destructive operations while allowing common read-only tasks. 

This policy is particularly useful for developers building CLI-based agents where the LLM might have access to shell execution tools. It automates the process of blocking known dangerous command patterns and ensures that any potentially sensitive execution requires explicit user intervention.

## Signature / Constructor
```typescript
export function secureCLIPolicy(): PermissionPolicy
```

### Returns
- **PermissionPolicy**: A new instance of the policy class, pre-configured with CLI-specific safety rules.

## Default Behavior
The policy returned by `secureCLIPolicy` is pre-configured with the following logic:
- **Dangerous Pattern Blocking**: It automatically denies tool calls that match high-risk shell patterns (such as recursive deletions of root directories, privilege escalation via `sudo`, or raw disk writes).
- **Execution Guardrails**: It flags execution-related tools (like `exec` or `shell`) to require manual approval from the user.
- **Read-Only Access**: It provides a default allowance for tools that follow read-only naming conventions (e.g., `read_*`).

## Examples

### Basic Usage
This example shows how to initialize an agent with the secure CLI policy and attach a terminal-based approval handler.

```typescript
import { Agent, secureCLIPolicy, cliApproval } from 'yaaf';

const policy = secureCLIPolicy()
  .onRequest(cliApproval());

const agent = new Agent({
  systemPrompt: 'You are a helpful CLI assistant.',
  permissions: policy,
});
```

### Customizing the Secure Policy
The policy returned is a standard instance of `PermissionPolicy`, allowing for further customization or overrides.

```typescript
import { secureCLIPolicy, cliApproval } from 'yaaf';

const policy = secureCLIPolicy()
  .allow('read_config')  // Explicitly allow a specific read tool
  .deny('exec_script', 'Scripts are strictly forbidden') // Add a specific denial
  .onRequest(cliApproval());
```

## See Also
- `PermissionPolicy`
- `cliApproval`
- `isDangerousCommand`

## Sources
- `src/permissions.ts`