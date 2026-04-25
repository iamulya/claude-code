---
title: Configuring Tool Sandboxing
entity_type: guide
summary: A guide on how to configure and apply sandboxing to agent tools for enhanced security and resource management.
difficulty: intermediate
search_terms:
 - secure agent tools
 - agent security
 - tool execution timeout
 - restrict file system access
 - block network access for tools
 - how to sandbox LLM tools
 - YAAF sandbox configuration
 - worker thread isolation
 - Firecracker sandbox
 - serializable tool functions
 - prevent malicious tool code
 - resource control for agents
 - strictSandbox vs projectSandbox
 - agent tool isolation
stub: false
compiled_at: 2026-04-24T18:06:31.869Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

This guide walks through the process of configuring and applying the YAAF `Sandbox` to agent [Tools](../subsystems/tools.md). The `Sandbox` provides a layer of security and resource control by isolating [Tool Execution](../concepts/tool-execution.md). It can enforce timeouts, restrict file system and network access, and run tools in different execution runtimes for varying levels of isolation [Source 1].

By following this guide, you will learn how to:
- Create and configure a `Sandbox` instance.
- Apply the sandbox to an agent.
- Configure different security policies, including path and network guards.
- Choose the appropriate execution runtime (`inline`, `worker`, or `external`) for your use case.
- Handle the constraints of isolated runtimes, such as function serialization.

## Prerequisites

Before starting, you should have a basic YAAF agent set up with one or more tools defined. This guide focuses on the `Sandbox` component, assuming the agent and tools already exist.

## Step-by-Step

### Step 1: Create a Sandbox Instance

The first step is to import and instantiate the `Sandbox` class. The constructor accepts a `SandboxConfig` object where you can define security policies [Source 1].

This example creates a sandbox that:
- Terminates any tool call that runs longer than 10 seconds.
- Allows tools to access files only within `/home/user/project` and `/tmp`.
- Allows outbound network access.

```typescript
import { Sandbox, Agent } from 'yaaf'; // Assuming imports from the framework

// Define your tools
const myTools = [/* ... your tool definitions ... */];

const sandbox = new Sandbox({
  timeoutMs: 10_000, // 10 seconds
  allowedPaths: ['/home/user/project', '/tmp'],
  blockNetwork: false,
});
```

### Step 2: Apply the Sandbox to an Agent

Once the `Sandbox` instance is configured, pass it to the `Agent` constructor. The sandbox is applied transparently at the `AgentRunner` level, meaning the tools themselves do not need to be aware of it [Source 1].

```typescript
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: myTools,
  sandbox, // Pass the configured sandbox instance
});
```

### Step 3: Configure Network Blocking

To restrict network access, set `blockNetwork` to `true`. It is important to understand the limitations of this feature. By default, it inspects tool arguments for URL patterns before execution. It does not intercept runtime network calls made from within the tool's code, such as those using `fetch()` or `http.request()` [Source 1].

For more robust runtime network blocking, you can provide a `sandboxFetch` implementation. This function is injected into the tool's arguments as `args.__sandboxFetch`, and tools must be designed to use it instead of the global `fetch` [Source 1].

```typescript
const networkBlockingSandbox = new Sandbox({
  blockNetwork: true,
  // This implementation will throw an error for any network call.
  sandboxFetch: (input, init) => {
    throw new Error('Network access blocked by sandbox');
  },
});
```

### Step 4: Choose an Execution Runtime

The `sandboxRuntime` option controls the execution environment for tools, offering different trade-offs between performance and isolation [Source 1].

- **`'inline'` (Default):** Runs the tool in the same thread as the agent. It has minimal overhead but offers the least isolation.
- **`'worker'`:** Runs the tool in a separate `worker_thread`. This provides module graph and [Memory](../concepts/memory.md) isolation, and enables more reliable network interception. It adds a small overhead (~5-20ms) per tool call. Recommended for tools that execute code or require network blocking.
- **`'external'`:** Runs the tool in an external backend like a Firecracker microVM or gVisor. This offers maximum isolation (separate kernel, no shared memory). It requires a `sandboxBackend` to be configured.

```typescript
// Example of configuring a sandbox to use a worker thread
const workerSandbox = new Sandbox({
  sandboxRuntime: 'worker',
  timeoutMs: 15_000,
  blockNetwork: true, // More effective in 'worker' mode
});
```

### Step 5: Write Serializable Tools for Isolated Runtimes

[when](../apis/when.md) using `'worker'` or `'external'` runtimes, the tool's implementation function is serialized using `fn.toString()` and sent to the isolated environment. This means the function cannot rely on closures over non-serializable state, such as database connections, class instances, or module-scope variables [Source 1].

To avoid runtime errors, design tools as pure functions or use the `createSandboxTool` helper. This utility performs a check at definition time and throws an error if the function appears to be non-serializable [Source 1].

```typescript
import { createSandboxTool } from 'yaaf';

// ❌ This will fail in 'worker' or 'external' mode because it closes over `db`.
// const db = await connectToDatabase();
// const badToolFn = (args) => db.query(args.sql);

// ✅ This is safe because it uses a dynamic import inside the function body.
const goodToolFn = createSandboxTool(async (args: { path: string }) => {
  const { readFile } = await import('node:fs/promises');
  return readFile(args.path, 'utf8');
});
```

### Step 6: Use Sandbox Presets

For common use cases, YAAF provides factory functions to create pre-configured sandboxes [Source 1].

- **`strictSandbox(rootDir, timeoutMs)`:** Creates a highly restrictive sandbox. It limits file access to a single directory and blocks network access.
- **`projectSandbox(projectDir, timeoutMs)`:** Creates a sandbox that restricts file access to the current project directory but allows network access, which is a common requirement for many tools.

```typescript
import { projectSandbox } from 'yaaf';

// Create a sandbox restricted to the current working directory
const sandbox = projectSandbox(process.cwd(), 30_000);

const agent = new Agent({
  // ...
  sandbox,
});
```

## Configuration Reference

The following options can be passed in the `SandboxConfig` object to the `Sandbox` constructor [Source 1].

| Option           | Type                                                 | Default                               | Description                                                                                                                                                           |
| ---------------- | ---------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timeoutMs`      | `number`                                             | `30_000`                              | Maximum milliseconds a tool call can run before being terminated.                                                                                                     |
| `allowedPaths`   | `string[]`                                           | `[]`                                  | A whitelist of directory paths the tool is allowed to access. An empty array disables path checking.                                                                  |
| `blockedPaths`   | `string[]`                                           | `undefined`                           | A blacklist of paths that takes precedence over `allowedPaths`.                                                                                                       |
| `blockNetwork`   | `boolean`                                            | `false`                               | If `true`, restricts outbound network access by scanning tool arguments for URLs. See `sandboxFetch` and `sandboxRuntime` for more robust blocking.                    |
| `sandboxFetch`   | `typeof globalThis.fetch`                            | `undefined`                           | An interceptor function for `fetch` calls. Injected as `args.__sandboxFetch` for tools to use.                                                                        |
| `pathValidator`  | `(toolName: string, resolvedPath: string) => boolean` | `undefined`                           | A callback for runtime path validation, useful for tools that construct paths dynamically.                                                                            |
| `onViolation`    | `(violation: SandboxViolation) => void`              | Throws `SandboxError`                 | A callback function invoked when the sandbox blocks an action.                                                                                                        |
| `debug`          | `boolean`                                            | `false`                               | If `true`, emits detailed logs for every sandbox decision.                                                                                                            |
| `sandboxRuntime` | `"inline" \| "worker" \| "external"`                 | `"inline"`                            | The execution environment for the tool.                                                                                                                               |
| `sandboxBackend` | `SandboxExternalBackend`                             | `undefined`                           | An instance of an external sandbox implementation, required when `sandboxRuntime` is `'external'`.                                                                    |

## Common Mistakes

1.  **Misunderstanding Network Blocking:** Setting `blockNetwork: true` with the default `'inline'` runtime only performs a pre-execution scan of tool arguments for URLs. It does not stop a tool from constructing a URL dynamically and making a network request at runtime. For true [Network Isolation](../concepts/network-isolation.md), use the `'worker'` runtime or an OS-level control like a network namespace [Source 1].

2.  **Using Non-Serializable Tools with Isolated Runtimes:** In `'worker'` or `'external'` mode, tool functions that close over external state (like database clients or class instances) will fail at runtime because that state cannot be transferred to the isolated environment. Always use the `createSandboxTool` helper to catch these issues at definition time or design tools as pure, self-contained functions [Source 1].

3.  **Assuming Path Guards Catch All File Access:** The `allowedPaths` check scans tool arguments for file paths. A tool that constructs a path dynamically inside its implementation can bypass this check. For more robust validation, implement a `pathValidator` callback that can be called by the tool at runtime to check dynamically resolved paths [Source 1].

## Sources
[Source 1] src/sandbox.ts