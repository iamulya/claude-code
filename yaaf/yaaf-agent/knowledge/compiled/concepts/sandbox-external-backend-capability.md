---
title: Sandbox External Backend Capability
entity_type: concept
summary: A plugin capability type for providing external execution environments for sandboxed tools.
related_subsystems:
 - Sandbox
search_terms:
 - external sandbox
 - how to isolate tool execution
 - Firecracker sandbox
 - gVisor sandbox
 - secure tool execution
 - sandboxRuntime external
 - SandboxExternalBackend interface
 - maximum isolation for agents
 - running tools in a microVM
 - nsjail integration
 - custom sandbox environment
 - serialize tool function
 - plugin for sandbox
 - agent security
stub: false
compiled_at: 2026-04-24T18:01:10.138Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Sandbox External Backend Capability is an extensibility point in YAAF's `Sandbox` subsystem that allows [Tool Execution](./tool-execution.md) to be delegated to a separate, isolated environment [Source 1]. This capability is activated [when](../apis/when.md) the `sandboxRuntime` is configured to `'external'`, providing the highest level of security and isolation for running agent [Tools](../subsystems/tools.md) [Source 1].

This pattern is designed for scenarios requiring maximum isolation, such as running untrusted code or tools with high privileges. By executing tools in an external environment like a Firecracker microVM, gVisor, or nsjail, the agent achieves separation at the kernel level, with no shared address space or module graph with the main agent process. This mitigates risks that cannot be fully addressed by in-process or worker-thread [Sandboxing](../subsystems/sandboxing.md), such as sophisticated exploits or certain types of side-[Channel](../apis/channel.md) attacks [Source 1].

## How It Works in YAAF

The capability is defined by the `SandboxExternalBackend` interface. Any object that conforms to this interface can serve as an external backend for the `Sandbox` [Source 1].

The interface specifies two methods [Source 1]:
1.  `execute<T>(toolName: string, fnSrc: string, args: Record<string, unknown>): Promise<T>`: This method receives the tool's name, its source code serialized via `fn.toString()`, and its arguments. The backend is responsible for executing this code in its isolated environment and returning the result.
2.  `dispose(): Promise<void>`: This method is called to gracefully shut down the backend and release any resources it holds.

When a tool is invoked through a `Sandbox` configured for an external runtime, the following occurs [Source 1]:
1.  The `Sandbox` serializes the tool's implementation function into a string.
2.  It passes this string, along with the tool's name and arguments, to the `execute` method of the configured `sandboxBackend`.
3.  The external backend runs the function in its environment (e.g., a microVM).
4.  The result is returned to the `Sandbox`, which then passes it back to the agent's control flow.

A critical constraint of this model is that tool functions must be serializable. They cannot rely on closures over non-serializable state from their original module scope, such as database connections, class instances, or sockets. Tools should be designed as pure or self-contained functions. YAAF provides [Utilities](../subsystems/utilities.md) like `isSerializableFn` and `createSandboxTool` to help developers validate that their tools are compatible with this execution mode [Source 1].

While the core contract is a plain interface, concrete implementations can optionally extend `PluginBase` to integrate with the `PluginHost` for managed lifecycle and health monitoring. YAAF provides a reference implementation, `FirecrackerSandboxBackend`, in the `yaaf/integrations/sandbox.firecracker` package [Source 1].

## Configuration

To use an external sandbox backend, a developer must configure the `Sandbox` with two properties: `sandboxRuntime` and `sandboxBackend` [Source 1].

The following example demonstrates configuring a `Sandbox` to use a custom external backend.

```typescript
// A custom backend implementation, e.g., for gVisor
class MyGVisorBackend implements SandboxExternalBackend {
  async execute<T>(toolName: string, fnSrc: string, args: Record<string, unknown>): Promise<T> {
    // Logic to send the function and args to a gVisor-wrapped subprocess
    // and return the result.
  }
  async dispose(): Promise<void> {
    // Cleanup logic for the gVisor processes.
  }
}

// Instantiate the backend
const myBackend = new MyGVisorBackend();

// Configure the Sandbox to use the external runtime and backend
const sandbox = new Sandbox({
  sandboxRuntime: 'external',
  sandboxBackend: myBackend,
  timeoutMs: 10_000,
});

// The agent will now execute tools using MyGVisorBackend
const agent = new Agent({
  systemPrompt: '...',
  tools: mySerializableTools,
  sandbox,
});
```
[Source 1]

The source material also shows how a backend that is also a plugin can be registered with a `PluginHost` for lifecycle management [Source 1].

```typescript
// Example using a backend that is also a YAAF Plugin
// (e.g., FirecrackerSandboxBackend)

// Assume `host` is an instance of PluginHost
await host.register(backend);

// The sandbox can be configured to use the plugin-managed backend
const sandbox = new Sandbox({
  sandboxRuntime: 'external',
  sandboxBackend: backend,
});
```
[Source 1]

## Sources
[Source 1] src/sandbox.ts