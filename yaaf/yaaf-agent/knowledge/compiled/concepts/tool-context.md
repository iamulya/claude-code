---
summary: The execution context (`ctx`) provided to a tool's `call` function, offering access to cancellation signals, agent name, and sandbox execution capabilities.
title: Tool Context
entity_type: concept
see_also:
 - concept:Tool Execution
 - concept:Abort Signal
 - concept:Sandbox Runtime
search_terms:
 - tool call context
 - ctx parameter in tools
 - how to cancel a tool
 - get agent name in tool
 - execute shell command from tool
 - tool execution environment
 - yaaf tool context object
 - abort signal for tools
 - sandbox execution in tools
 - tool call parameters
 - accessing agent state from a tool
stub: false
compiled_at: 2026-04-25T00:25:37.439Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
compiled_from_quality: documentation
confidence: 1
---

## What It Is

The Tool Context, commonly referred to as `ctx`, is an object passed as the second argument to a tool's `call` function [Source 1]. It serves as a bridge between the isolated tool logic and the broader agent execution environment. The context provides essential information and capabilities, such as the identity of the calling agent, a mechanism for handling [Task Cancellation](./task-cancellation.md), and access to sandboxed system commands [Source 1]. This allows tools to be more aware of their operational environment and to integrate cleanly with the agent's lifecycle management.

## How It Works in YAAF

When an [Agent](../apis/agent.md) decides to use a tool, the framework's tool executor constructs and passes the `ctx` object to the tool's `call` method. This object contains several key properties that the tool can use during its execution [Source 1].

The `ctx` object has the following properties:

*   `signal`: An `AbortSignal` instance. Tools performing long-running or asynchronous operations should monitor this signal. If the agent's task is cancelled, this signal will be aborted, and the tool should gracefully terminate its work to free up resources and prevent unnecessary processing [Source 1]. This is a core part of YAAF's [Task Cancellation](./task-cancellation.md) pattern.
*   `agentName`: A string containing the name of the agent that invoked the tool. This is useful for logging, metrics, or for tools that might alter their behavior based on which agent is calling them [Source 1].
*   `exec`: An optional function that allows the tool to execute shell commands, such as `ctx.exec?.('ls')`. The availability of this function is dependent on the agent's [Sandbox Runtime](./sandbox-runtime.md) configuration and security policies, providing a mechanism for [Tool Execution Isolation](./tool-execution-isolation.md) [Source 1].

The following example demonstrates how these properties are accessed within a tool's `call` function:

```typescript
async call(input, ctx) {
  // Respect cancellation signals for long-running tasks
  if (ctx.signal.aborted) {
    return { data: '', error: 'Operation cancelled.' };
  }

  // Log which agent is using the tool
  console.log(`Tool called by: ${ctx.agentName}`);

  // Execute a shell command if the sandbox allows it
  if (ctx.exec) {
    const result = await ctx.exec('ls -l');
    // ... process result
  }

  // ... main tool logic
}
```
[Source 1]

## See Also

*   [Abort Signal](./abort-signal.md): A key component of the Tool Context used for managing task lifecycle.
*   [Sandbox Runtime](./sandbox-runtime.md): The subsystem that controls whether a tool has access to the `exec` function.
*   [Tool Execution](./tool-execution.md): The process responsible for creating and passing the `ctx` object to tools.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md