---
summary: A YAAF plugin that provides a Firecracker microVM sandbox for secure and isolated tool execution, offering maximum isolation for agent tool functions.
capabilities:
 - sandbox
title: FirecrackerSandboxBackend
entity_type: plugin
search_terms:
 - secure tool execution
 - isolated agent tools
 - Firecracker microVM for agents
 - KVM sandbox
 - maximum isolation sandbox
 - how to sandbox agent tools
 - prevent kernel escape
 - block network access for tools
 - ephemeral filesystem for tools
 - vsock communication
 - YAAF external sandbox
 - jailer integration
 - fast VM boot
 - microVM agent runtime
stub: false
compiled_at: 2026-04-24T18:08:42.061Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `FirecrackerSandboxBackend` is a plugin that provides a high-security sandbox for agent [Tool Execution](../concepts/tool-execution.md) by running [Tools](../subsystems/tools.md) inside Firecracker microVMs [Source 1]. It is designed to be used with the YAAF Sandbox subsystem [when](../apis/when.md) the `sandboxRuntime` is configured to `'external'` [Source 2].

This backend offers maximum isolation by running each tool in a separate Linux kernel as a KVM guest. This prevents any shared address space with the host system. Key security features include [Source 1]:
*   **[Network Isolation](../concepts/network-isolation.md)**: No network interface controller (NIC) is configured by default, blocking all TCP and UDP traffic at the hypervisor level.
*   **Ephemeral Filesystem**: The root filesystem is ephemeral, meaning any changes made by the tool are discarded after execution.
*   **Process Isolation**: The VM is hard-killed on timeout, preventing any process state from leaking back to the host.
*   **Kernel-level Separation**: Protects against kernel escape vulnerabilities and unauthorized filesystem access.

The following table compares the isolation tiers achieved by this backend against other sandbox runtimes [Source 1]:

| Threat                   | FirecrackerSandboxBackend | Worker thread | Inline |
| ------------------------ | :-----------------------: | :-----------: | :----: |
| TCP bypass               |             ✅            |       ✅      |   ⚠️   |
| UDP bypass               |             ✅            |       ❌      |   ❌   |
| Native addon bypass      |             ✅            |       ❌      |   ❌   |
| Kernel escape → host     |             ✅            |       ❌      |   ❌   |
| Filesystem access        |             ✅            |       ❌      |   ❌   |

## Installation

The `FirecrackerSandboxBackend` is available as an integration. It can be imported from its module path [Source 1].

```typescript
import { FirecrackerSandboxBackend } from 'yaaf/Integrations/sandbox.firecracker';
```

This plugin has significant host system requirements and is **Linux-only**. The following must be installed and configured on the host machine [Source 1]:
*   An x86_64 or aarch64 CPU with hardware virtualization support.
*   The user running the YAAF agent must have read access to `/dev/kvm` (e.g., by being in the `kvm` group).
*   The `firecracker` binary must be in the system's `PATH` or specified via the `firecrackerBin` configuration option.
*   A pre-built Linux kernel image (e.g., `vmlinux.bin`).
*   A pre-built ext4 root filesystem image containing Node.js, `socat`, and the `yaaf-agent.js` guest script.

## Configuration

The `FirecrackerSandboxBackend` is configured via its constructor, which accepts a `FirecrackerSandboxConfig` object.

```typescript
import { FirecrackerSandboxBackend } from 'yaaf/Integrations/sandbox.firecracker';
import { Sandbox } from 'yaaf/sandbox';

// Configuration for the Firecracker backend
const backend = new FirecrackerSandboxBackend({
  kernelImagePath: '/path/to/vmlinux.bin',
  rootfsImagePath: '/path/to/yaaf-rootfs.ext4',
  snapshotDir: '/path/to/snapshots/node22', // Optional: for fast resume
  poolSize: 2, // Number of pre-warmed VMs
  timeoutMs: 30000,
  vcpuCount: 1,
  memSizeMib: 128,
});

// Initialize the backend (boots the VM pool)
await backend.initialize();

// Inject the backend into the Sandbox subsystem
const sandbox = new Sandbox({
  sandboxRuntime: 'external',
  sandboxBackend: backend,
});

// ... now use the sandbox with an agent ...

// Clean up resources on shutdown
await backend.dispose();
```
[Source 1]

### Configuration Parameters

*   `firecrackerBin` (string, optional): Path to the `firecracker` binary. Defaults to searching the system `PATH` [Source 1].
*   `kernelImagePath` (string, required): Path to the Linux kernel image (`vmlinux.bin` or `bzImage`) [Source 1].
*   `rootfsImagePath` (string, required): Path to the ext4 root filesystem image containing the Node.js runtime and guest agent script [Source 1].
*   `snapshotDir` (string, optional): If provided, VMs are resumed from a snapshot for faster startup (~5ms) instead of cold-booting (~125ms) [Source 1].
*   `vcpuCount` (number, optional): Number of virtual CPUs per microVM. Defaults to `1` [Source 1].
*   `memSizeMib` (number, optional): RAM per microVM in MiB. Defaults to `128` [Source 1].
*   `poolSize` (number, optional): Number of pre-warmed, ready-to-use VM slots. Defaults to `2`. A size of `0` disables pre-warming [Source 1].
*   `timeoutMs` (number, optional): Per-call timeout in milliseconds. The VM is killed if execution exceeds this limit. Defaults to `30000` [Source 1].
*   `vsockPort` (number, optional): The vsock port the guest agent listens on. Must match the agent script in the rootfs. Defaults to `52` [Source 1].
*   `socketDir` (string, optional): Directory for creating Firecracker API and vsock sockets. Defaults to `'/tmp'` [Source 1].
*   `jailerBin` (string, optional): Path to the `jailer` binary to apply extra process isolation and resource limits to the Firecracker process [Source 1].

## Capabilities

### Sandbox Backend

The `FirecrackerSandboxBackend` implements the `SandboxExternalBackend` interface, making it a valid backend for the main `Sandbox` subsystem when `sandboxRuntime` is set to `'external'` [Source 1, Source 2].

When a tool is executed, the following process occurs:
1.  The tool function is serialized to a string using `fn.toString()` [Source 1, Source 2].
2.  The serialized function and its arguments are sent to a small Node.js agent running inside a Firecracker microVM [Source 1].
3.  Communication happens over Firecracker's vsock device, which bridges a UNIX domain socket on the host to a vsock port in the guest, avoiding the need for a network TAP device [Source 1].
4.  The result is sent back from the guest to the host and returned to the agent [Source 1].

The plugin can be managed standalone or integrated into the YAAF plugin lifecycle. When registered with a `PluginHost`, its `initialize()` and `dispose()` methods are called automatically [Source 1].

## Limitations

*   **Operating System**: This backend is Linux-only and requires KVM, so it cannot be used on macOS or Windows [Source 1].
*   **Hardware**: It requires a CPU with hardware virtualization support (Intel VT-x or AMD-V) [Source 1].
*   **Function Serialization**: Tool functions must be serializable via `fn.toString()`. They cannot close over non-serializable state from their defining module, such as database connections, class instances, or other live objects. Tools should be designed as pure, self-contained functions [Source 2].
*   **Setup Complexity**: Requires building or obtaining a compatible Linux kernel and a root filesystem image with Node.js and other dependencies pre-installed [Source 1].

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/sandbox.firecracker.ts
[Source 2]: src/sandbox.ts