---
title: isDangerousCommand
entity_type: api
summary: A predicate function that identifies potentially destructive shell commands within tool arguments.
export_name: isDangerousCommand
source_file: src/permissions.ts
category: function
stub: false
compiled_at: 2026-04-16T14:31:51.157Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/permissions.ts
confidence: 1
---

## Overview
`isDangerousCommand` is a factory function that creates a predicate for the YAAF permission system. It is designed to inspect the arguments of a tool call—specifically those intended for shell execution—and identify patterns that indicate potentially destructive or unauthorized operations.

This function is typically used in conjunction with `PermissionPolicy.deny()` to implement content-aware security boundaries, preventing an agent from executing high-risk commands even if it has general permission to use a shell-execution tool.

## Signature
```typescript
export function isDangerousCommand(
  extraPatterns?: RegExp[],
): (toolName: string, args: Record<string, unknown>) => boolean
```

### Parameters
- **extraPatterns** (optional): An array of additional `RegExp` objects to check against the tool arguments, allowing developers to extend the default security definitions.

### Returns
Returns a predicate function with the signature `(toolName: string, args: Record<string, unknown>) => boolean`. This predicate returns `true` if any dangerous patterns are detected in the serialized arguments.

## Dangerous Patterns
The function checks against a set of predefined patterns (exported as `DANGEROUS_PATTERNS`), which include:

| Pattern Description | Example Match |
| :--- | :--- |
| Recursive root/home deletion | `rm -rf /` or `rm -rf ~` |
| World-writable permissions | `chmod 777` |
| Broad permission changes | `chmod a+rwx` |
| Privilege escalation | `sudo ...` |
| Download-and-execute pipes | `curl ... | bash` or `wget ... | sh` |
| Raw disk writes | `> /dev/sda` |
| Filesystem formatting | `mkfs.ext4` |
| Raw byte copying to devices | `dd ... of=/dev/...` |
| Fork bombs | `:(){ :|:& };:` |

## Examples

### Basic Usage
This example demonstrates how to use the predicate to block dangerous commands within a specific tool.

```typescript
import { PermissionPolicy, isDangerousCommand } from 'yaaf';

const policy = new PermissionPolicy()
  .deny('exec_command', 'Dangerous command detected', {
    when: isDangerousCommand(),
  });
```

### With Custom Patterns
Developers can provide additional regex patterns to catch domain-specific dangerous operations.

```typescript
const policy = new PermissionPolicy()
  .deny('shell', 'Unauthorized network tool usage', {
    when: isDangerousCommand([
      /nmap\s+/,
      /netcat\s+/,
    ]),
  });
```

## See Also
- `PermissionPolicy`
- `secureCLIPolicy`
- `cliApproval`

### Sources
- `src/permissions.ts`