---
summary: The YAAF subsystem responsible for providing secure and isolated environments for executing agent tools and code, ensuring safety and resource management.
primary_files:
 - src/sandbox.ts
 - src/integrations/sandbox.firecracker.ts
title: Sandbox System
entity_type: subsystem
exports:
 - FirecrackerSandboxBackend
 - FirecrackerSandboxConfig
 - SandboxExternalBackend
search_terms:
 - secure tool execution
 - isolated code execution
 - agent safety
 - preventing malicious tools
 - YAAF security model
 - Firecracker microVM integration
 - how to run untrusted code
 - sandboxing agent functions
 - resource management for tools
 - KVM isolation
 - vsock communication
 - microVM sandbox
 - jailer process isolation
stub: false
compiled_at: 2026-04-24T18:18:49.776Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Sandbox System provides secure, isolated environments for executing agent [Tools](./tools.md). Its primary purpose is to mitigate security risks associated with running potentially untrusted or resource-intensive code generated or invoked by an [LLM](../concepts/llm.md). It establishes a boundary between the agent's core process and the [Tool Execution](../concepts/tool-execution.md) environment, preventing threats such as unauthorized network access, filesystem manipulation, or host kernel exploits [Source 1].

## Architecture

The Sandbox System is designed with a pluggable backend architecture. A central `Sandbox` component orchestrates tool execution, delegating the actual execution to a configured backend that implements the `SandboxExternalBackend` interface. This allows developers to choose an isolation level appropriate for their security needs and operational environment [Source 1].

One of the primary backend implementations is the `FirecrackerSandboxBackend`, which offers maximum isolation by running tools inside Firecracker microVMs [Source 1].

### Firecracker Backend

The `FirecrackerSandboxBackend` leverages KVM to run each tool in a separate, lightweight virtual machine with its own Linux kernel. This architecture provides several layers of security [Source 1]:

*   **Kernel-Level Isolation**: The tool code runs in a KVM guest, meaning it does not share an address space or kernel with the host operating system. This mitigates kernel escape vulnerabilities.
*   **[Network Isolation](../concepts/network-isolation.md)**: By default, microVMs are created without a network interface card (NIC). Communication between the host and the guest occurs over Firecracker's vsock device, which maps a UNIX domain socket on the host to a vsock port in the guest. This prevents accidental or malicious network access, including both TCP and UDP protocols.
*   **Filesystem Isolation**: The microVMs use an ephemeral root filesystem. Any changes made to the filesystem during tool execution are discarded [when](../apis/when.md) the VM is shut down.
*   **Process Isolation**: A strict timeout is enforced for each execution. If a tool exceeds its time limit, the entire microVM process is terminated with a `SIGKILL` signal, preventing state leakage. For additional hardening, the `jailer` binary can be used to apply cgroup resource limits before the VM even starts.

The following table from the source material compares the isolation tiers provided by the Firecracker backend against other potential [Sandboxing](./sandboxing.md) strategies [Source 1]:

| Threat                  | Firecracker Backend | Worker Thread | Inline |
| ----------------------- | :-----------------: | :-----------: | :----: |
| TCP bypass              |          ✅         |       ✅      |   ⚠️    |
| UDP bypass              |          ✅         |       ❌      |   ❌   |
| Native addon bypass     |          ✅         |       ❌      |   ❌   |
| Kernel escape → host    |          ✅         |       ❌      |   ❌   |
| Filesystem access       |          ✅         |       ❌      |   ❌   |

## Integration Points

The Sandbox System is primarily integrated by the agent's core execution loop, which invokes the sandbox to run tools. The `FirecrackerSandboxBackend` itself demonstrates two integration patterns [Source 1]:

1.  **Standalone Usage**: A developer can instantiate, initialize, and manage the backend manually. The `Sandbox` service is then configured to use this manually managed instance.
2.  **PluginHost Integration**: The `FirecrackerSandboxBackend` also implements the `PluginBase` interface. This allows it to be registered with the YAAF `PluginHost`, which then automatically manages its lifecycle (initialization and disposal).

The following examples illustrate these two patterns [Source 1]:

**Standalone Integration**
```ts
const backend = new FirecrackerSandboxBackend({
  kernelImagePath: '/images/vmlinux.bin',
  rootfsImagePath: '/images/yaaf-rootfs.ext4',
  snapshotDir: '/images/snapshots/node22',
});
await backend.initialize(); // boots the VM pool

const sandbox = new Sandbox({ sandboxRuntime: 'external', sandboxBackend: backend });
const result = await sandbox.execute('myTool', args, myToolFn);

await backend.dispose();
```

**PluginHost Integration**
```ts
const backend = new FirecrackerSandboxBackend({ ... });
await host.register(backend); // calls initialize() automatically
sandbox.setBackend(backend);
// host.destroyAll() will call backend.destroy() at shutdown
```

## Key APIs

*   **`SandboxExternalBackend`**: An interface that defines the contract for a sandbox implementation. Custom backends must adhere to this interface to be compatible with the core `Sandbox` service [Source 1].
*   **`FirecrackerSandboxBackend`**: A concrete class that implements `SandboxExternalBackend` using Firecracker microVMs. It manages a pool of pre-warmed VMs to execute tool functions securely and efficiently [Source 1].
*   **`FirecrackerSandboxConfig`**: A type definition for the configuration object required to instantiate `FirecrackerSandboxBackend` [Source 1].

## Configuration

When using the `FirecrackerSandboxBackend`, a configuration object of type `FirecrackerSandboxConfig` is required. Key options include [Source 1]:

*   `firecrackerBin`: Path to the `firecracker` executable.
*   `kernelImagePath`: Path to the Linux kernel image (e.g., `vmlinux.bin`) for the microVMs.
*   `rootfsImagePath`: Path to the ext4 root filesystem image, which must contain a Node.js runtime and a YAAF guest agent script.
*   `snapshotDir`: Optional path to a Firecracker snapshot directory. Using snapshots can reduce VM startup time from ~125ms to ~5ms.
*   `poolSize`: The number of pre-warmed microVMs to keep ready. Requests are queued if all VMs are busy. Default is `2`.
*   `vcpuCount`: Number of virtual CPUs per microVM. Default is `1`.
*   `memSizeMib`: RAM in MiB for each microVM. Default is `128`.
*   `timeoutMs`: Per-call [Execution Timeout](../concepts/execution-timeout.md) in milliseconds. Default is `30,000`.
*   `jailerBin`: Optional path to the `jailer` binary for enhanced process isolation using cgroups.

## Extension Points

The primary extension point for the Sandbox System is the `SandboxExternalBackend` interface. Developers can create custom sandbox implementations to support different isolation technologies (e.g., Docker containers, WebAssembly runtimes, or simple worker threads) by creating a class that implements this interface. The core `Sandbox` service can then use this new backend without modification [Source 1].

## Sources

[Source 1]: src/[Integrations](./integrations.md)/sandbox.firecracker.ts