---
title: SandboxConfig
entity_type: api
summary: Defines the configuration options for the Sandbox, including timeout, allowed paths, network blocking, and runtime environment.
export_name: SandboxConfig
source_file: src/sandbox.ts
category: type
search_terms:
 - sandbox configuration
 - tool execution timeout
 - restrict file system access
 - block network access
 - sandbox runtime modes
 - worker thread isolation
 - external sandbox backend
 - firecracker integration
 - gvisor sandbox
 - path validation callback
 - sandbox violation handler
 - inline vs worker sandbox
 - how to configure sandbox
 - tool isolation settings
stub: false
compiled_at: 2026-04-24T17:34:57.904Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`SandboxConfig` is a type alias for the configuration object used to instantiate the `Sandbox` class. It provides a comprehensive set of options to control the execution environment for [Tools](../subsystems/tools.md), enforcing security policies and resource limits. These options include setting execution timeouts, restricting filesystem and network access, and selecting the runtime environment for [Tool Execution](../concepts/tool-execution.md) [Source 1].

This configuration is passed to the `Sandbox` constructor to define how it isolates and manages [Tool Calls](../concepts/tool-calls.md) within an agent [Source 1].

## Signature

The `SandboxConfig` type is defined as follows [Source 1]:

```typescript
export type SandboxConfig = {
  /**
   * Maximum milliseconds a tool call may run.
   * After this, the call is aborted with a timeout error.
   * Default: 30_000 (30 seconds).
   */
  timeoutMs?: number;

  /**
   * Directories the tool may access. Any path argument pointing outside
   * these directories is rejected before the tool runs.
   * Default: [] (no path checking).
   */
  allowedPaths?: string[];

  /**
   * Additional path blocklist. Takes precedence over `allowedPaths`.
   */
  blockedPaths?: string[];

  /**
   * When true, outbound network access is restricted.
   * Default: false.
   */
  blockNetwork?: boolean;

  /**
   * Optional fetch interceptor for runtime network blocking.
   * This function is injected as `args.__sandboxFetch` into every
   * sandboxed tool call.
   */
  sandboxFetch?: typeof globalThis.fetch;

  /**
   * Optional runtime path validator callback.
   * Called during tool execution via `ctx.extra.__validatePath(resolvedPath)`.
   */
  pathValidator?: (toolName: string, resolvedPath: string) => boolean;

  /**
   * Called [[[[[[[[when]]]]]]]] the sandbox blocks a tool call.
   * Default: throws SandboxError.
   */
  onViolation?: (violation: SandboxViolation) => void;

  /**
   * When true, emit debug logs for every sandbox decision.
   */
  debug?: boolean;

  /**
   * Execution runtime for this sandbox.
   * - `'inline'` (default): tool runs in the same thread.
   * - `'worker'`: tool runs in a dedicated worker_thread.
   * - `'external'`: tool runs inside an external runtime supplied via `sandboxBackend`.
   */
  sandboxRuntime?: "inline" | "worker" | "external";

  /**
   * External sandbox backend. Required when `sandboxRuntime: 'external'`.
   */
  sandboxBackend?: SandboxExternalBackend;
};
```

### Properties

*   `timeoutMs`: (Optional) The maximum duration in milliseconds that a tool call is allowed to run. If the tool exceeds this limit, its execution is aborted, and a timeout error is raised. The default value is 30,000 ms (30 seconds) [Source 1].
*   `allowedPaths`: (Optional) An array of directory paths that tools are permitted to access. Any file system operation targeting a path outside of these directories will be blocked. The default is an empty array, which disables path checking [Source 1].
*   `blockedPaths`: (Optional) An array of directory paths that are explicitly forbidden, even if they fall within a path specified in `allowedPaths`. This blocklist takes precedence over the allowlist [Source 1].
*   `blockNetwork`: (Optional) A boolean that, when `true`, restricts outbound network access. It's important to note that this guard works by inspecting tool arguments for URL patterns before execution. It does not intercept runtime network calls from libraries like `http` or `fetch` unless the tool is specifically written to use the injected `sandboxFetch` function. For comprehensive [Network Isolation](../concepts/network-isolation.md), OS-level restrictions are recommended [Source 1].
*   `sandboxFetch`: (Optional) A `fetch`-compatible function that can be provided to intercept network requests at runtime. This function is injected into the tool's arguments as `args.__sandboxFetch`. Tools must explicitly use this injected function to be subject to this form of network [Sandboxing](../subsystems/sandboxing.md) [Source 1].
*   `pathValidator`: (Optional) A callback function for runtime path validation. This is useful for tools that construct file paths dynamically during their execution, bypassing the initial argument scan. The tool can invoke this validator via `ctx.extra.__validatePath(resolvedPath)` [Source 1].
*   `onViolation`: (Optional) A callback function that is executed when a sandbox policy is violated (e.g., timeout, illegal path access). The default behavior is to throw a `SandboxError` [Source 1].
*   `debug`: (Optional) If `true`, the sandbox will emit detailed logs about its decisions, which is useful for debugging security policies [Source 1].
*   `sandboxRuntime`: (Optional) Specifies the execution environment for tools.
    *   `'inline'`: (Default) The tool runs in the same thread as the agent. This has the lowest overhead but offers the least isolation [Source 1].
    *   `'worker'`: The tool runs in a separate Node.js `worker_thread`. This provides better isolation, especially for network blocking, but introduces a small overhead and requires the tool function to be serializable [Source 1].
    *   `'external'`: The tool runs in a completely separate process or microVM managed by a `sandboxBackend`. This offers the strongest isolation but depends on an external implementation like Firecracker or gVisor [Source 1].
*   `sandboxBackend`: (Optional) An object conforming to the `SandboxExternalBackend` interface. This property is required when `sandboxRuntime` is set to `'external'`. It is responsible for executing the serialized tool function in a highly isolated environment [Source 1].

## Examples

### Basic Configuration

This example creates a sandbox that times out after 10 seconds, restricts file access to two specific directories, and allows network access.

```typescript
import { Sandbox } from './sandbox';

const config: SandboxConfig = {
  timeoutMs: 10_000,
  allowedPaths: ['/home/user/project', '/tmp'],
  blockNetwork: false,
};

const sandbox = new Sandbox(config);
```

### Configuration with Network Blocking

This example demonstrates how to block network access by providing a custom `sandboxFetch` implementation that always throws an error.

```typescript
import { Sandbox, SandboxConfig } from './sandbox';

const config: SandboxConfig = {
  blockNetwork: true,
  sandboxFetch: (input, init) => {
    throw new Error('Network access blocked by sandbox');
  },
};

const sandbox = new Sandbox(config);
```

### Configuration with an External Backend

This example shows how to configure the sandbox to use an external runtime, such as one powered by Firecracker.

```typescript
import { Sandbox, SandboxConfig, SandboxExternalBackend } from './sandbox';

// Assume FirecrackerSandboxBackend is an implementation of SandboxExternalBackend
const backend: SandboxExternalBackend = new FirecrackerSandboxBackend({
  /* ... backend config ... */
});

const config: SandboxConfig = {
  sandboxRuntime: 'external',
  sandboxBackend: backend,
};

const sandbox = new Sandbox(config);
```

## See Also

*   `Sandbox`: The class that uses this configuration to provide execution isolation.
*   `strictSandbox`: A factory function that creates a `Sandbox` with a restrictive configuration.
*   `projectSandbox`: A factory function that creates a `Sandbox` with a configuration suitable for a typical project environment.
*   `SandboxExternalBackend`: The interface for implementing external sandbox runtimes.

## Sources

*   [Source 1] `src/sandbox.ts`