---
title: Permission System
entity_type: subsystem
summary: A policy-based authorization subsystem that intercepts tool calls to enforce security rules and manage user approvals.
primary_files:
  - src/permissions.ts
exports:
  - PermissionPolicy
  - cliApproval
  - isDangerousCommand
  - secureCLIPolicy
  - PermissionOutcome
  - ApprovalHandler
  - DANGEROUS_PATTERNS
stub: false
compiled_at: 2026-04-16T14:31:42.802Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/permissions.ts
confidence: 1
---

## Purpose
The Permission System provides a security layer for LLM-powered agents by intercepting tool calls before execution. It ensures that agents operate within defined safety boundaries by evaluating every requested tool call against a set of policies. This subsystem solves the problem of "agentic wandering" and unauthorized execution of destructive actions by providing a mechanism to allow, deny, or escalate tool calls for manual human approval.

## Architecture
The subsystem is built around a policy-based evaluation engine. It uses pattern matching and predicates to determine the outcome of a tool request.

### PermissionPolicy
The `PermissionPolicy` class is the central coordinator. It maintains an internal list of rules that are evaluated in sequence. Rules can be defined using glob-style patterns for tool names and can optionally inspect the serialized arguments of a tool call.

### Rule Matching Logic
Rules support several matching formats:
*   **Exact Match**: `tool_name` matches a specific tool.
*   **Glob Match**: `read_*` matches any tool starting with the prefix "read_".
*   **Argument Match**: `tool_name(pattern)` matches if the tool name matches and the JSON-serialized arguments contain the specified pattern.
*   **Wildcard**: `tool_name(*)` is functionally equivalent to an exact match on the tool name.

### Outcomes and Escalation
When a tool call is intercepted, the system produces a `PermissionOutcome`. If a rule triggers a `requireApproval` action, the system invokes a registered `ApprovalHandler`. This handler is an asynchronous function that returns a boolean indicating whether the execution should proceed.

## Key APIs

### PermissionPolicy
The primary class used to define security rules.
*   `allow(pattern)`: Grants immediate permission for tools matching the pattern.
*   `deny(pattern, reason, options)`: Explicitly blocks tools matching the pattern. Can take a `when` predicate for conditional blocking.
*   `requireApproval(pattern, reason)`: Escalates the tool call to the user.
*   `onRequest(handler)`: Registers an `ApprovalHandler` to process escalation requests.

### Security Helpers
*   `cliApproval()`: A pre-built `ApprovalHandler` that prompts the user via the terminal.
*   `isDangerousCommand(extraPatterns?)`: A predicate function that checks tool arguments against a list of known dangerous shell patterns (e.g., `rm -rf /`, `sudo`, fork bombs).
*   `secureCLIPolicy()`: A factory function that returns a `PermissionPolicy` pre-configured with sensible defaults for CLI agents, such as blocking dangerous patterns and requiring approval for shell execution.

## Configuration
The Permission System is typically configured during the instantiation of an `Agent`. The `PermissionPolicy` instance is passed to the agent configuration, where it is integrated into the tool execution lifecycle.

```typescript
const agent = new Agent({
  systemPrompt: '...',
  permissions: new PermissionPolicy()
    .allow('search_*')
    .allow('check_weather')
    .requireApproval('book_trip', 'Booking requires your confirmation')
    .deny('delete_*', 'Deletion is not permitted')
    .onRequest(cliApproval()),
});
```

## Extension Points
The subsystem allows for custom security logic through two primary extension points:

1.  **Custom Approval Handlers**: Developers can implement the `ApprovalHandler` interface to route approval requests to external systems such as Slack, email, or a web-based administrative dashboard.
2.  **Conditional Predicates**: The `deny` and `allow` methods support a `when` option, which accepts a function `(toolName: string, args: Record<string, unknown>) => boolean`. This allows for context-aware security rules that can inspect the specific data being passed to a tool.

### Dangerous Patterns
The system includes a constant `DANGEROUS_PATTERNS` which contains regular expressions for identifying high-risk operations, including:
*   Recursive root directory deletion (`rm -rf /`)
*   Broad permission changes (`chmod 777`)
*   Privilege escalation (`sudo`)
*   Download-and-execute pipes (`curl ... | bash`)
*   Raw disk writes and filesystem formatting (`mkfs`, `dd`)