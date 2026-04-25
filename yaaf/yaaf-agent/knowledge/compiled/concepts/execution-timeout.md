---
summary: A mechanism to automatically terminate long-running or unresponsive tool executions after a specified duration.
title: Execution Timeout
entity_type: concept
related_subsystems:
 - Sandbox
see_also:
 - "[Tool Execution](./tool-execution.md)"
 - "[Sandbox](../apis/sandbox.md)"
 - "[SandboxConfig](../apis/sandbox-config.md)"
 - "[Task Cancellation](./task-cancellation.md)"
search_terms:
 - tool timeout
 - prevent infinite loops
 - long-running task termination
 - sandbox timeout config
 - how to set tool timeout
 - agent task duration limit
 - hard kill tool call
 - abort unresponsive tool
 - timeoutMs setting
 - resource control for tools
 - SandboxError timeout
stub: false
compiled_at: 2026-04-25T00:19:10.040Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

An Execution Timeout is a core safety and resource management feature within YAAF that automatically terminates a [Tool Execution](./tool-execution.md) if it runs longer than a predefined duration. Its primary purpose is to prevent agents from becoming unresponsive or consuming excessive resources due to buggy tools (e.g., infinite loops), slow external API calls, or malicious code. The timeout acts as a "hard kill" mechanism, ensuring that no single tool call can indefinitely block an agent's progress [Source 1].

## How It Works in YAAF

The Execution Timeout is implemented and enforced by the [Sandbox](../apis/sandbox.md) subsystem, which transparently wraps all tool calls at the AgentRunner level [Source 1].

When an agent invokes a tool, the following process occurs:
1. The [Sandbox](../apis/sandbox.md) initiates the [Tool Execution](./tool-execution.md).
2. A timer is started, set to the configured timeout duration.
3. If the tool completes its execution before the timer expires, the result is returned normally.
4. If the tool's execution time exceeds the configured limit, the [Sandbox](../apis/sandbox.md) aborts the operation and generates a `SandboxViolation` with a `type` of `"timeout"` [Source 1].
5. By default, this violation causes a `SandboxError` to be thrown, which can then be caught and handled by the agent's error handling and [retry logic](./retry-logic.md) [Source 1].

This mechanism is fundamental to building robust and reliable agents that can recover from tool failures without manual intervention.

## Configuration

The timeout duration is configured via the `timeoutMs` property of the [SandboxConfig](../apis/sandbox-config.md) object when instantiating a [Sandbox](../apis/sandbox.md). The value is specified in milliseconds. If not provided, the default timeout is 30,000 milliseconds (30 seconds) [Source 1].

```typescript
import { Sandbox, Agent } from 'yaaf-agent';

// Configure a sandbox with a custom 10-second timeout
const sandbox = new Sandbox({
  timeoutMs: 10_000, // 10 seconds
  // ... other sandbox settings
});

// The agent will use this sandbox for all tool executions
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [/* ... your tools ... */],
  sandbox,
});
```

YAAF also provides helper functions with pre-configured timeouts:
- `strictSandbox(rootDir, timeoutMs = 15_000)`: A stricter configuration with a default timeout of 15 seconds [Source 1].
- `projectSandbox(projectDir, timeoutMs = 30_000)`: A more permissive configuration that uses the framework default of 30 seconds [Source 1].

## See Also

- [Tool Execution](./tool-execution.md)
- [Sandbox](../apis/sandbox.md)
- [SandboxConfig](../apis/sandbox-config.md)
- [Task Cancellation](./task-cancellation.md)

## Sources

[Source 1]: src/sandbox.ts