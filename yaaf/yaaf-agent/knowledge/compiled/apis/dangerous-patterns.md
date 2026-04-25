---
summary: A constant array of regular expressions used to identify potentially destructive shell commands.
export_name: DANGEROUS_PATTERNS
source_file: src/permissions.ts
category: constant
title: DANGEROUS_PATTERNS
entity_type: api
search_terms:
 - shell command security
 - prevent destructive commands
 - command injection prevention
 - secure tool execution
 - block rm -rf
 - fork bomb detection
 - permission policy rules
 - isDangerousCommand helper
 - YAAF security
 - agent safety
 - block sudo
 - prevent curl pipe bash
 - raw disk write detection
stub: false
compiled_at: 2026-04-24T17:00:20.455Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`DANGEROUS_PATTERNS` is an exported constant array of `RegExp` objects. It contains a curated list of regular expressions designed to detect shell commands that are potentially destructive or pose a security risk [Source 1].

This list is a core component of YAAF's security model for agents that can execute shell commands. It is used primarily by the `isDangerousCommand` predicate function to perform content-aware blocking of [Tool Calls](../concepts/tool-calls.md). The patterns cover a range of common risks, including recursive file deletion from root directories, privilege escalation, remote code execution via pipes, raw disk writes, and fork bombs [Source 1].

Developers can use this constant directly [when](./when.md) creating custom permission predicates or extend it by passing additional patterns to functions like `isDangerousCommand` [Source 1].

## Signature

`DANGEROUS_PATTERNS` is an array of `RegExp` objects.

```typescript
export const DANGEROUS_PATTERNS: RegExp[];
```

The array contains the following patterns [Source 1]:

| Pattern                                 | Description                               |
| --------------------------------------- | ----------------------------------------- |
| `/rm\s+(-rf?\|--recursive)\s+[\/~]/`     | Detects `rm -rf /` or `rm -rf ~`          |
| `/chmod\s+777/`                         | Detects world-writable permissions        |
| `/chmod\s+a\+[rwx]/`                    | Detects broad `chmod` changes             |
| `/sudo\s+/`                             | Detects privilege escalation with `sudo`  |
| `/curl\s+.*\|\s*(bash\|sh\|zsh)/`        | Detects download-and-execute patterns     |
| `/wget\s+.*\|\s*(bash\|sh\|zsh)/`        | Detects download-and-execute patterns     |
| `/> *\/dev\/sd[a-z]/`                   | Detects raw disk writes                   |
| `/mkfs\./`                              | Detects filesystem formatting commands    |
| `/dd\s+.*of=\/dev\//`                   | Detects raw disk writes with `dd`         |
| `/:(\)\s*\{\s*:\|:\s*&\s*\};\s*:/`       | Detects a common fork bomb                |

## Examples

While `DANGEROUS_PATTERNS` is used internally by helpers like `isDangerousCommand`, you can also use it directly to build custom validation logic within a permission policy.

### Example 1: Using with a Custom Predicate

This example shows how to create a custom `when` predicate for a `PermissionPolicy` that uses `DANGEROUS_PATTERNS` to check a specific argument.

```typescript
import { PermissionPolicy, DANGEROUS_PATTERNS } from 'yaaf';

const policy = new PermissionPolicy();

// A custom predicate that checks the 'script_content' argument
// against the dangerous patterns.
const isHarmfulScript = (toolName: string, args: Record<string, unknown>): boolean => {
  const script = args.script_content;
  if (typeof script === 'string') {
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(script));
  }
  return false;
};

policy.deny('execute_python_script', 'Harmful script content detected', {
  when: isHarmfulScript,
});

// This policy would now block a call like:
// agent.run('execute_python_script', {
//   script_content: 'import os; os.system("sudo rm -rf /")'
// });
```

### Example 2: Extending `isDangerousCommand`

You can combine your own custom patterns with the built-in `DANGEROUS_PATTERNS` list when using the `isDangerousCommand` helper.

```typescript
import { PermissionPolicy, isDangerousCommand, DANGEROUS_PATTERNS } from 'yaaf';

const policy = new PermissionPolicy();

// Add a new pattern to block any use of the 'fdisk' command.
const myExtraPatterns = [
    /fdisk\s+/,
];

// The isDangerousCommand predicate will check its internal list
// (which is DANGEROUS_PATTERNS) PLUS the extra patterns provided.
policy.deny('exec_shell', 'Dangerous command detected', {
  when: isDangerousCommand(myExtraPatterns),
});
```

## See Also

- `isDangerousCommand`: A predicate function that uses `DANGEROUS_PATTERNS` to check tool arguments.
- `PermissionPolicy`: The class used to define [Authorization](../concepts/authorization.md) rules for tool calls.
- `secureCLIPolicy`: A pre-built policy factory that uses `isDangerousCommand` for security.

## Sources

[Source 1]: src/permissions.ts