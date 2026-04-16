---
title: cliApproval
entity_type: api
summary: A built-in approval handler that prompts the user for confirmation via the command line interface.
export_name: cliApproval
source_file: src/permissions.ts
category: function
stub: false
compiled_at: 2026-04-16T14:10:02.031Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/permissions.ts
confidence: 1
---

## Overview
`cliApproval` is a factory function that creates an interactive approval handler for use with the YAAF permission system. It is designed for command-line applications where an agent requires manual user intervention before executing specific tools.

When a `PermissionPolicy` encounters a tool call that matches a `requireApproval` rule, it invokes the handler returned by `cliApproval`. This handler pauses execution, displays the tool name, its arguments, and the reason for the request in the terminal, and waits for the user to confirm (typically via a [y/N] prompt) before proceeding.

## Signature / Constructor

```typescript
export function cliApproval(): ApprovalHandler;
```

### Related Types

The function returns an `ApprovalHandler`, which adheres to the following signature:

```typescript
export type ApprovalHandler = (
  toolName: string,
  args: Record<string, unknown>,
  reason: string,
) => Promise<boolean> | boolean;
```

## Examples

### Basic Usage with PermissionPolicy
This example demonstrates how to attach the CLI approval handler to a policy that requires confirmation for shell commands.

```typescript
import { PermissionPolicy, cliApproval, Agent } from 'yaaf';

const policy = new PermissionPolicy()
  // Allow read operations without prompting
  .allow('read_*')
  // Require manual confirmation for shell execution
  .requireApproval('exec', 'Shell commands need approval')
  // Attach the CLI handler
  .onRequest(cliApproval());

const agent = new Agent({
  permissions: policy,
  systemPrompt: 'You are a helpful assistant.',
  tools: [...],
});
```

### Integration with secureCLIPolicy
`cliApproval` is frequently used in conjunction with `secureCLIPolicy` to create a protected environment for CLI-based agents.

```typescript
import { secureCLIPolicy, cliApproval } from 'yaaf';

const policy = secureCLIPolicy()
  .allow('read_*')
  .onRequest(cliApproval());
```

## See Also
- `PermissionPolicy`
- `secureCLIPolicy`
- `isDangerousCommand`