---
export_name: PermissionPolicy
source_file: src/permissions.ts
category: class
title: PermissionPolicy
entity_type: api
summary: A class for defining and enforcing access control rules for agent tool usage, supporting allow/deny lists and interactive approvals.
stub: false
compiled_at: 2026-04-16T14:04:58.090Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/doctor.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/security.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/permissions.ts
confidence: 1
---

## Overview
`PermissionPolicy` is the primary mechanism in YAAF for controlling which tools an agent is authorized to execute. It provides a chainable API to define access rules based on tool names and argument patterns. By default, YAAF adopts a "secure by default" posture where all tool calls are denied unless explicitly permitted by a policy.

The policy supports three levels of control:
1.  **Allow**: The tool executes immediately.
2.  **Deny**: The tool execution is blocked, and an error is returned to the agent.
3.  **Require Approval**: The execution is paused until a user or external system grants permission via an `ApprovalHandler`.

## Signature / Constructor

```typescript
export class PermissionPolicy {
  constructor();
}
```

### Rule Priority
When evaluating a tool call, rules are processed in the following order of precedence:
**Deny > Require Approval > Allow > Default Deny**

A specific `allow` rule can override a general `deny` rule if it is more specific or defined later in the chain, though the framework generally prioritizes safety.

## Methods & Properties

### `.allow(pattern, options?)`
Permits tool calls matching the specified pattern.
*   **pattern**: A glob-style string (e.g., `read_*`) or exact tool name.
*   **options**: Optional configuration for content-aware filtering.

### `.deny(pattern, reason?, options?)`
Explicitly blocks tool calls matching the pattern.
*   **pattern**: A glob-style string or exact tool name.
*   **reason**: A string describing why the tool is blocked, which may be surfaced to the agent or in logs.
*   **options**: Can include a `when` predicate for dynamic blocking (e.g., checking for dangerous shell commands).

### `.requireApproval(pattern, reason?)`
Escalates the tool call to the registered approval handler.
*   **pattern**: A glob-style string or exact tool name.
*   **reason**: A description of why confirmation is required.

### `.onRequest(handler)`
Registers the callback used when a tool call matches a `requireApproval` rule.
*   **handler**: An `ApprovalHandler` function.
*   **Signature**: `(toolName: string, args: Record<string, unknown>, reason: string) => Promise<boolean> | boolean`

## Events
While `PermissionPolicy` itself does not emit events, the `Agent` using the policy emits the following events based on policy evaluations:

| Event | Payload | Description |
|-------|---------|-------------|
| `tool:blocked` | `{ name: string, reason: string }` | Emitted when a tool call is blocked by a `deny` rule or a rejected approval. |
| `tool:sandbox-violation` | `{ name: string, violationType: string, detail: string }` | Emitted when a tool attempts to access restricted resources defined in the sandbox. |

## Examples

### Basic Policy Configuration
```typescript
import { PermissionPolicy, cliApproval, Agent } from 'yaaf';

const policy = new PermissionPolicy()
  // Allow all read operations
  .allow('read_*')
  .allow('search_code')

  // Require interactive approval for writes and execution
  .requireApproval('write_file', 'Agent wants to modify source code')
  .requireApproval('exec', 'Shell commands require manual review')

  // Permanently block dangerous tools
  .deny('delete_database', 'Database deletion is strictly prohibited')
  
  // Use the built-in CLI prompter for approvals
  .onRequest(cliApproval());

const agent = new Agent({
  permissions: policy,
  // ... other config
});
```

### Glob Pattern Matching
The policy supports flexible matching for tool names and arguments:

| Pattern | Matches |
|---------|---------|
| `read_*` | `read_file`, `read_dir`, `read_config` |
| `*_database` | `query_database`, `drop_database` |
| `exec` | Only the exact tool named `exec` |
| `*` | Matches every tool (use with caution) |

### Custom Approval Handler (Slack Integration)
```typescript
policy.onRequest(async (toolName, args, reason) => {
  // Send a message to a Slack channel
  await slack.send(`🔐 ${toolName} needs approval: ${reason}\nArgs: ${JSON.stringify(args)}`);
  
  // Wait for a reaction (thumbs up to approve)
  const response = await slack.waitForReaction(300_000); // 5-minute timeout
  return response === 'thumbsup';
});
```

### Content-Aware Blocking
Using `isDangerousCommand` to block specific shell patterns within a tool call:
```typescript
import { PermissionPolicy, isDangerousCommand } from 'yaaf';

const policy = new PermissionPolicy()
  .deny('exec', 'Dangerous command detected', {
    when: isDangerousCommand()
  });
```

## See Also
- `Agent`
- `cliApproval`
- `secureCLIPolicy`
- `isDangerousCommand`
- `Sandbox`