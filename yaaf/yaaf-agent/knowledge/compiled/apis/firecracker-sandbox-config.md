---
summary: Configuration options for the FirecrackerSandboxBackend plugin, specifying paths, resources, and operational parameters for the microVMs.
export_name: FirecrackerSandboxConfig
source_file: src/integrations/sandbox.firecracker.ts
category: type
title: FirecrackerSandboxConfig
entity_type: api
search_terms:
 - firecracker configuration
 - microVM sandbox settings
 - configure sandbox backend
 - kernel image path
 - rootfs image path
 - firecracker snapshot directory
 - vm pool size
 - microVM resources
 - vcpu count
 - memory size mib
 - jailer binary path
 - vsock port configuration
 - sandbox timeout
 - socket directory
stub: false
compiled_at: 2026-04-24T17:06:56.011Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`FirecrackerSandboxConfig` is a TypeScript type alias that defines the configuration object for the `FirecrackerSandboxBackend` class [Source 1]. This object is used to specify all the necessary parameters for creating and managing Firecracker microVMs, which provide a highly isolated environment for [Tool Execution](../concepts/tool-execution.md) [Source 1].

The configuration includes paths to essential binaries and images (like the Firecracker binary, Linux kernel, and root filesystem), resource allocation for each microVM (vCPUs, [Memory](../concepts/memory.md)), operational parameters (pooling, timeouts), and settings for communication and security (vsock ports, jailer integration) [Source 1].

## Signature

`FirecrackerSandboxConfig` is a type alias for an object with the following properties [Source 1]:

```typescript
export type FirecrackerSandboxConfig = {
  /**
   * Path to the `firecracker` binary.
   * Default: `'firecracker'` (on PATH).
   */
  firecrackerBin?: string;

  /**
   * Path to the Linux kernel image (`vmlinux.bin` or `bzImage`).
   */
  kernelImagePath: string;

  /**
   * Path to the ext4 rootfs image containing Node.js, socat, and the
   * guest execution agent (`yaaf-agent.js`).
   */
  rootfsImagePath: string;

  /**
   * If set, resume VMs from a pre-taken Firecracker snapshot directory
   * instead of cold-booting. Reduces startup time from ~125ms to ~5ms.
   */
  snapshotDir?: string;

  /**
   * Number of virtual CPUs per microVM.
   * Default: `1`.
   */
  vcpuCount?: number;

  /**
   * RAM per microVM in MiB.
   * Default: `128`.
   */
  memSizeMib?: number;

  /**
   * Number of pre-warmed VM slots in the pool.
   * Default: `2`.
   */
  poolSize?: number;

  /**
   * Per-call timeout in ms. The VM is hard-killed if this elapses.
   * Default: `30_000`.
   */
  timeoutMs?: number;

  /**
   * vsock port the guest `yaaf-agent.js` listens on.
   * Default: `52`.
   */
  vsockPort?: number;

  /**
   * Directory for Firecracker API sockets and vsock UDS files.
   * Default: `'/tmp'`.
   */
  socketDir?: string;

  /**
   * Optional path to the `jailer` binary for extra process isolation.
   */
  jailerBin?: string;
};
```

## Examples

The following example demonstrates how to create a `FirecrackerSandboxConfig` object and use it to instantiate the `FirecrackerSandboxBackend` [Source 1].

```typescript
import { FirecrackerSandboxBackend, FirecrackerSandboxConfig } from 'yaaf';

// Define the configuration for the Firecracker sandbox
const config: FirecrackerSandboxConfig = {
  // Required paths to the kernel and root filesystem images
  kernelImagePath: '/path/to/vmlinux.bin',
  rootfsImagePath: '/path/to/yaaf-rootfs.ext4',

  // Optional: Use a snapshot for faster VM startup
  snapshotDir: '/path/to/snapshots/node22',

  // Optional: Customize VM resources and pool size
  vcpuCount: 2,
  memSizeMib: 256,
  poolSize: 4,

  // Optional: Specify path to the firecracker binary if not in PATH
  firecrackerBin: '/usr/local/bin/firecracker',

  // Optional: Increase the execution timeout for long-running tools
  timeoutMs: 60000, // 60 seconds
};

// Instantiate the backend with the configuration
const backend = new FirecrackerSandboxBackend(config);

// The backend can now be initialized and used with a Sandbox instance
// await backend.initialize();
// const sandbox = new Sandbox({ sandboxRuntime: 'external', sandboxBackend: backend });
```

## See Also

*   `FirecrackerSandboxBackend`: The class that uses this configuration object to manage Firecracker microVMs.

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/sandbox.firecracker.ts