---
title: projectSandbox
entity_type: api
summary: A convenience factory that creates a Sandbox restricted to the current working directory and temporary files.
export_name: projectSandbox
source_file: src/sandbox.ts
category: function
stub: false
compiled_at: 2026-04-16T14:10:02.254Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
confidence: 1
---

## Overview
`projectSandbox` is a factory function used to create a pre-configured Sandbox instance. It is designed for development environments where an agent requires access to the local project files and temporary system storage but should otherwise be restricted from sensitive system areas.

This factory provides a middle-ground security profile, allowing more flexibility than a strict sandbox while still enforcing execution timeouts and path boundaries.

## Signature / Constructor
```typescript
function projectSandbox(): Sandbox;
```

### Default Configuration
When invoked, `projectSandbox` initializes a Sandbox with the following settings:
*   **Allowed Paths**: The current working directory (`process.cwd()`) and the system temporary directory (`/tmp`).
*   **Timeout**: 30,000 milliseconds (30 seconds).

## Examples

### Basic Usage
This example demonstrates how to initialize an agent with a project-scoped sandbox.

```typescript
import { projectSandbox, Agent } from 'yaaf';

// Create a sandbox restricted to CWD and /tmp with a 30s timeout
const sandbox = projectSandbox();

const agent = new Agent({
  sandbox,
  tools: [...],
  systemPrompt: 'You are a developer assistant.'
});
```

## See Also
*   Sandbox
*   strictSandbox
*   PermissionPolicy