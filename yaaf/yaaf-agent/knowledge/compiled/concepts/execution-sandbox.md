---
summary: A security mechanism that controls the permissions and environment for executing shell commands or other potentially unsafe operations within a tool's context.
title: Execution Sandbox
entity_type: concept
see_also:
 - concept:Tool Execution
 - concept:Tool Execution Isolation
search_terms:
 - secure shell command execution
 - how to run shell commands from a tool
 - tool execution security
 - ctx.exec function
 - sandbox permissions
 - restricting tool capabilities
 - safe code execution
 - agent command line access
 - preventing malicious tool code
 - YAAF security model
 - tool context exec
 - command execution environment
stub: false
compiled_at: 2026-04-25T00:19:04.932Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
compiled_from_quality: documentation
confidence: 1
---

## What It Is

The Execution Sandbox is a security feature in YAAF designed to safely manage and control the execution of potentially dangerous operations, such as shell commands, from within an agent's tools. Its primary purpose is to provide a layer of isolation and permission enforcement, preventing an LLM-driven agent from performing unauthorized or harmful actions on the host system. This is a critical component of the framework's defense-in-depth security model for [Tool Execution](./tool-execution.md).

## How It Works in YAAF

The Execution Sandbox mechanism is exposed to tool developers through the `ctx` (context) object passed to a tool's `call` function [Source 1]. Specifically, the context may contain an `exec` method for running shell commands.

A tool can attempt to execute a command like this:

```typescript
async call(input, ctx) {
  // Execute shell commands (if sandbox allows)
  ctx.exec?.('ls'); 
}
```

The key aspect of this design is that the `ctx.exec` function is conditional. Its availability and behavior are governed by the sandbox's configuration for the running agent [Source 1]. If the sandbox policy for the current execution context does not permit shell commands, the `ctx.exec` method will either be undefined or will throw an error, preventing the command from running. This ensures that tools cannot bypass the security policy and that all shell command execution is explicitly mediated by the sandbox environment [Source 1].

## See Also

*   [Tool Execution](./tool-execution.md)
*   [Tool Execution Isolation](./tool-execution-isolation.md)
*   [Tool Use](./tool-use.md)

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md