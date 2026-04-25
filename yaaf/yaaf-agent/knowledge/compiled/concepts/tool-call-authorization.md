---
summary: The process of intercepting and deciding whether to allow, deny, or escalate an agent's tool call based on defined policies.
title: Tool Call Authorization
entity_type: concept
related_subsystems:
 - "[Permission System](../subsystems/permission-system.md)"
see_also:
 - "[PermissionPolicy](../apis/permission-policy.md)"
 - "[ApprovalHandler](../apis/approval-handler.md)"
 - "[Authorization](./authorization.md)"
search_terms:
 - tool permissions
 - agent security policy
 - allow or deny tool calls
 - how to approve agent actions
 - dangerous command detection
 - secure agent configuration
 - glob pattern matching for tools
 - escalate tool call for approval
 - prevent agent from deleting files
 - cliApproval function
 - content-aware tool blocking
 - agent action confirmation
stub: false
compiled_at: 2026-04-25T00:25:32.530Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Tool Call Authorization is the security process in YAAF for deciding whether an agent is permitted to execute a specific [tool call](./tool-calls.md) with a given set of arguments. It acts as a gatekeeper, intercepting every tool execution request before it runs [Source 1]. This mechanism is a critical part of [defense-in-depth](./defense-in-depth.md), preventing agents from performing unintended, destructive, or unauthorized actions.

Based on a set of configured rules, the [Permission System](../subsystems/permission-system.md) makes one of three decisions for each tool call [Source 1]:
1.  **Allow**: The tool call proceeds without interruption.
2.  **Deny**: The tool call is blocked, and an error is typically returned to the agent.
3.  **Escalate**: The decision is passed to an external handler, such as a human user or another system, for manual approval.

## How It Works in YAAF

This process is managed by the [Permission System](../subsystems/permission-system.md) subsystem and configured primarily through the [PermissionPolicy](../apis/permission-policy.md) API. A developer defines a policy and attaches it to an agent during initialization [Source 1].

When an agent attempts to use a tool, the framework intercepts the call and evaluates it against the rules in the active [PermissionPolicy](../apis/permission-policy.md). Rules are processed in the order they are defined, and the first matching rule determines the outcome.

### Rule Definition and Matching

Rules are defined using methods on a `PermissionPolicy` instance, such as `.allow()`, `.deny()`, and `.requireApproval()`. These rules match tool calls based on the tool's name and, optionally, its arguments [Source 1].

-   **Name Matching**: Rules can match an exact tool name (e.g., `check_weather`) or use glob-style patterns to match a family of tools (e.g., `read_*`).
-   **Argument Matching**: A rule can be made more specific by including a pattern that must be present in the JSON-serialized arguments (e.g., `book_trip(pattern)`).
-   **Conditional Predicates**: Rules can be associated with a `when` predicate function that performs content-aware checks on the tool's arguments. This allows for more sophisticated logic, such as blocking commands that contain dangerous shell patterns [Source 1].

### Escalation and Approval

If a tool call matches a `.requireApproval()` rule, the policy invokes a configured [ApprovalHandler](../apis/approval-handler.md). An [ApprovalHandler](../apis/approval-handler.md) is a function that receives the tool name, arguments, and a reason for the escalation. It must return a boolean value indicating whether to approve (`true`) or deny (`false`) the request [Source 1].

YAAF provides a built-in `cliApproval` handler suitable for development and interactive command-line applications. This handler prompts the user directly in the terminal for a decision. It includes a TTY guard that throws an error if used in a non-interactive environment (like a server or CI/CD pipeline), preventing the application from hanging while waiting for input that can never be provided [Source 1].

### Security Presets

To simplify secure configuration, YAAF includes pre-built components for common security concerns:

-   **`DANGEROUS_PATTERNS`**: A list of regular expressions that identify potentially destructive shell commands, such as `rm -rf /`, `sudo`, and `curl | bash` [Source 1].
-   **`isDangerousCommand()`**: A predicate function that uses these patterns to check tool arguments. It is designed to be used with a `.deny()` rule and intelligently checks common argument keys where shell code might be passed (e.g., `command`, `script`, `code`, `payload`) [Source 1].
-   **`secureCLIPolicy()`**: A pre-built [PermissionPolicy](../apis/permission-policy.md) that blocks dangerous shell patterns by default, requires approval for all other shell execution commands, and allows common read-only operations [Source 1].

## Configuration

A `PermissionPolicy` is configured and passed to an agent's constructor.

The following example demonstrates a custom policy that allows searching, denies deletion, and requires user approval for booking a trip.

```typescript
import { Agent } from '@yaaf/agent';
import { PermissionPolicy, cliApproval } from '@yaaf/agent';
import * as readline from 'node:readline/promises';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  permissions: new PermissionPolicy()
    .allow('search_*')
    .allow('check_weather')
    .requireApproval('book_trip', 'Booking requires your confirmation')
    .deny('delete_*', 'Deletion is not permitted')
    .onRequest(async (toolName, args, reason) => {
      // Custom approval handler
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(`Allow ${toolName} (${reason})? [y/N] `);
      rl.close();
      return answer.toLowerCase() === 'y';
    }),
});
```
[Source 1]

This example shows how to use the pre-built `secureCLIPolicy` and the `isDangerousCommand` predicate for enhanced security.

```typescript
import { Agent } from '@yaaf/agent';
import { secureCLIPolicy, isDangerousCommand, cliApproval } from '@yaaf/agent';

// Start with a secure base policy
const policy = secureCLIPolicy();

// Customize the policy: allow all read-only tools without approval
policy.allow('read_*');

// Deny a specific command based on its content
policy.deny('exec_command', 'Dangerous command detected', {
  when: isDangerousCommand(),
});

// Set up the approval handler for any rules that require it
policy.onRequest(cliApproval(policy));

const agent = new Agent({
  systemPrompt: 'You are a command-line assistant.',
  permissions: policy,
});
```
[Source 1]

## See Also

-   [Permission System](../subsystems/permission-system.md): The subsystem that implements tool call authorization.
-   [PermissionPolicy](../apis/permission-policy.md): The primary API for defining authorization rules.
-   [ApprovalHandler](../apis/approval-handler.md): The API for implementing custom approval logic.
-   [Authorization](./authorization.md): The broader security concept of granting or denying access.

## Sources

[Source 1]: src/permissions.ts