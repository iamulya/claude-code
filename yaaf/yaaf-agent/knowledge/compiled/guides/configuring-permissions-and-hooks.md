---
title: Configuring Permissions and Hooks
entity_type: guide
summary: A guide on how to implement tool access controls, interactive approval workflows, and execution sandboxes to secure YAAF agents.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:10:06.254Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
confidence: 1
---

## Overview
Securing LLM-powered agents requires a multi-layered approach to control tool access, monitor execution cycles, and isolate the runtime environment. This guide demonstrates how to use the YAAF security suite—comprising `PermissionPolicy`, `Hooks`, and `Sandbox`—to build production-grade, safe agents.

## Prerequisites
- A basic understanding of YAAF agent initialization.
- Familiarity with TypeScript and asynchronous programming.

## Step-by-Step

### 1. Defining a Permission Policy
The `PermissionPolicy` class controls which tools an agent can invoke. It supports glob-based matching and three primary rule types: `allow`, `deny`, and `requireApproval`.

```typescript
import { PermissionPolicy, cliApproval, Agent } from 'yaaf';

const policy = new PermissionPolicy()
  // Allow all read operations using glob patterns
  .allow('read_*')
  .allow('search_*')

  // Require interactive approval for sensitive operations
  .requireApproval('write_*', 'File writes require confirmation')
  .requireApproval('exec', 'Shell commands need approval')

  // Explicitly block dangerous operations
  .deny('delete_*', 'Deletion is disabled by policy')
  .deny('drop_database', 'Database drops are permanently blocked')

  // Attach an approval handler (e.g., CLI-based)
  .onRequest(cliApproval());

const agent = new Agent({
  permissions: policy,
  tools: [...],
  systemPrompt: '...',
});
```

### 2. Implementing Custom Approval Handlers
While `cliApproval()` is useful for local development, production environments often require remote approvals (e.g., via Slack or a web dashboard).

```typescript
policy.onRequest(async (toolName, args, reason) => {
  // Example: Sending a notification to a third-party service
  await slack.send(`🔐 ${toolName} needs approval: ${reason}`);
  
  // Wait for a response with a timeout
  const response = await slack.waitForReaction(300_000); // 5 minute timeout
  return response === 'thumbsup';
});
```

### 3. Intercepting Execution with Hooks
Hooks allow developers to intercept the agent's lifecycle at four key points. Each hook must return an action object to determine how the agent proceeds.

```typescript
const hooks = {
  // Before the LLM is called
  beforeLLM: async (ctx) => {
    console.log(`Turn ${ctx.turnNumber}: Processing ${ctx.messages.length} messages`);
    return { action: 'continue' };
  },

  // After the LLM returns a response
  afterLLM: async (ctx, result) => {
    // Example: Cost Guard pattern
    if (result.usage?.totalTokens > 100000) {
      return { action: 'block', reason: 'Token budget exceeded' };
    }
    return { action: 'continue' };
  },

  // Before a tool is executed
  beforeToolCall: async (ctx) => {
    // Example: Simple command filtering
    if (ctx.toolName === 'exec' && ctx.arguments.cmd?.includes('rm')) {
      return { action: 'block', reason: 'rm commands are strictly prohibited' };
    }
    return { action: 'continue' };
  },

  // After a tool execution completes
  afterToolCall: async (ctx, result, error) => {
    // Example: Audit logging
    await auditLog.append({
      tool: ctx.toolName,
      success: !error,
      duration: ctx.durationMs
    });
    return { action: 'continue' };
  },
};

const agent = new Agent({ hooks, ... });
```

### 4. Configuring the Execution Sandbox
The `Sandbox` restricts the agent's ability to interact with the host file system and network.

```typescript
import { Sandbox, projectSandbox, strictSandbox } from 'yaaf';

// Custom Sandbox configuration
const sandbox = new Sandbox({
  timeoutMs: 15_000,
  allowedPaths: [process.cwd(), '/tmp'],
  blockedPaths: ['/etc', '/usr', process.env.HOME!],
  blockNetwork: false,
});

// Or use pre-defined factories
const dev = projectSandbox(); // Allows CWD and /tmp
const strict = strictSandbox(); // CWD only, no network access
```

## Configuration Reference

### PermissionPolicy Rule Priority
Rules are evaluated in the following order of precedence:
1.  **Deny**: If a tool matches a deny rule, it is blocked immediately.
2.  **RequireApproval**: If no deny rule matches, but an approval rule does, the user is prompted.
3.  **Allow**: If no higher-priority rule matches, the tool is allowed if it matches an allow rule.
4.  **Default Deny**: Any tool not matching an explicit rule is blocked by default.

### Hook Return Actions
| Action | Description |
| :--- | :--- |
| `{ action: 'continue' }` | Proceed with the execution normally. |
| `{ action: 'block', reason: string }` | Stop the operation and return the reason to the agent. |
| `{ action: 'inject', message: string }` | Add a specific message to the conversation and continue. |
| `{ action: 'retry' }` | Attempt the operation again. |

### Sandbox Options
| Option | Type | Description |
| :--- | :--- | :--- |
| `timeoutMs` | `number` | Maximum execution time for tool calls. |
| `allowedPaths` | `string[]` | List of directories the agent can read/write. |
| `blockedPaths` | `string[]` | List of directories explicitly forbidden. |
| `blockNetwork` | `boolean` | Whether to disable all network egress. |

## Common Mistakes
*   **Rule Ordering**: Forgetting that `deny` takes priority over `allow`. If you `deny('*')` and then `allow('read_file')`, the tool will still be denied.
*   **Missing Approval Handlers**: Defining a `requireApproval` rule without attaching an `onRequest` handler will cause the agent to hang or fail when that tool is called.
*   **Hook Return Values**: Failing to return an action object (e.g., `{ action: 'continue' }`) from a hook, which may lead to undefined behavior in the agent execution loop.
*   **Sandbox Path Overlap**: Overlapping `allowedPaths` and `blockedPaths`. Always ensure `blockedPaths` contains the more specific sensitive directories.

## Next Steps
*   Explore advanced tool implementation to see how permissions apply to custom tools.
*   Implement an audit logging system using the `tool:blocked` and `tool:sandbox-violation` events.
*   Integrate external secret management for use within hooks.

## Sources
- Source 1: Permissions & Hooks (yaaf/knowledge/raw/docs/permissions.md)