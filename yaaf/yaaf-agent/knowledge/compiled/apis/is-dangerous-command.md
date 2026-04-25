---
summary: Creates a predicate function to check tool arguments for dangerous shell patterns.
export_name: isDangerousCommand
source_file: src/permissions.ts
category: function
title: isDangerousCommand
entity_type: api
search_terms:
 - shell command security
 - prevent dangerous commands
 - tool argument validation
 - permission policy predicate
 - block rm -rf
 - secure tool execution
 - content-aware permissions
 - how to deny specific commands
 - exec_command safety
 - YAAF permissions
 - command injection prevention
 - DANGEROUS_PATTERNS
 - when predicate
 - policy deny condition
stub: false
compiled_at: 2026-04-24T17:15:05.001Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `isDangerousCommand` function is a factory that creates a predicate function used for content-aware tool call [Authorization](../concepts/authorization.md). This predicate is designed to be used with the `when` option in `PermissionPolicy` rules, such as `deny()` or `requireApproval()`.

Its primary purpose is to inspect the arguments of a tool call and check for patterns that indicate a potentially destructive or malicious shell command. It scans for common dangerous patterns like `rm -rf /`, `sudo`, `chmod 777`, and download-and-execute pipes (`curl ... | bash`) [Source 1].

The predicate automatically checks multiple common argument keys where an [LLM](../concepts/llm.md) might place shell code, including `command`, `cmd`, `script`, `code`, `shell`, `bash`, `sh`, `input`, and `payload`. This provides a robust layer of security for agents that have [Tools](../subsystems/tools.md) capable of executing arbitrary shell commands [Source 1].

## Signature

```typescript
export function isDangerousCommand(
  extraPatterns?: RegExp[],
): (toolName: string, args: Record<string, unknown>) => boolean;
```

### Parameters

-   **`extraPatterns`** (optional): An array of additional `RegExp` objects to check against the tool arguments. This allows users to supplement the built-in `DANGEROUS_PATTERNS` with their own custom rules [Source 1].

### Returns

-   **(predicate)**: A function that takes a `toolName` and an `args` object and returns `true` if any of the dangerous patterns are found within the relevant argument values, and `false` otherwise. This function is intended for use in a `PermissionPolicy` rule's `when` condition [Source 1].

## Examples

### Basic Usage

The most common use case is to block any tool call that appears to contain a dangerous command. This is done by passing the predicate to the `when` option of a `deny` rule in a `PermissionPolicy`.

```typescript
import { PermissionPolicy, isDangerousCommand } from 'yaaf';

const policy = new PermissionPolicy();

// Deny any call to 'exec_command' if its arguments contain dangerous patterns.
policy.deny('exec_command', 'Dangerous command detected', {
  when: isDangerousCommand(),
});
```
[Source 1]

### With Custom Patterns

You can extend the default set of dangerous patterns with your own regular expressions. This is useful for enforcing project-specific or organization-specific rules.

```typescript
import { PermissionPolicy, isDangerousCommand } from 'yaaf';

const policy = new PermissionPolicy();

// Define custom patterns to block
const customPatterns = [
  /git push --force/, // Block forced git pushes
  /kubectl delete ns/, // Block Kubernetes namespace deletion
];

// Deny calls to 'run_shell' if they match default or custom dangerous patterns
policy.deny('run_shell', 'Potentially destructive operation detected', {
  when: isDangerousCommand(customPatterns),
});
```

## See Also

-   `PermissionPolicy`: The class used to define authorization rules for [Tool Calls](../concepts/tool-calls.md).
-   `secureCLIPolicy`: A pre-built policy that uses `isDangerousCommand` to secure command-line agents.
-   `DANGEROUS_PATTERNS`: The exported constant array of regular expressions used by default within this predicate.

## Sources

[Source 1]: src/permissions.ts