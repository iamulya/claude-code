---
title: Tool Execution Isolation
entity_type: concept
summary: The principle of running agent tools in a controlled and isolated environment to prevent malicious actions, resource exhaustion, or unintended side effects.
primary_files:
 - src/sandbox.ts
 - src/utils/permissions/filesystem.ts
related_subsystems:
 - AgentRunner
 - Tooling
search_terms:
 - sandbox tools
 - secure tool execution
 - agent security
 - preventing malicious tool code
 - resource limits for tools
 - filesystem access control
 - network access control for agents
 - tool timeout
 - worker thread isolation
 - external sandbox runtime
 - Firecracker sandbox
 - gVisor sandbox
 - how to isolate agent tools
 - YAAF sandbox
stub: false
compiled_at: 2026-04-24T18:04:13.746Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

[Tool Execution](./tool-execution.md) Isolation is a security and stability principle in YAAF where agent [Tools](../subsystems/tools.md) are executed within a controlled environment, or "sandbox." This practice is essential because agents may be granted access to powerful tools that can interact with the filesystem, make network requests, or execute code. Isolation prevents potentially malicious or buggy tools from causing unintended side effects, exhausting system resources, or compromising the host system [Source 1].

The primary goals of tool execution isolation are:
*   **Security:** To prevent unauthorized access to files, network endpoints, or system resources.
*   **Stability:** To protect the main agent process from tool crashes or infinite loops by enforcing resource limits, such as execution time.
*   **Containment:** To ensure that a tool's actions are confined to a designated scope, minimizing its potential impact on the broader system.

## How It Works in YAAF

In YAAF, this concept is implemented by the `Sandbox` class. The sandbox is designed to be transparent; it wraps [Tool Calls](./tool-calls.md) at the AgentRunner level, meaning the tools themselves are unaware they are being executed in a controlled environment [Source 1].

The YAAF `Sandbox` provides several layers of isolation and control:

*   **[Execution Timeout](./execution-timeout.md):** A hard time limit (`timeoutMs`) is enforced on every tool call. If a tool exceeds this duration, its execution is aborted to prevent hangs or infinite loops [Source 1].
*   **[Path Guard](./path-guard.md):** Filesystem access can be restricted to a list of allowed directories (`allowedPaths`). Any attempt by a tool to access a path outside this allowlist is blocked before the tool's code is even executed. This is implemented by the path guard utility found in `src/utils/permissions/filesystem.ts` [Source 1].
*   **[Network Guard](./network-guard.md):** The sandbox can be configured to block outbound network requests. This guard has a significant limitation: it primarily works by inspecting tool arguments for URL patterns before execution. It does not, by default, intercept runtime network calls made from within the tool's code using libraries other than a specially injected `fetch` function. For comprehensive network blocking, a more robust runtime is required [Source 1].
*   **Runtime Isolation:** YAAF supports multiple execution runtimes (`sandboxRuntime`) with varying levels of isolation and performance overhead [Source 1]:
    *   `'inline'` (Default): The tool runs in the same thread as the agent. This offers the lowest overhead but also the weakest isolation.
    *   `'worker'`: The tool runs in a dedicated Node.js `worker_thread`. This provides process-level isolation with a fresh module graph, enabling more reliable network call interception. It introduces a small overhead per tool call.
    *   `'external'`: The tool runs in a completely separate, external environment like a Firecracker microVM or gVisor. This offers the maximum possible isolation (e.g., separate kernel, no shared [Memory](./memory.md)) and is managed via a `SandboxExternalBackend` interface.

[when](../apis/when.md) using the `'worker'` or `'external'` runtimes, tool functions must be serializable, as they are transferred to the isolated environment via `fn.toString()`. This means they cannot rely on non-serializable closures like database connections or class instances. YAAF provides helper functions like `isSerializableFn` and `createSandboxTool` to help developers write compatible tools [Source 1].

## Configuration

A sandbox is configured by creating an instance of the `Sandbox` class with a `SandboxConfig` object and passing it to the `Agent` constructor.

```typescript
// Example of configuring a Sandbox
const sandbox = new Sandbox({
  timeoutMs: 10_000, // 10-second timeout
  allowedPaths: ['/home/user/project', '/tmp'], // Restrict FS access
  blockNetwork: false, // Allow network access
  sandboxRuntime: 'worker', // Run tools in a separate worker thread
});

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: myTools,
  sandbox, // Apply the sandbox to the agent
});
```
[Source 1]

YAAF also provides convenient factory functions for common configurations:
*   `strictSandbox(rootDir)`: Creates a highly restrictive sandbox that blocks network access and confines filesystem access to a single directory [Source 1].
*   `projectSandbox(projectDir)`: Creates a sandbox that restricts filesystem access to a project directory but allows network access, a common configuration for development tools [Source 1].

## Sources
[Source 1]: src/sandbox.ts