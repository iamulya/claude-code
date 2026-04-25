---
summary: The YAAF subsystem responsible for executing agent tools in a network-isolated Node.js worker thread, ensuring security and configurable network access.
primary_files:
 - src/sandbox.worker.ts
title: Sandbox Worker Subsystem
entity_type: subsystem
search_terms:
 - secure tool execution
 - isolated agent tools
 - worker thread sandbox
 - block network access for tools
 - YAAF sandbox runtime
 - how to isolate tool code
 - preventing tool network calls
 - SandboxConfig worker
 - ESM strict mode limitation
 - fresh module graph
 - worker_threads security
 - agent tool security
stub: false
compiled_at: 2026-04-24T18:18:42.315Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.worker.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Sandbox Worker Subsystem provides a secure, network-isolated environment for executing agent [Tools](./tools.md) [Source 1]. Its primary purpose is to run tool code in a separate Node.js `worker_thread`, which allows for fine-grained control over network access.

This subsystem specifically addresses a limitation in recent Node.js versions (v22+) where ESM strict mode prevents modification of built-in module exports like `net`, `http`, and `https` in the main thread. By launching a new worker, YAAF gets a fresh module graph where these exports are configurable, enabling the installation of network-blocking proxies before any user code can run [Source 1].

## Architecture

The subsystem is implemented as a single script, `src/sandbox.worker.ts`, designed to be run within a Node.js `worker_thread` [Source 1]. It communicates with the main application thread via a defined message-passing protocol.

The operational flow is as follows [Source 1]:
1.  **Initialization**: The main thread spawns the worker, passing configuration such as `{ blockNetwork: boolean }` via the `workerData` property.
2.  **Proxy Installation**: Upon startup, the worker checks the `blockNetwork` flag. If true, it installs proxies over Node.js's core networking modules (`net`, `http`, `https`) to intercept and block outbound connections. This is possible due to the worker's fresh module graph.
3.  **Task Reception**: The worker listens for messages from the main thread via `parentPort`. Each message represents a [Tool Execution](../concepts/tool-execution.md) request and contains a unique `id`, the function's source code as a string (`fnSrc`), and its arguments (`args`).
4.  **Execution**: The worker uses `eval()` to deserialize `fnSrc` into a function, then invokes it with the provided `args`.
5.  **Result Transmission**: After execution completes, the worker posts a result message back to the main thread. A successful execution sends `{ id, ok: true, result }`, while an error sends `{ id, ok: false, error }`.
6.  **Promise Resolution**: The main thread receives the message and uses the `id` to resolve or reject the corresponding Promise that initiated the tool execution request.

## Key APIs

This subsystem does not expose a direct, public-facing API. Its interaction with the rest of the framework is managed internally through the Node.js `worker_threads` message-passing protocol, using `parentPort` to communicate with the main application thread [Source 1].

## Configuration

This subsystem is activated and configured through the agent's `SandboxConfig`.
-   **Enabling the Worker**: To use this subsystem, the `sandboxRuntime` property in `SandboxConfig` must be set to `'worker'` [Source 1].
-   **Network Control**: The main thread passes a `blockNetwork` boolean in the `workerData` [when](../apis/when.md) creating the worker, which determines whether network access from within the sandbox is permitted [Source 1].

## Sources

[Source 1]: src/sandbox.worker.ts