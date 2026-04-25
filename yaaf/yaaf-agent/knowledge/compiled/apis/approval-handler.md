---
summary: A type definition for a function that handles tool call approval requests.
export_name: ApprovalHandler
source_file: src/permissions.ts
category: type
title: ApprovalHandler
entity_type: api
search_terms:
 - tool call approval
 - user confirmation for tools
 - how to ask for permission
 - permission handler function
 - manual tool authorization
 - onRequest callback type
 - asynchronous permission check
 - PermissionPolicy handler
 - implementing custom approval logic
 - agent tool security
 - interactive tool execution
 - cliApproval function
stub: false
compiled_at: 2026-04-24T16:48:57.969Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ApprovalHandler` is a TypeScript type definition for a function responsible for handling [Tool Calls](../concepts/tool-calls.md) that require manual approval. It is a core part of the YAAF [Permission System](../subsystems/permission-system.md) [Source 1].

[when](./when.md) a `PermissionPolicy` encounters a tool call matching a `requireApproval` rule, it invokes the registered `ApprovalHandler`. This function's role is to decide whether to permit or deny the specific tool call, typically by escalating the decision to a human user or another [Authorization System](../subsystems/authorization-system.md). The handler receives the context of the tool call—its name, arguments, and the reason for the approval request—and must return a boolean value indicating the outcome [Source 1].

This mechanism allows for flexible and interactive security models, such as prompting a user in a command-line interface, showing a confirmation dialog in a web UI, or querying an external permissions service.

## Signature

The `ApprovalHandler` is a function type that can be either synchronous or asynchronous [Source 1].

```typescript
export type ApprovalHandler = (
  toolName: string,
  args: Record<string, unknown>,
  reason: string,
) => Promise<boolean> | boolean;
```

**Parameters:**

*   `toolName` (`string`): The name of the tool that requires approval.
*   `args` (`Record<string, unknown>`): The arguments object that was passed to the tool.
*   `reason` (`string`): The descriptive reason provided when the `requireApproval` rule was defined in the `PermissionPolicy`.

**Returns:**

*   `Promise<boolean> | boolean`: A boolean value indicating the decision.
    *   `true`: The tool call is approved and will be executed.
    *   `false`: The tool call is denied and will be blocked.

## Examples

### Custom [CLI](../subsystems/cli.md) Approval Handler

This example demonstrates creating a custom `ApprovalHandler` to prompt the user for confirmation in a Node.js command-line application.

```typescript
import { Agent, PermissionPolicy, ApprovalHandler } from 'yaaf';
import * as readline from 'node:readline/promises';

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Define a custom approval handler function
const customApprovalHandler: ApprovalHandler = async (toolName, args, reason) => {
  console.log(`Approval Required: ${reason}`);
  const answer = await rl.question(
    `Allow agent to execute tool '${toolName}'? [y/N] `
  );
  rl.close();
  return answer.toLowerCase() === 'y';
};

// Configure the policy to use the handler
const policy = new PermissionPolicy()
  .requireApproval('book_trip', 'Booking a trip requires your confirmation.')
  .onRequest(customApprovalHandler);

const agent = new Agent({
  systemPrompt: 'You are a helpful travel assistant.',
  // ... other agent configuration
  permissions: policy,
});
```

### Using the Built-in `cliApproval`

YAAF provides a pre-built `cliApproval` function that returns a ready-to-use `ApprovalHandler` for interactive terminal sessions.

```typescript
import { Agent, PermissionPolicy, cliApproval } from 'yaaf';

// Use the built-in cliApproval helper as the handler
const policy = new PermissionPolicy()
  .requireApproval('exec_command', 'Executing shell commands requires approval.')
  .onRequest(cliApproval());

const agent = new Agent({
  systemPrompt: 'You are a helpful command-line assistant.',
  // ... other agent configuration
  permissions: policy,
});
```

## See Also

*   `PermissionPolicy`: The class that configures and uses the `ApprovalHandler`.
*   `cliApproval`: A factory function that returns a pre-configured `ApprovalHandler` for command-line interfaces.

## Sources

[Source 1]: src/permissions.ts