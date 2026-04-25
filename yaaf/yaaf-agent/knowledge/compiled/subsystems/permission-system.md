---
summary: A logical subsystem providing policy-based authorization for tool calls made by an agent.
title: Permission System
entity_type: subsystem
primary_files:
 - src/permissions.ts
exports:
 - PermissionPolicy
 - PermissionOutcome
 - ApprovalHandler
 - cliApproval
 - isDangerousCommand
 - secureCLIPolicy
search_terms:
 - tool call authorization
 - agent security policy
 - how to approve tool calls
 - prevent dangerous commands
 - LLM agent safety
 - glob pattern matching for tools
 - user approval for agent actions
 - interactive tool confirmation
 - secure agent configuration
 - allow deny tool usage
 - escalate for approval
 - YAAF permissions
 - agent guardrails
stub: false
compiled_at: 2026-04-24T18:18:01.621Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Permission System provides a security layer for agents by managing [Authorization](../concepts/authorization.md) for [Tool Calls](../concepts/tool-calls.md) [Source 1]. Its primary function is to intercept every tool call an agent attempts to make and decide whether to allow it, deny it, or escalate the decision to a human user for manual approval. This prevents agents from performing unauthorized or potentially destructive actions without oversight [Source 1].

The system uses a policy-based approach where rules are defined using glob-style pattern matching against tool names and the serialized content of their arguments [Source 1].

## Architecture

The core of the Permission System is the `PermissionPolicy` class. A developer instantiates this class and configures it with a set of rules that define the agent's permissions [Source 1]. These rules are processed in order to determine the outcome for a given tool call.

The rules support glob-style patterns for matching tool names. For example, a rule for `"search_*"` would apply to any tool whose name begins with `search_`. The system can also inspect the arguments of a tool call, matching against patterns within the JSON representation of the arguments, such as in `"tool_name(pattern)"` [Source 1].

[when](../apis/when.md) a tool call matches a rule that requires approval, the policy invokes a configured `[[[[[[[[ApprovalHandler]]]]]]]]`. This handler is a function responsible for obtaining consent, typically from a human user. The handler's return value (`true` for allow, `false` for deny) determines the final outcome of the tool call [Source 1].

The subsystem also includes helpers for advanced, content-aware security. The `[[[[[[[[isDangerousCommand]]]]]]]]` predicate uses a list of regular expressions (`DANGEROUS_PATTERNS`) to detect potentially harmful shell commands within tool arguments. This is designed to work with [Tools](./tools.md) that execute shell commands, checking multiple common argument names (e.g., `command`, `script`, `code`) where an [LLM](../concepts/llm.md) might place executable code [Source 1].

## Integration Points

The Permission System integrates directly with the `Agent` class. An instance of a configured `PermissionPolicy` is passed to the `Agent` constructor via the `permissions` property. The agent's internal execution loop then consults this policy before invoking any tool, enforcing the defined rules at runtime [Source 1].

## Key APIs

### PermissionPolicy
The central class used to build a set of authorization rules. It provides a chainable interface for defining the policy [Source 1].
- `.allow(pattern, reason, options)`: Specifies a pattern for tool calls that should be permitted.
- `.deny(pattern, reason, options)`: Specifies a pattern for tool calls that should be blocked.
- `.requireApproval(pattern, reason, options)`: Specifies a pattern for tool calls that must be escalated for manual approval.
- `.onRequest(handler)`: Registers the `ApprovalHandler` function to be called for escalations.

### ApprovalHandler
A type definition for the callback function that handles approval requests. It receives the tool name, arguments, and the reason for the escalation, and must return a boolean or a promise that resolves to a boolean [Source 1].
`type ApprovalHandler = (toolName: string, args: Record<string, unknown>, reason: string) => Promise<boolean> | boolean;`

### cliApproval()
A pre-built `ApprovalHandler` suitable for interactive command-line applications. It prompts the user in the terminal for a "yes" or "no" response. It includes a guard that throws an error if not run in a TTY environment (e.g., a server or CI pipeline). When a `PermissionPolicy` is passed to it, it can automatically remember "always allow" or "always deny" responses for the user [Source 1].

### secureCLIPolicy()
A factory function that returns a pre-configured `PermissionPolicy` with secure defaults for command-line agents. This policy blocks dangerous shell patterns using `isDangerousCommand`, requires approval for all shell execution commands, and allows read-only operations by default [Source 1].

### isDangerousCommand()
A factory for creating a predicate function that checks tool arguments for dangerous shell command patterns. This is intended to be used with a `.deny()` rule for content-aware filtering. It can be extended with additional custom regex patterns [Source 1].

## Configuration

The Permission System is configured by creating an instance of `PermissionPolicy`, defining rules using its methods, and passing the instance to the `Agent` constructor.

The following example demonstrates a policy that allows searching, requires approval for booking a trip, denies all deletions, and uses the interactive `cliApproval` handler for escalations [Source 1].

```typescript
const agent = new Agent({
  systemPrompt: '...',
  permissions: new PermissionPolicy()
    .allow('search_*')
    .allow('check_weather')
    .requireApproval('book_trip', 'Booking requires your confirmation')
    .deny('delete_*', 'Deletion is not permitted')
    .onRequest(async (toolName, args, reason) => {
      const answer = await readline.question(`Allow ${toolName}? [y/N] `);
      return answer.toLowerCase() === 'y';
    }),
});
```

A pre-built secure policy can also be used and customized [Source 1]:
```typescript
const policy = secureCLIPolicy()
  .allow('read_*') // override: allow all reads
  .onRequest(cliApproval());
```

## Extension Points

The primary extension point is the `ApprovalHandler`. Developers can implement a custom `ApprovalHandler` to integrate the approval flow with various user interfaces, such as a web front-end, a chat application (like Slack or Discord), or any other system capable of handling interactive prompts. This is achieved by passing a custom asynchronous function to the `.onRequest()` method of the `PermissionPolicy` [Source 1].

Additionally, the `isDangerousCommand` predicate can be extended with an array of custom regular expressions, allowing developers to add their own definitions of what constitutes a "dangerous" command for their specific use case [Source 1].

## Sources
[Source 1] src/permissions.ts