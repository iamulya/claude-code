---
title: PermissionPolicy
entity_type: api
summary: Controls which tools agents can use with glob-based rules and interactive approval.
export_name: PermissionPolicy
source_file: src/permissions.ts
category: class
search_terms:
 - tool permissions
 - agent security policy
 - allow or deny tools
 - glob-based tool rules
 - interactive tool approval
 - how to block dangerous commands
 - agent guardrails
 - tool call authorization
 - secure agent configuration
 - cliApproval
 - onRequest handler
 - isDangerousCommand
 - secureCLIPolicy
 - prevent agent from deleting files
stub: false
compiled_at: 2026-04-24T17:27:56.837Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `PermissionPolicy` class provides a rule-based system for authorizing [Tool Calls](../concepts/tool-calls.md) made by an agent. It intercepts every tool call and decides whether to allow it, deny it, or escalate to a user for manual approval. This is a critical security feature for preventing unintended or malicious actions by an [LLM](../concepts/llm.md)-powered agent [Source 4].

Policies are built by chaining `allow`, `deny`, and `requireApproval` methods, which use glob-style patterns to match tool names. An `onRequest` handler must be provided to manage tool calls that require approval [Source 2].

The policy is evaluated with a strict priority order: **deny > requireApproval > allow**. If no rule matches, the default behavior is to deny the tool call [Source 2, 3]. A `PermissionPolicy` instance is passed to the `Agent` constructor to be activated [Source 2].

## Constructor

The `PermissionPolicy` is instantiated with no arguments. Rules are added via its chainable methods [Source 2].

```typescript
import { PermissionPolicy } from 'yaaf';

const policy = new PermissionPolicy();
```

## Methods & Properties

`PermissionPolicy` instances have the following chainable methods for building rules:

### .allow()

Allows a tool call if its name matches the provided glob pattern [Source 2].

**Signature**
```typescript
.allow(toolPattern: string): this
```

### .deny()

Denies a tool call if its name matches the provided glob pattern. A reason for the denial can be provided. `deny` rules have the highest priority [Source 2].

**Signature**
```typescript
.deny(toolPattern: string, reason?: string, options?: { [[[[[[[[when]]]]]]]]: (toolName: string, args: Record<string, unknown>) => boolean }): this
```
The optional `when` predicate allows for content-aware blocking, for example, by inspecting the tool's arguments [Source 4].

### .requireApproval()

Flags a tool call for manual approval if its name matches the provided glob pattern. The `onRequest` handler will be invoked to resolve the request [Source 2].

**Signature**
```typescript
.requireApproval(toolPattern: string, reason: string): this
```

### .onRequest()

Sets the handler function that is executed when a tool call requires approval. This handler must return a boolean or a promise that resolves to a boolean, indicating whether the tool call is approved (`true`) or denied (`false`) [Source 2, 4].

**Signature**
```typescript
.onRequest(handler: [[[[[[[[ApprovalHandler]]]]]]]]): this
```

**ApprovalHandler Type**
```typescript
export type ApprovalHandler = (
  toolName: string,
  args: Record<string, unknown>,
  reason: string,
) => Promise<boolean> | boolean;
```

## Events

When a `PermissionPolicy` is active on an agent, the agent instance will emit events related to its decisions.

### tool:blocked

Emitted when a tool call is denied by the policy, either by a `deny` rule or a rejected approval request [Source 1, 2].

**Payload**
```typescript
{
  name: string;   // The name of the blocked tool
  reason: string; // The reason for the block
}
```

### tool:sandbox-violation

While not directly emitted by `PermissionPolicy`, this event is part of the broader [Security System](../subsystems/security-system.md) and is often monitored alongside permission events. It is emitted when a tool attempts an action that violates the configured `Sandbox` rules [Source 1, 2, 3].

**Payload**
```typescript
{
  name: string;
  violationType: 'path' | 'network' | 'timeout';
  detail: string;
}
```

## Examples

### Basic Policy

This example allows read and search operations, requires interactive approval for writes, and denies all deletion [Tools](../subsystems/tools.md). The `cliApproval` helper is used for handling approval requests in the terminal [Source 2].

```typescript
import { PermissionPolicy, cliApproval, Agent } from 'yaaf';

const policy = new PermissionPolicy()
  // Allow all read and search operations
  .allow('read_*')
  .allow('search_*')

  // Require interactive approval for any write operations
  .requireApproval('write_*', 'File writes require confirmation')

  // Explicitly block dangerous operations
  .deny('delete_*', 'Deletion is disabled by policy')

  // Use the built-in terminal prompter for approval requests
  .onRequest(cliApproval());

const agent = new Agent({
  permissions: policy,
  // ... other agent config
});
```

### Rule Priority

Rules are evaluated in order of `deny`, `requireApproval`, then `allow`. A more specific `allow` rule does not override a more general `deny` rule [Source 2].

```typescript
const policy = new PermissionPolicy()
  .deny('exec_*')                    // 1. Deny all exec tools
  .allow('exec_lint')                // 3. This rule is ignored for exec_lint
  .requireApproval('exec_test', '...');// 2. This rule is ignored for exec_test

// Resulting behavior:
// agent.run('exec_lint')    -> Denied (matches deny('exec_*'))
// agent.run('exec_test')    -> Denied (matches deny('exec_*'))
// agent.run('exec_deploy')  -> Denied (matches deny('exec_*'))
```

### Custom Approval Handler

Instead of `cliApproval`, a custom asynchronous handler can be provided, for example, to send a message to Slack and wait for a reaction [Source 2].

```typescript
import { PermissionPolicy } from 'yaaf';
import { slack } from './my-slack-client';

const policy = new PermissionPolicy()
  .requireApproval('deploy_to_production', 'Production deploys require manager approval.')
  .onRequest(async (toolName, args, reason) => {
    const message = `🔐 Approval needed for tool: *${toolName}*\nReason: ${reason}\nArgs: \`\`\`${JSON.stringify(args, null, 2)}\`\`\``;
    const messageId = await slack.send(message);
    
    // Wait up to 5 minutes for a 'thumbsup' reaction
    const response = await slack.waitForReaction(messageId, 300_000); 
    
    return response === 'thumbsup';
  });
```

### Content-Aware Blocking

The `deny` method can accept a `when` predicate to inspect tool arguments and block calls based on their content. The `[[[[[[[[isDangerousCommand]]]]]]]]` helper can be used to check for common shell injection and destructive command patterns [Source 4].

```typescript
import { PermissionPolicy, isDangerousCommand } from 'yaaf';

const policy = new PermissionPolicy()
  .allow('exec') // Allow the 'exec' tool in general...
  .deny('exec', 'Dangerous command detected', { // ...but deny it if the command is dangerous
    when: isDangerousCommand(),
  });
```

## See Also

*   **cliApproval**: A helper function that creates an `ApprovalHandler` for interactive command-line prompts [Source 4].
*   **secure[CLI](../subsystems/cli.md)Policy**: A factory function that returns a pre-configured `PermissionPolicy` with secure defaults for CLI agents, including blocking dangerous commands [Source 4].
*   **isDangerousCommand**: A predicate function for use with `.deny()` that checks tool arguments against a list of dangerous shell patterns [Source 4].
*   **Agent**: The main class for creating agents, where a `PermissionPolicy` is configured.
*   **Sandbox**: A related security feature for restricting file system and network access [Source 2, 3].
*   **Hooks**: Another mechanism for intercepting agent execution at various lifecycle points [Source 2].

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts