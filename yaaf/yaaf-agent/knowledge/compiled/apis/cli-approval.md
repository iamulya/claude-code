---
title: cliApproval
entity_type: api
summary: Provides an interactive command-line approval handler for permission requests.
export_name: cliApproval
source_file: src/permissions.ts
category: function
search_terms:
 - command line approval
 - interactive permissions
 - user confirmation for tools
 - how to approve tool calls
 - PermissionPolicy handler
 - terminal prompt for agent
 - Y/N confirmation
 - onRequest handler
 - secure agent execution
 - prevent dangerous commands
 - CLI agent security
 - TTY guard
 - non-interactive environment error
stub: false
compiled_at: 2026-04-24T16:55:27.152Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `cliApproval` function is a factory that returns a pre-built `ApprovalHandler`. This handler is designed for interactive command-line applications where an agent needs to ask a human user for permission before executing a potentially sensitive tool call [Source 2, Source 4].

[when](./when.md) a tool call is escalated for approval by a `PermissionPolicy`, this handler prompts the user in the terminal, showing the tool name, its arguments, and the reason for the approval request. The user can then approve or deny the action by typing a response (e.g., 'y' or 'n') [Source 4].

This handler is intended for development environments and [CLI](../subsystems/cli.md) [Tools](../subsystems/tools.md). It includes a "TTY guard" that will throw a descriptive error if the process's standard input or output is not an interactive terminal (e.g., when running in a server, container, or CI environment). In such non-interactive contexts, a custom `ApprovalHandler` (e.g., one that sends a Slack message) should be used instead [Source 2, Source 4].

## Signature

`cliApproval` is a function that returns an `ApprovalHandler`.

```typescript
export function cliApproval(policy?: PermissionPolicy): ApprovalHandler;
```

**Parameters:**

*   `policy` (optional): A `PermissionPolicy` instance. If provided, the handler will automatically remember "always allow" and "always deny" responses for specific tools, preventing repeated prompts for the same tool during a session [Source 4].

**Returns:**

*   An `ApprovalHandler` function with the following signature [Source 4]:

```typescript
export type ApprovalHandler = (
  toolName: string,
  args: Record<string, unknown>,
  reason: string,
) => Promise<boolean> | boolean;
```

The returned handler, when invoked by the `PermissionPolicy`, will return `true` if the user approves the action and `false` if they deny it.

## Examples

The most common use case is to attach `cliApproval` to a `PermissionPolicy` to handle any rules that use `.requireApproval()`.

```typescript
import { Agent, PermissionPolicy, cliApproval, buildTool } from 'yaaf';

// Define some tools
const readFileTool = buildTool({
  name: 'read_file',
  description: 'Reads a file from disk',
  // ... implementation
});

const writeFileTool = buildTool({
  name: 'write_file',
  description: 'Writes content to a file',
  // ... implementation
});

const execTool = buildTool({
  name: 'exec',
  description: 'Executes a shell command',
  // ... implementation
});

// Create a permission policy
const policy = new PermissionPolicy()
  // Allow all read operations without asking
  .allow('read_*')
  // Require interactive approval for file writes
  .requireApproval('write_file', 'File writes require confirmation')
  // Require interactive approval for any shell command
  .requireApproval('exec', 'Shell commands need approval')
  // Set cliApproval as the handler for all approval requests
  .onRequest(cliApproval());

// Create an agent with the policy
const agent = new Agent({
  model: 'gpt-4o',
  tools: [readFileTool, writeFileTool, execTool],
  permissions: policy,
});

// When the agent tries to call writeFileTool or exec,
// the user will be prompted in their terminal.
await agent.run('Write a summary of main.ts to summary.txt');
```

When the agent attempts to call `writeFileTool`, the `cliApproval` handler will display a prompt in the console similar to the following:

```bash
Allow write_file? (File writes require confirmation) [y/N] y
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts