---
summary: Provides a network-isolated worker thread environment for secure tool execution, addressing Node.js ESM strict-mode limitations.
primary_files:
 - src/sandbox.worker.ts
title: Sandbox Worker
entity_type: subsystem
search_terms:
 - secure tool execution
 - worker thread sandbox
 - network isolation for tools
 - Node.js ESM strict mode
 - sandbox proxy limitation
 - how to block network access in tools
 - isolated code execution
 - worker_threads security
 - YAAF sandbox runtime
 - evaluating functions in a worker
 - safe tool execution
stub: false
compiled_at: 2026-04-25T00:30:36.703Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.worker.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Sandbox Worker subsystem provides a secure, isolated environment for [Tool Execution](../concepts/tool-execution.md) within a dedicated Node.js `worker_thread` [Source 1]. Its primary purpose is to overcome a security limitation present in modern Node.js versions (v22+) related to ESM strict mode. In the main application thread, built-in modules like `net`, `http`, and `https` have their exports marked as non-configurable, which prevents the inline sandbox proxy from effectively blocking network access [Source 1].

By running tool code in a fresh worker thread, this subsystem gets a new, clean module graph. In this new context, the exports of network modules *are* configurable, allowing the [Sandbox System](./sandbox-system.md) to install proxies that reliably block or monitor network activity, thus ensuring a more secure execution environment [Source 1].

## Architecture

The Sandbox Worker is implemented as a script that runs inside a Node.js `worker_thread`. It is spawned and managed by the main [Sandbox System](./sandbox-system.md) when configured to do so. The architecture is based on a message-passing protocol between the main thread and the worker [Source 1].

### Initialization

1.  The main thread creates the worker, passing an initial configuration object, `workerData`, which must include a `blockNetwork` boolean [Source 1].
2.  Upon starting, the worker inspects `workerData.blockNetwork`. If `true`, it installs proxies on Node.js's built-in network modules (e.g., `net`, `http`, `https`) to prevent any outbound network connections [Source 1].

### Execution Protocol

Communication for [Tool Execution](../concepts/tool-execution.md) follows a request-response pattern using the `parentPort` for message passing [Source 1]:

1.  **Request from Main Thread**: The main thread posts a message to the worker with the shape `{ id, fnSrc, args }`, where `id` is a unique identifier for the request, `fnSrc` is the tool's function source code as a string, and `args` is an array of arguments for the function.
2.  **Worker Processing**: The worker listens for incoming messages. When a message is received, it uses `eval()` to deserialize the `fnSrc` string into an executable function. It then invokes this function with the provided `args`.
3.  **Response to Main Thread**: After the function completes or throws an error, the worker posts a result message back to the main thread.
    *   On success, the message is `{ id, ok: true, result }`, where `result` is the return value of the function.
    *   On failure, the message is `{ id, ok: false, error }`, where `error` is the captured exception.
4.  **Promise Resolution**: The main thread, having stored a `Promise` resolver associated with the request `id`, receives the response and resolves or rejects the promise accordingly, completing the tool execution cycle [Source 1].

## Integration Points

The Sandbox Worker is a core component of the YAAF [Sandboxing](./sandboxing.md) strategy and integrates with several other systems:

*   **[Sandbox System](./sandbox-system.md)**: This is the primary consumer of the Sandbox Worker. The [Sandbox System](./sandbox-system.md) is responsible for spawning, managing, and communicating with the worker thread.
*   **[Tool System](./tool-system.md)**: The [Tool System](./tool-system.md) relies on the [Sandbox System](./sandbox-system.md) for executing tools. When the worker runtime is active, tool code is ultimately executed within this subsystem.

## Key APIs

The Sandbox Worker does not export a conventional programmatic API. Its interface is defined by the message-passing protocol it uses with the main thread via `worker_threads` [Source 1].

*   **`workerData`**: The initial configuration object passed upon worker creation.
    *   `blockNetwork: boolean`: If `true`, the worker will install network-blocking proxies.
*   **Incoming Message Format**:
    ```typescript
    {
      id: string;    // Unique request ID
      fnSrc: string; // Function source code to be eval'd
      args: any[];   // Arguments for the function
    }
    ```
*   **Outgoing Message Format**:
    ```typescript
    // Success
    {
      id: string;
      ok: true;
      result: any;
    }

    // Error
    {
      id: string;
      ok: false;
      error: any;
    }
    ```

## Configuration

This subsystem is enabled and configured through the [SandboxConfig](../apis/sandbox-config.md) object, which is typically part of the main agent configuration.

*   To activate the Sandbox Worker, the `sandboxRuntime` property in [SandboxConfig](../apis/sandbox-config.md) must be set to `'worker'`.
*   The `blockNetwork` property in [SandboxConfig](../apis/sandbox-config.md) is passed directly to the worker's `workerData` to control its network isolation policy.

## Sources

[Source 1]: `src/sandbox.worker.ts`