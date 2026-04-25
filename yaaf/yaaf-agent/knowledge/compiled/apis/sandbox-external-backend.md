---
summary: An interface for external sandbox execution backends, allowing tools to run in isolated environments like microVMs or containers.
export_name: SandboxExternalBackend
source_file: src/sandbox.ts
category: interface
title: SandboxExternalBackend
entity_type: api
search_terms:
 - external tool execution
 - sandbox backend interface
 - how to create a custom sandbox
 - running tools in docker
 - running tools in firecracker
 - gVisor sandbox integration
 - secure tool execution
 - isolated agent tools
 - SandboxExternalBackend implementation
 - custom sandbox runtime
 - microVM tool execution
 - containerized tool sandbox
 - yaaf sandbox extension
stub: false
compiled_at: 2026-04-24T17:35:02.179Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `SandboxExternalBackend` is a TypeScript interface that defines the contract for an [External Sandbox Execution](../concepts/external-sandbox-execution.md) backend. It allows the `Sandbox` subsystem to delegate [Tool Execution](../concepts/tool-execution.md) to a separate, highly isolated environment, such as a Firecracker microVM, a gVisor-protected container, or any other external process [Source 2].

This interface is used [when](./when.md) the `Sandbox` is configured with `sandboxRuntime: 'external'`. The `Sandbox` class receives an object that implements this interface via its `sandboxBackend` configuration property. This decouples the core [Sandboxing](../subsystems/sandboxing.md) logic from the specifics of any particular isolation technology [Source 2].

Implementations of `SandboxExternalBackend` can be simple objects that fulfill the interface contract. They can also optionally extend `PluginBase` to integrate with the `PluginHost` for managed lifecycle events (initialization and disposal) and health checks. This dual-nature pattern allows developers to choose whether to use a backend standalone or as a managed plugin [Source 1, Source 2].

YAAF provides a production-grade implementation, `FirecrackerSandboxBackend`, for executing [Tools](../subsystems/tools.md) in lightweight microVMs [Source 1, Source 2].

## Signature

`SandboxExternalBackend` is an interface with two required methods.

```typescript
export interface SandboxExternalBackend {
  /**
   * Execute a serialized tool function in the external sandbox.
   */
  execute<T>(toolName: string, fnSrc: string, args: Record<string, unknown>): Promise<T>;

  /**
   * Shut down the backend gracefully.
   */
  dispose(): Promise<void>;
}
```
[Source 2]

## Methods & Properties

### execute()

Executes a tool function within the isolated external environment.

**Signature**
```typescript
execute<T>(toolName: string, fnSrc: string, args: Record<string, unknown>): Promise<T>
```

**Parameters**
- `toolName` [string]: The name of the tool being executed. This is primarily used for logging and creating informative error messages, such as on timeout [Source 2].
- `fnSrc` [string]: The source code of the tool function, obtained via `fn.toString()`. The function must be self-contained and not rely on non-serializable closures from its original module scope [Source 2].
- `args` [Record<string, unknown>]: The arguments for the tool function. This object must be structurally cloneable to be serialized and sent to the external environment [Source 2].

**Returns**
- `Promise<T>`: A promise that resolves with the tool's return value, which is deserialized from the sandbox environment [Source 2].

### dispose()

Shuts down the backend and releases any associated resources, such as running VMs, containers, or network connections.

**Signature**
```typescript
dispose(): Promise<void>
```

This method is called when the `Sandbox` is no longer needed. If the backend is managed by a `PluginHost`, this method will be called automatically during the host's shutdown sequence [Source 2].

**Returns**
- `Promise<void>`: A promise that resolves when cleanup is complete [Source 2].

## Examples

### Minimal Custom Implementation

The following example shows a minimal implementation of the `SandboxExternalBackend` interface, illustrating the required structure. A real implementation would involve communication with a subprocess or remote service (e.g., gVisor) [Source 2].

```typescript
import type { SandboxExternalBackend } from 'yaaf';

class MyGVisorBackend implements SandboxExternalBackend {
  async execute<T>(toolName: string, fnSrc: string, args: Record<string, unknown>): Promise<T> {
    console.log(`Executing tool '${toolName}' in gVisor...`);
    // In a real implementation, you would:
    // 1. Serialize fnSrc and args.
    // 2. Send the payload to a gVisor-wrapped Node.js process.
    // 3. Await the result.
    // 4. Deserialize and return the result.
    const result = (await eval(`(${fnSrc})`)(args)) as T;
    return result;
  }

  async dispose(): Promise<void> {
    // Cleanup any long-lived gVisor processes or resources.
    console.log('MyGVisorBackend disposed.');
  }
}
```

### Usage with Sandbox

To use an external backend, instantiate it and pass it to the `Sandbox` constructor, setting `sandboxRuntime` to `'external'`.

```typescript
import { Sandbox } from 'yaaf';
// Assuming MyGVisorBackend is defined as above
// and FirecrackerSandboxBackend is imported.

// Standalone usage (manual lifecycle management)
const myBackend = new MyGVisorBackend();
// or const myBackend = new FirecrackerSandboxBackend({ ... });
// await myBackend.initialize(); // If it has an init method

const sandbox = new Sandbox({
  sandboxRuntime: 'external',
  sandboxBackend: myBackend,
});

// The sandbox is now ready to execute tools using the external backend.
// ...

// Manual cleanup is required for standalone usage.
// await myBackend.dispose();
```
[Source 1, Source 2]

## See Also

- `Sandbox`: The primary consumer of this interface for [Tool Execution Isolation](../concepts/tool-execution-isolation.md).
- `FirecrackerSandboxBackend`: A concrete implementation of this interface that uses Firecracker microVMs.
- `PluginBase`: An optional base class for backends that require lifecycle management via `PluginHost`.