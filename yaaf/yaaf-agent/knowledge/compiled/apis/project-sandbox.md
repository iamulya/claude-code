---
title: projectSandbox
summary: A convenience factory for creating a Sandbox configured for project-level development.
export_name: projectSandbox
source_file: src/sandbox.ts
category: function
entity_type: api
search_terms:
 - sandbox configuration
 - development sandbox
 - file system access control
 - restrict agent file access
 - CWD sandbox
 - temporary file access for agents
 - sandbox factory
 - default sandbox settings
 - how to create a sandbox
 - agent security
 - project development environment
 - yaaf sandbox presets
stub: false
compiled_at: 2026-04-24T17:29:33.843Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

The `projectSandbox` function is a convenience factory that creates and returns a pre-configured `Sandbox` instance. This configuration is tailored for typical project development scenarios, providing a balance between security and functionality [Source 1, Source 2].

The created sandbox has the following settings [Source 2]:
- **Allowed Paths**: The current working directory (`process.cwd()`) and the system's temporary directory (`/tmp`).
- **Network Access**: Allowed (✅).
- **Timeout**: 30 seconds (30,000 ms).

This factory is useful for quickly setting up a reasonably safe execution environment for an agent that needs to interact with project files without requiring manual `Sandbox` configuration.

## Signature

```typescript
import { Sandbox } from 'yaaf';

function projectSandbox(): Sandbox;
```

**Parameters:**

The function takes no parameters.

**Returns:**

A new `Sandbox` instance with pre-defined settings for project development.

## Examples

The following example demonstrates how to import and use the `projectSandbox` factory to create a sandbox instance.

```typescript
import { projectSandbox } from 'yaaf';

// Create a sandbox configured for development use cases.
const devSandbox = projectSandbox();

// This sandbox can now be used to check paths or be passed
// to an Agent's configuration.
```
[Source 1]

## See Also

- `Sandbox`: The class used to create custom sandbox environments.
- `strictSandbox`: An alternative factory for creating a more restrictive sandbox with network access disabled.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md