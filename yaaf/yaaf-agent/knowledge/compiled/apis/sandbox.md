---
title: Sandbox
entity_type: api
summary: Provides tool execution isolation and resource control for LLM agents, wrapping tool calls with timeouts, path guards, and network restrictions.
export_name: Sandbox
source_file: src/sandbox.ts
category: class
search_terms:
 - tool execution security
 - agent safety
 - restrict file system access
 - block network access for tools
 - tool call timeout
 - worker thread isolation
 - Firecracker microVM sandbox
 - external sandbox backend
 - projectSandbox factory
 - strictSandbox factory
 - how to secure agent tools
 - prevent malicious tool code
 - sandbox runtime modes
 - inline vs worker vs external sandbox
stub: false
compiled_at: 2026-04-24T17:34:54.705Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Sandbox` class provides [Tool Execution](../concepts/tool-execution.md) isolation and resource control for agents [Source 5]. It acts as a wrapper around [Tool Calls](../concepts/tool-calls.md), enforcing security policies transparently at the agent runner level, meaning the [Tools](../subsystems/tools.md) themselves do not need to be aware of the sandbox [Source 5].

Key features include:
*   **Timeouts**: Aborting tool calls that exceed a specified duration.
*   **Path Guarding**: Restricting file system access to a predefined list of allowed directories.
*   **Network Guarding**: Blocking or intercepting outbound network requests.
*   **Execution Runtimes**: Offering multiple levels of isolation, from running inline in the main thread to executing in a dedicated worker thread or even an external, hypervisor-isolated environment like a Firecracker microVM [Source 5].

A `Sandbox` should be used [when](./when.md)ever an agent's tools can interact with the file system, network, or execute arbitrary code, to mitigate potential security risks and ensure resource limits are respected [Source 2, Source 3].

## Constructor

The `Sandbox` is instantiated with a configuration object that defines its behavior.

```typescript
import { Sandbox, type SandboxConfig } from 'yaaf';

const sandbox = new Sandbox({
  timeoutMs: 15_000,
  allowedPaths: [process.cwd(), '/tmp'],
  blockedPaths: [process.env.HOME!],
  blockNetwork: true,
  sandboxRuntime: 'worker',
});
```

### `SandboxConfig`

The constructor accepts a `SandboxConfig` object with the following properties [Source 5]:

| Property | Type | Description |
| --- | --- | --- |
| `timeoutMs` | `number` | Maximum milliseconds a tool may run before being aborted. **Default**: `30_000`. |
| `allowedPaths` | `string[]` | A list of directories the tool is permitted to access. **Default**: `[]` (no path checking). |
| `blockedPaths` | `string[]` | A list of directories that are explicitly forbidden, taking precedence over `allowedPaths`. |
| `blockNetwork` | `boolean` | If `true`, outbound network access is restricted. This works by inspecting tool arguments for URL patterns and by using the `sandboxFetch` interceptor. It does not intercept all native network calls (e.g., `http.request`). For true isolation, an OS-level restriction or a `'worker'`/`'external'` runtime is recommended. **Default**: `false`. |
| `sandboxFetch` | `typeof globalThis.fetch` | An optional `fetch` implementation injected into the tool's context as `args.__sandboxFetch`. Tools must use this injected function to be subject to runtime network [Sandboxing](../subsystems/sandboxing.md). |
| `pathValidator` | `(toolName: string, resolvedPath: string) => boolean` | An optional callback for runtime path validation. Tools can invoke this via `ctx.extra.__validatePath(path)` to validate paths constructed dynamically during execution. |
| `onViolation` | `(violation: SandboxViolation) => void` | A callback function invoked when the sandbox blocks a tool call. **Default**: Throws a `SandboxError`. |
| `debug` | `boolean` | If `true`, emits detailed logs for every sandbox decision. |
| `sandboxRuntime` | `'inline' \| 'worker' \| 'external'` | The execution environment for tools. `'inline'` (default) runs in the same thread. `'worker'` runs in a separate worker thread, providing better isolation for network blocking. `'external'` delegates execution to a `sandboxBackend` for maximum isolation (e.g., a microVM). `'worker'` and `'external'` modes require tool functions to be serializable. **Default**: `'inline'`. |
| `sandboxBackend` | `SandboxExternalBackend` | An external backend for tool execution, required when `sandboxRuntime` is `'external'`. An example implementation is `FirecrackerSandboxBackend`. |

## Methods & Properties

### `checkPath()`

Checks if a given file path is permitted by the sandbox's `allowedPaths` and `blockedPaths` rules [Source 3].

**Signature**
```typescript
public checkPath(path: string): void;
```
**Parameters**
*   `path`: The absolute or relative file path to validate.

**Throws**
*   `SandboxError` if the path is not allowed.

## Events

When a sandbox rule is violated, the `Agent` instance emits a `tool:sandbox-violation` event. This allows for centralized logging and alerting of security-relevant events [Source 1, Source 3].

**Event: `tool:sandbox-violation`**

Fires when a tool call is blocked by the sandbox.

**Payload**
```typescript
{
  name: string;          // The name of the tool that was blocked
  violationType: 'path' | 'network' | 'timeout' | 'blocked-path';
  detail: string;        // A description of the violation
}
```

**Example Listener**
```typescript
agent.on('tool:sandbox-violation', ({ name, violationType, detail }) => {
  security.alert(`Sandbox violation by ${name}: ${violationType} — ${detail}`);
});
```

## Examples

### Basic Sandbox Configuration

A common configuration for a development environment that allows tools to access the project directory and `/tmp`, with a 15-second timeout.

```typescript
import { Agent, Sandbox } from 'yaaf';

const sandbox = new Sandbox({
  timeoutMs: 15_000,
  allowedPaths: [process.cwd(), '/tmp'],
  blockNetwork: false, // Most dev tools need network access
});

const agent = new Agent({
  // ... other agent config
  tools: [/* myTools */],
  sandbox,
});
```

### Using Convenience Factories

YAAF provides factory functions for common sandbox configurations [Source 2, Source 3, Source 5].

*   `projectSandbox()`: Allows access to the current working directory and `/tmp` with a 30-second timeout. Network access is allowed.
*   `strictSandbox()`: Allows access only to a specified directory, blocks network access, and has a 15-second timeout.

```typescript
import { Agent, projectSandbox, strictSandbox } from 'yaaf';

// For development: allow access to the project directory
const devSandbox = projectSandbox();

// For production or high-risk tools: restrict to a specific data directory
const secureSandbox = strictSandbox('/var/agent-data');

const agent = new Agent({
  // ...
  sandbox: process.env.NODE_ENV === 'production' ? secureSandbox : devSandbox,
});
```

### External Runtime with Firecracker

For maximum isolation, the sandbox can be configured to use an external backend, such as one that runs tools inside Firecracker microVMs [Source 4, Source 5].

```typescript
import { Sandbox } from 'yaaf';
import { FirecrackerSandboxBackend } from 'yaaf/[[[[[[[[Integrations]]]]]]]]/sandbox.firecracker';

// This backend must be initialized before use
const backend = new FirecrackerSandboxBackend({
  kernelImagePath: '/path/to/vmlinux.bin',
  rootfsImagePath: '/path/to/yaaf-rootfs.ext4',
});
await backend.initialize();

const sandbox = new Sandbox({
  sandboxRuntime: 'external',
  sandboxBackend: backend,
});

const agent = new Agent({
  // ...
  sandbox,
});
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/Integrations/sandbox.firecracker.ts
[Source 5]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts