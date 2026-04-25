---
title: strictSandbox
summary: A convenience factory for creating a highly restrictive Sandbox instance.
export_name: strictSandbox
source_file: src/sandbox.ts
category: function
entity_type: api
search_terms:
 - secure sandbox configuration
 - restrict agent file access
 - block agent network access
 - safe tool execution environment
 - production sandbox settings
 - high security agent sandbox
 - create a strict sandbox
 - sandbox factory function
 - filesystem jail for agents
 - prevent network calls from tools
 - agent execution timeout
 - CWD only sandbox
stub: false
compiled_at: 2026-04-24T17:41:24.127Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

The `strictSandbox` function is a convenience factory that creates and returns a pre-configured `Sandbox` instance with highly restrictive settings. It is designed for scenarios requiring maximum security, such as production environments or [when](./when.md) running agents with potentially untrusted [Tools](../subsystems/tools.md) [Source 1, Source 2].

The returned `Sandbox` instance has the following configuration [Source 2]:

| Setting | Value | Description |
|---|---|---|
| **Allowed Paths** | Current Working Directory (CWD) only | The agent can only access files and directories within the directory where the process was started. |
| **Network Access** | Blocked | All network requests made by tools are blocked. |
| **Timeout** | 10 seconds | Any [Tool Execution](../concepts/tool-execution.md) that exceeds 10 seconds will be terminated. |

This configuration provides a strong security baseline by default, limiting an agent's ability to interact with the host system's file system and network.

## Signature

The function takes no arguments and returns an instance of the `Sandbox` class.

```typescript
export function strictSandbox(): Sandbox;
```

## Examples

The following example demonstrates how to import and use the `strictSandbox` factory to create a sandbox instance.

```typescript
import { Sandbox, strictSandbox } from 'yaaf';

// Create a sandbox with strict, production-ready settings.
const strict: Sandbox = strictSandbox();

// This sandbox instance can now be passed to an Agent's configuration
// to enforce these restrictions on all its tool executions.
```
[Source 1]

## See Also

*   `Sandbox`: The class that provides the core [Sandboxing](../subsystems/sandboxing.md) functionality. `strictSandbox` is a factory for this class.
*   `projectSandbox`: An alternative convenience factory that creates a more permissive sandbox suitable for development, allowing access to the current working directory and `/tmp`, with network access enabled and a 30-second timeout [Source 1, Source 2].

## Sources

*   [Source 1]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md`
*   [Source 2]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md`