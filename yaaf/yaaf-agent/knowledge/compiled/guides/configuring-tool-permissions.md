---
title: Configuring Tool Permissions
entity_type: guide
summary: How to secure your agent by defining allow/deny rules and setting up interactive user approval workflows.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:31:57.430Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/permissions.ts
confidence: 0.9
---

## Overview
YAAF provides a policy-based permission system to authorize tool calls before they are executed. This system acts as a security layer between the LLM's intent and the actual execution of code or API calls. By configuring a `PermissionPolicy`, developers can define which tools are safe to run automatically, which must be blocked, and which require explicit human-in-the-loop approval.

## Step-by-Step

### 1. Initialize a Permission Policy
To begin, create a new instance of the `PermissionPolicy` class. This object will hold the rules for tool execution.

```typescript
import { PermissionPolicy } from 'yaaf';

const policy = new PermissionPolicy();
```

### 2. Define Authorization Rules
Rules are evaluated based on tool names and, optionally, their arguments. You can use glob-style patterns for matching.

*   **Allow**: Permits the tool to run without intervention.
*   **Deny**: Blocks the tool and returns an error to the agent.
*   **Require Approval**: Pauses execution and triggers a callback for user confirmation.

```typescript
policy
  .allow('search_*')           // Allow any tool starting with "search_"
  .allow('check_weather')      // Allow specific tool
  .deny('delete_*', 'Deletion is not permitted') // Block destructive tools
  .requireApproval('book_trip', 'Booking requires your confirmation');
```

### 3. Implement an Approval Handler
If any rules use `.requireApproval()`, you must provide an `onRequest` handler. This function receives the tool name, the arguments, and the reason for the request. It must return a boolean (or a Promise resolving to a boolean).

For development or CLI-based agents, YAAF provides a built-in `cliApproval()` helper.

```typescript
import { cliApproval } from 'yaaf';

// Using the built-in CLI prompt
policy.onRequest(cliApproval());

// OR implementing a custom handler (e.g., for a web UI)
policy.onRequest(async (toolName, args, reason) => {
  console.log(`Agent wants to use ${toolName} because: ${reason}`);
  // Logic to show a modal to the user
  const userConfirmed = await showUiModal(toolName, args);
  return userConfirmed;
});
```

### 4. Apply the Policy to an Agent
Pass the configured policy into the `Agent` constructor.

```typescript
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  permissions: policy,
  tools: [/* ... */]
});
```

### 5. Advanced: Content-Aware Blocking
For tools that execute shell commands or code, you can use the `isDangerousCommand` predicate to block specific patterns (like `rm -rf` or `sudo`) while allowing safer commands.

```typescript
import { isDangerousCommand } from 'yaaf';

policy.deny('exec_command', 'Dangerous command detected', {
  when: isDangerousCommand(),
});
```

## Configuration Reference

### Rule Patterns
The permission system supports the following string patterns for matching tool calls:

| Pattern | Description |
| :--- | :--- |
| `tool_name` | Matches a specific tool name exactly. |
| `tool_name(*)` | Matches any call to the specified tool. |
| `tool_name(pattern)` | Matches if the tool's serialized JSON arguments include the pattern. |
| `prefix_*` | Glob matching for any tool starting with the prefix. |

### Pre-built Policies
YAAF includes `secureCLIPolicy()` for rapid setup of command-line agents. This policy:
*   Blocks dangerous shell patterns.
*   Requires approval for all execution/shell commands.
*   Allows read-only operations by default.

```typescript
const policy = secureCLIPolicy()
  .allow('read_*') 
  .onRequest(cliApproval());
```

### Dangerous Patterns
The `DANGEROUS_PATTERNS` constant contains a list of regular expressions used by `isDangerousCommand`. These include:
*   Recursive deletions (`rm -rf`) on sensitive directories.
*   Broad permission changes (`chmod 777`).
*   Privilege escalation (`sudo`).
*   Download-and-execute pipes (`curl ... | bash`).
*   Raw disk writes and filesystem formatting.

## Common Mistakes

1.  **Missing Approval Handler**: Defining a rule with `.requireApproval()` without providing an `.onRequest()` handler will cause the agent to hang or error when that tool is called.
2.  **Overly Broad Globs**: Using a pattern like `*` in an `.allow()` rule bypasses the security benefits of the permission system.
3.  **Argument Matching Sensitivity**: When using `tool_name(pattern)`, remember that the pattern matches against the serialized JSON string of the arguments. Ensure your patterns account for JSON formatting (like quotes around strings).

## Sources
*   `src/permissions.ts`