---
title: Sandbox Runtime
entity_type: concept
summary: The execution environment chosen for a sandboxed tool, determining the level of isolation and performance characteristics.
related_subsystems:
 - Sandbox
search_terms:
 - tool execution environment
 - sandboxing tools
 - inline vs worker runtime
 - external sandbox backend
 - how to isolate tool code
 - YAAF sandbox modes
 - Firecracker sandbox
 - gVisor sandbox
 - worker_threads for tools
 - secure tool execution
 - serializable tool functions
 - sandboxRuntime configuration
 - performance overhead of sandboxing
stub: false
compiled_at: 2026-04-24T18:01:12.045Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The Sandbox Runtime is the execution environment chosen for a tool call within the YAAF Sandbox subsystem. It defines the level of process and resource isolation applied to the tool, creating a trade-off between security and performance overhead. YAAF provides multiple runtime options to cater to different use cases, from low-overhead inline execution for trusted [Tools](../subsystems/tools.md) to high-isolation external environments for running untrusted code [Source 1].

## How It Works in YAAF

The runtime is selected via the `sandboxRuntime` property in the `SandboxConfig`. YAAF supports three distinct runtimes [Source 1].

### 'inline' Runtime

This is the default runtime. The tool function executes in the same thread and process as the agent.

*   **Performance:** It offers the highest performance, with approximately 0ms of overhead per tool call.
*   **Isolation:** Isolation is minimal. Network blocking is attempted by patching global objects, but this may not be fully reliable, especially in strict ESM environments on newer Node.js versions (v22+) where modules like `net.createConnection` may not be interceptible.
*   **Use Case:** Suitable for trusted, high-performance tools where strong isolation is not a primary concern [Source 1].

### 'worker' Runtime

This runtime executes the tool function in a dedicated Node.js `worker_thread`.

*   **Performance:** It introduces a moderate overhead of approximately 5-20ms per tool call, which includes the one-time cost of creating the worker.
*   **Isolation:** It provides significantly better isolation than the `inline` runtime. The tool runs with a fresh module graph, which allows for more reliable interception and blocking of network modules like `net.createConnection`, `http.request`, and `https.request`.
*   **Use Case:** Recommended for scenarios requiring reliable network blocking, for tools that execute arbitrary code, or for agents operating with high privileges.
*   **Constraint:** The tool function must be serializable via `fn.toString()`. It cannot rely on closures over non-serializable, module-scope state such as database connections or class instances. YAAF provides helper functions like `isSerializableFn` and `createSandboxTool` to validate and create serializable tool functions [Source 1].

### 'external' Runtime

This runtime delegates [Tool Execution](./tool-execution.md) to an external backend, providing the highest level of isolation.

*   **Performance:** The overhead is dependent on the specific backend implementation. Examples from the source material include ~1ms for gVisor and ~5ms for a Firecracker microVM snapshot-restore cycle.
*   **Isolation:** It offers maximum isolation by running the tool in a completely separate environment, such as a microVM or a container with a restricted kernel interface. This prevents the tool from sharing an address space, module graph, or kernel with the main agent process.
*   **Use Case:** Intended for maximum-security applications, particularly [when](../apis/when.md) running untrusted, third-party code.
*   **Constraint:** This runtime also requires that the tool function be serializable, identical to the `'worker'` runtime constraint. It must be configured with a `sandboxBackend` that implements the `SandboxExternalBackend` interface, such as the `FirecrackerSandboxBackend` [Source 1].

## Configuration

The Sandbox Runtime is configured when instantiating a `Sandbox` object.

**Inline (Default):**
If `sandboxRuntime` is not specified, it defaults to `'inline'`.

```typescript
import { Sandbox } from 'yaaf';

// 'inline' is the default runtime
const inlineSandbox = new Sandbox({
  timeoutMs: 10_000,
});
```
[Source 1]

**Worker:**
To use a worker thread, set `sandboxRuntime` to `'worker'`.

```typescript
import { Sandbox } from 'yaaf';

const workerSandbox = new Sandbox({
  sandboxRuntime: 'worker',
  timeoutMs: 15_000,
  blockNetwork: true, // Recommended for worker mode
});
```
[Source 1]

**External:**
To use an external backend, set `sandboxRuntime` to `'external'` and provide a `sandboxBackend` instance.

```typescript
import { Sandbox } from 'yaaf';
import { FirecrackerSandboxBackend } from 'yaaf/integrations/sandbox.firecracker';

// The backend must be initialized separately
const backend = new FirecrackerSandboxBackend({ 
  kernelImagePath: '...', 
  rootfsImagePath: '...' 
});
await backend.initialize();

const externalSandbox = new Sandbox({
  sandboxRuntime: 'external',
  sandboxBackend: backend,
  timeoutMs: 20_000,
});
```
[Source 1]

## Sources

[Source 1] src/sandbox.ts