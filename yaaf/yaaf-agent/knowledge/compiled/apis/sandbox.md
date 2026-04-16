---
export_name: Sandbox
source_file: src/sandbox.ts
category: class
title: Sandbox
entity_type: api
summary: A configuration class for restricting file system and network access during tool execution.
stub: false
compiled_at: 2026-04-16T14:05:10.967Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/security.md
confidence: 1
---

## Overview
The `Sandbox` class provides a mechanism to enforce security boundaries on LLM-powered agents. It allows developers to define strict limits on which parts of the file system an agent can interact with, whether it can access the network, and how long a tool execution is permitted to run. 

By default, YAAF applies secure defaults, but the `Sandbox` class allows for granular control over the execution environment.

## Signature / Constructor

```typescript
class Sandbox {
  constructor(config: SandboxConfig);
}

interface SandboxConfig {
  /** Execution timeout in milliseconds. Defaults vary by factory. */
  timeoutMs?: number;
  /** List of directories or files permitted for access. */
  allowedPaths?: string[];
  /** List of directories or files explicitly forbidden. */
  blockedPaths?: string[];
  /** Whether to disable network access during tool execution. */
  blockNetwork?: boolean;
}
```

## Methods & Properties

### checkPath()
Validates a file system path against the defined `allowedPaths` and `blockedPaths`.
- **Signature**: `checkPath(path: string): boolean`
- **Returns**: `true` if the path is permitted; otherwise, it returns `false`.

### Static Factories
The framework provides convenience factories for common security profiles:

| Factory | Allowed Paths | Network | Timeout |
|---------|--------------|---------|---------|
| `projectSandbox()` | CWD + `/tmp` | Enabled | 30s |
| `strictSandbox()` | CWD only | Disabled | 10s |

## Events
While the `Sandbox` class itself does not emit events, the `Agent` using the sandbox emits the following event when a restriction is triggered:

### tool:sandbox-violation
Emitted when a tool attempts an unauthorized action or exceeds its resource limits.
- **Payload**: `{ name: string, violationType: 'path' | 'network' | 'timeout', detail: string }`

## Examples

### Custom Sandbox Configuration
Defining a specific set of allowed and blocked paths with a custom timeout.

```typescript
import { Sandbox, Agent } from 'yaaf';

const sandbox = new Sandbox({
  timeoutMs: 15_000,
  allowedPaths: [process.cwd(), '/tmp'],
  blockedPaths: ['/etc', '/usr', process.env.HOME!],
  blockNetwork: false,
});

const agent = new Agent({
  sandbox,
  // ... other config
});
```

### Using Strict Defaults
Using the `strictSandbox` factory to disable network access and limit file access to the current working directory.

```typescript
import { strictSandbox, Agent } from 'yaaf';

const agent = new Agent({
  sandbox: strictSandbox(),
  // ... other config
});
```

### Handling Violations
Listening for sandbox violations to alert security systems or audit logs.

```typescript
agent.on('tool:sandbox-violation', ({ name, violationType, detail }) => {
  console.error(`Security Alert: ${name} triggered a ${violationType} violation.`);
  console.error(`Detail: ${detail}`);
});
```

## See Also
- Agent
- PermissionPolicy
- SecureStorage