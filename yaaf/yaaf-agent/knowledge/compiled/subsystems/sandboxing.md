---
title: Sandboxing
summary: Provides isolated execution environments to restrict agent access to system resources like file systems and networks.
primary_files:
 - src/sandbox.ts
entity_type: subsystem
exports:
 - Sandbox
 - projectSandbox
 - strictSandbox
search_terms:
 - isolated execution environment
 - restrict file system access
 - block network access for agents
 - secure tool execution
 - agent security policy
 - YAAF security features
 - how to prevent dangerous commands
 - projectSandbox vs strictSandbox
 - command execution timeout
 - allowed paths for agents
 - blocked paths for agents
 - safe agent environment
stub: false
compiled_at: 2026-04-24T18:19:02.858Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
compiled_from_quality: documentation
confidence: 0.95
---

## Purpose

The Sandboxing subsystem provides an isolated environment for agent operations, particularly for [Tool Execution](../concepts/tool-execution.md). Its primary purpose is to enhance security by restricting an agent's access to sensitive system resources such as the file system and network. This prevents potentially harmful or unintended actions, like reading arbitrary files, modifying system configuration, or making unauthorized network calls [Source 1].

## Architecture

The core of the subsystem is the `Sandbox` class, which defines the boundaries of the isolated environment. A sandbox is configured with a set of rules that dictate what an agent is permitted to do. These rules include execution timeouts, whitelists of allowed file system paths, blacklists of blocked paths, and a toggle for network access [Source 1].

YAAF also provides two convenience factory functions that create pre-configured `Sandbox` instances for common use cases [Source 1]:
*   `projectSandbox()`: Creates a sandbox suitable for development environments. It allows access to the current working directory and the `/tmp` directory with a 30-second timeout.
*   `strictSandbox()`: Creates a highly restrictive sandbox for production or untrusted code. It only allows access to the current working directory, blocks all network access, and has a short 10-second timeout.

[when](../apis/when.md) an agent attempts an operation that violates the sandbox rules, the subsystem can trigger a `tool:sandbox-violation` event, allowing the application to log the incident or take further action [Source 1].

## Integration Points

The Sandboxing subsystem is integrated into the agent's core execution loop, specifically around tool execution. When a tool needs to interact with the underlying system (e.g., execute a shell command or read a file), its execution is mediated by the configured sandbox.

Other parts of the YAAF framework and the host application can interact with this subsystem by listening to agent events. The `tool:sandbox-violation` event is the primary integration point, enabling monitoring and security systems to react to breaches of the sandbox policy [Source 1].

```typescript
agent.on('tool:sandbox-violation', ({ name, violationType, detail }) => {
  security.alert(`Sandbox: ${violationType} by ${name}`);
});
```

## Key APIs

The main public APIs for this subsystem are the `Sandbox` class and its associated factory functions [Source 1].

*   **`new Sandbox(options)`**: The constructor for creating a custom sandbox instance. It accepts an options object to define the execution boundaries.
*   **`projectSandbox()`**: A factory function that returns a pre-configured `Sandbox` instance suitable for development purposes.
*   **`strictSandbox()`**: A factory function that returns a pre-configured, highly restrictive `Sandbox` instance for production environments.

## Configuration

A sandbox is configured by instantiating the `Sandbox` class with a configuration object. The available options allow for fine-grained control over the execution environment [Source 1].

Key configuration properties include:
*   `timeoutMs`: The maximum execution time in milliseconds before an operation is terminated.
*   `allowedPaths`: An array of strings representing file system paths that the agent is permitted to access.
*   `blockedPaths`: An array of strings representing file system paths that the agent is explicitly forbidden from accessing.
*   `blockNetwork`: A boolean that, when `true`, prevents any outbound network requests.

**Example of a custom sandbox configuration:**
```typescript
import { Sandbox } from 'yaaf';

const sandbox = new Sandbox({
  timeoutMs:    15_000,
  allowedPaths: [process.cwd(), '/tmp'],
  blockedPaths: ['/etc', '/usr', process.env.HOME!],
  blockNetwork: false,
});
```

**Pre-configured sandboxes:**
The framework also provides ready-to-use configurations via factory functions [Source 1].
```typescript
import { projectSandbox, strictSandbox } from 'yaaf';

// CWD + /tmp, 30s timeout, network allowed
const devSandbox = projectSandbox();

// CWD only, 10s timeout, no network
const strictProdSandbox = strictSandbox();
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md